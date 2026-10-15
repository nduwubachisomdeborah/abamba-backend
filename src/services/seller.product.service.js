import Product from "../models/product.model.js";
import CategoryOption from "../models/categoryOptions.model.js";
import PlatformSettings from "../models/platformSettings.model.js";
import { AppError } from "../middlewares/error.js";
import PaginationUtil from "../utils/pagination.util.js";
import { processPromoInfo } from "./promo.helper.js";

class SellerProductService {
    /**
     * Convert variant attributes Map to regular objects for all variants in a product
     * @param {Object} productObj - Product object with variants to process
     * @returns {Object} The product with variant attributes properly converted
     */
    _convertVariantAttributes(productObj) {
        if (!productObj || !productObj.variants || productObj.variants.length === 0) {
            return productObj;
        }

        productObj.variants = productObj.variants.map((variant) => {
            if (
                variant.attributes &&
                (variant.attributes instanceof Map ||
                    variant.attributes.size > 0)
            ) {
                variant.attributes =
                    variant.attributes instanceof Map
                        ? Object.fromEntries(variant.attributes)
                        : variant.attributes;
            }
            return variant;
        });

        return productObj;
    }

    /**
     * Extract unique variant attributes from a product
     * @param {Object} product - Product document
     * @returns {Object} Object with attribute names as keys and arrays of unique values as values
     */
    _extractUniqueVariantAttributes(product) {
        if (!product || !product.variants || product.variants.length === 0) {
            return {};
        }

        const attributeMap = {};

        product.variants.forEach((variant) => {
            if (variant.attributes) {
                const attributes =
                    variant.attributes instanceof Map
                        ? Object.fromEntries(variant.attributes)
                        : variant.attributes;

                if (attributes && typeof attributes === "object") {
                    Object.entries(attributes).forEach(([key, value]) => {
                        if (!attributeMap[key]) {
                            attributeMap[key] = [];
                        }
                        if (!attributeMap[key].includes(value)) {
                            attributeMap[key].push(value);
                        }
                    });
                }
            }
        });

        return attributeMap;
    }

    /**
     * Get all products for a specific seller with pagination
     * @param {string} sellerId - ID of the seller
     * @param {Object} query - Query parameters for filtering and pagination
     * @returns {Promise<Object>} Products and pagination data
     */
    async getSellerProducts(sellerId, query = {}) {
        // Extract pagination parameters
        const { page, limit, skip } =
            PaginationUtil.getPaginationOptions(query);

        // Build filter object - always filter by seller and exclude deleted products
        const filter = { user: sellerId, deleted: false };

        // Add category filter if provided (flexible with spaces/underscores and case-insensitive)
        if (query.category) {
            const cleanCategory = String(query.category).replace(/_/g, " ").trim();
            const escapedCategory = cleanCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.category = { $regex: new RegExp(`^${escapedCategory}$`, "i") };
        }

        // Add brand filter if provided (matches brand attribute, product name, or tags)
        if (query.brand) {
            const brands = String(query.brand)
                .split(",")
                .map((b) => b.trim())
                .filter(Boolean);

            if (brands.length > 0) {
                const brandConditions = brands.flatMap((brandStr) => {
                    const escaped = brandStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const brandRegex = new RegExp(escaped, "i");
                    return [
                        { brand: brandRegex },
                        { name: brandRegex },
                        { tags: brandRegex },
                    ];
                });

                if (filter.$or) {
                    filter.$and = filter.$and || [];
                    filter.$and.push({ $or: brandConditions });
                } else {
                    filter.$or = brandConditions;
                }
            }
        }

        // Add dynamic keyword / search filter across name, brand, description, tags, category, and sku
        const searchTerm = (query.search || query.keyword || query.q || "").trim();
        if (searchTerm) {
            const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const searchRegex = new RegExp(escaped, "i");
            const searchConditions = [
                { name: searchRegex },
                { brand: searchRegex },
                { description: searchRegex },
                { tags: searchRegex },
                { category: searchRegex },
                { sku: searchRegex },
                { "variants.sku": searchRegex },
            ];

            if (filter.$or) {
                filter.$and = filter.$and || [];
                filter.$and.push({ $or: searchConditions });
            } else {
                filter.$or = searchConditions;
            }
        }

        // Add featured filter if provided
        if (query.featured) {
            filter.featured = query.featured === "true";
        }

        // Add sale filter if provided
        if (query.onSale) {
            filter.onSale = query.onSale === "true";
        }

        // Build sort object
        let sort = {};
        if (query.sort) {
            const sortFields = query.sort.split(",");
            sortFields.forEach((field) => {
                if (field.startsWith("-")) {
                    sort[field.substring(1)] = -1;
                } else {
                    sort[field] = 1;
                }
            });
        } else {
            // Default sort by createdAt in descending order
            sort = { createdAt: -1 };
        }

        // Count total matching documents
        const total = await Product.countDocuments(filter);

        // Execute the query with pagination
        const products = await Product.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Fetch platform settings to check if global bonus week is active
        const platformSettings = await PlatformSettings.getInstance();
        const isBonusActive = Boolean(
            platformSettings?.systemPreferences?.bonusWeekEnabled ??
            platformSettings?.isBonusEventActive
        );

        // Process products with promo and bonus pricing
        const processedProducts = products.map((prod) => {
            let productObj = prod.toObject ? prod.toObject() : { ...prod };
            this._convertVariantAttributes(productObj);
            productObj = processPromoInfo(productObj, isBonusActive);
            return productObj;
        });

        // Generate pagination info
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        return { products: processedProducts, pagination };
    }

    /**
     * Create a new product for a seller
     * @param {Object} productData - Product data
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} New product
     */
    async createProduct(productData, sellerId) {
        // Set the user field to the seller ID
        productData.user = sellerId;

        // Ensure category is trimmed, lowercased, and registered in CategoryOption
        if (productData.category) {
            const normalizedCat = productData.category.trim().toLowerCase();
            productData.category = normalizedCat;

            // Ensure category exists in CategoryOption or auto-register it
            const categoryExists = await CategoryOption.findOne({
                category: normalizedCat,
            });

            if (!categoryExists) {
                await CategoryOption.create({
                    category: normalizedCat,
                    options: [],
                    approved: true,
                    user: sellerId,
                });
            }
        }

        // Support both basePrice and price seamlessly
        const effectivePrice =
            productData.basePrice !== undefined && productData.basePrice !== null && productData.basePrice !== ""
                ? productData.basePrice
                : productData.price;
        productData.basePrice = Number(effectivePrice) || 0;
        if (productData.basePrice < 0) {
            throw new AppError("Base price must be a positive number", 400);
        }

        // Ensure weight defaults gracefully
        productData.weight =
            productData.weight !== undefined && productData.weight !== null && productData.weight !== ""
                ? Number(productData.weight)
                : 0;

        // Enforce max 50 for stock and bounds for lowStockAlert
        if (productData.quantity !== undefined) {
            productData.quantity = Math.min(Math.max(Number(productData.quantity) || 1, 0), 50);
        } else {
            productData.quantity = 1;
        }

        if (productData.lowStockAlert !== undefined && productData.lowStockAlert !== null) {
            productData.lowStockAlert = Math.min(Math.max(Number(productData.lowStockAlert) || 2, 1), 2);
        } else {
            productData.lowStockAlert = 2;
        }

        // Normalize images (support array of objects, array of string URLs, or single image field)
        if (Array.isArray(productData.images) && productData.images.length > 0) {
            productData.images = productData.images
                .map((img) => {
                    if (typeof img === "string") {
                        return { url: img, altText: productData.name || "Product image" };
                    }
                    if (img && typeof img === "object") {
                        return {
                            url: img.url || img.imageUrl || "",
                            thumbnail: img.thumbnail || "",
                            medium: img.medium || "",
                            altText: img.altText || productData.name || "Product image",
                        };
                    }
                    return null;
                })
                .filter((img) => Boolean(img && img.url));
        } else if (productData.image || productData.thumbnail) {
            const singleImg = productData.image || productData.thumbnail;
            productData.images = [{ url: singleImg, altText: productData.name || "Product image" }];
        }

        // Enforce variant quantities and weight if present
        if (Array.isArray(productData.variants)) {
            productData.variants = productData.variants.map((v) => ({
                ...v,
                weight: v.weight !== undefined && v.weight !== null ? Number(v.weight) : 0,
                price: Number(v.price) || productData.basePrice,
                quantity: v.quantity !== undefined ? Math.min(Math.max(Number(v.quantity) || 0, 0), 50) : 0,
            }));
        }

        // Handle promotional pricing
        if (
            productData.promoPrice !== undefined &&
            productData.promoPrice !== null &&
            productData.promoPrice !== ""
        ) {
            productData.promoPrice = Number(productData.promoPrice);
            if (productData.promoPrice <= 0) {
                throw new AppError(
                    "Promotional price must be a positive number",
                    400
                );
            }

            if (productData.promoPrice >= productData.basePrice) {
                throw new AppError(
                    "Promotional price must be less than the base price",
                    400
                );
            }

            productData.onSale = true;
        }

        // Fetch platform settings to check if global bonus week is active
        const platformSettings = await PlatformSettings.getInstance();
        const isBonusActive = Boolean(
            platformSettings?.systemPreferences?.bonusWeekEnabled ??
            platformSettings?.isBonusEventActive
        );

        // Handle bonus pricing gracefully (allow products to be created with or without bonusPrice)
        if (
            productData.bonusPrice !== undefined &&
            productData.bonusPrice !== null &&
            productData.bonusPrice !== ""
        ) {
            const parsedBonus = Number(productData.bonusPrice);
            if (!isNaN(parsedBonus) && parsedBonus > 0) {
                if (parsedBonus >= productData.basePrice) {
                    throw new AppError(
                        "Bonus price must be less than the product base price",
                        400
                    );
                }
                productData.bonusPrice = parsedBonus;
            } else {
                productData.bonusPrice = null;
            }

            // Also check variants bonus price if provided
            if (Array.isArray(productData.variants) && productData.variants.length > 0) {
                for (const v of productData.variants) {
                    if (
                        v.bonusPrice !== undefined &&
                        v.bonusPrice !== null &&
                        v.bonusPrice !== ""
                    ) {
                        const vBonus = Number(v.bonusPrice);
                        if (!isNaN(vBonus) && vBonus > 0 && vBonus < v.price) {
                            v.bonusPrice = vBonus;
                        } else {
                            v.bonusPrice = null;
                        }
                    } else {
                        v.bonusPrice = null;
                    }
                }
            }
        } else {
            productData.bonusPrice = null;
        }

        // Create the product
        const product = await Product.create(productData);
        let productObj = product.toObject ? product.toObject() : { ...product };
        this._convertVariantAttributes(productObj);
        productObj = processPromoInfo(productObj, isBonusActive);

        return productObj;
    }

    /**
     * Get a seller's product
     * @param {string} productId - ID of the product to get
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Product
     */
    async getProduct(productId, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to view it",
                404
            );
        }

        const platformSettings = await PlatformSettings.getInstance();
        const isBonusActive = Boolean(
            platformSettings?.systemPreferences?.bonusWeekEnabled ??
            platformSettings?.isBonusEventActive
        );

        let productObj = product.toObject ? product.toObject() : { ...product };
        this._convertVariantAttributes(productObj);
        productObj.variantAttributes = this._extractUniqueVariantAttributes(product);
        productObj = processPromoInfo(productObj, isBonusActive);

        return productObj;
    }

    /**
     * Update a seller's product
     * @param {string} productId - ID of the product to update
     * @param {Object} updateData - Updated product data
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Updated product
     */
    async updateProduct(productId, updateData, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to update it",
                404
            );
        }

        // Ensure category is trimmed, lowercased, and registered in CategoryOption (if category is being updated)
        if (updateData.category) {
            const normalizedCat = updateData.category.trim().toLowerCase();
            updateData.category = normalizedCat;

            const categoryExists = await CategoryOption.findOne({
                category: normalizedCat,
            });

            if (!categoryExists) {
                await CategoryOption.create({
                    category: normalizedCat,
                    options: [],
                    approved: true,
                    user: sellerId,
                });
            }
        }

        // Support both price and basePrice seamlessly
        if (updateData.price !== undefined && updateData.basePrice === undefined) {
            updateData.basePrice = Number(updateData.price);
        } else if (updateData.basePrice !== undefined) {
            updateData.basePrice = Number(updateData.basePrice);
        }

        if (updateData.weight !== undefined) {
            updateData.weight = Number(updateData.weight) || 0;
        }

        // Handle promotional pricing
        if (updateData.promoPrice !== undefined) {
            if (updateData.promoPrice === null || updateData.promoPrice === "") {
                // Removing promo price
                updateData.promoPrice = null;
                updateData.onSale = false;
                updateData.saleStartDate = null;
                updateData.saleEndDate = null;
            } else {
                updateData.promoPrice = Number(updateData.promoPrice);
                if (updateData.promoPrice <= 0) {
                    throw new AppError(
                        "Promotional price must be a positive number",
                        400
                    );
                }

                const basePrice = updateData.basePrice !== undefined ? updateData.basePrice : product.basePrice;
                if (updateData.promoPrice >= basePrice) {
                    throw new AppError(
                        "Promotional price must be less than the base price",
                        400
                    );
                }

                updateData.onSale = true;
            }
        }

        // Handle bonus pricing
        if (updateData.bonusPrice !== undefined) {
            if (
                updateData.bonusPrice === null ||
                updateData.bonusPrice === "" ||
                Number(updateData.bonusPrice) <= 0
            ) {
                updateData.bonusPrice = null;
            } else {
                const parsedBonus = Number(updateData.bonusPrice);
                const currentBase = updateData.basePrice !== undefined ? updateData.basePrice : product.basePrice;
                if (parsedBonus >= currentBase) {
                    throw new AppError(
                        "Bonus price must be less than the product base price",
                        400
                    );
                }
                updateData.bonusPrice = parsedBonus;
            }
        }

        // Enforce max 50 for stock and bounds for lowStockAlert
        if (updateData.quantity !== undefined) {
            updateData.quantity = Math.min(Math.max(Number(updateData.quantity) || 0, 0), 50);
        }
        if (updateData.lowStockAlert !== undefined && updateData.lowStockAlert !== null) {
            updateData.lowStockAlert = Math.min(Math.max(Number(updateData.lowStockAlert) || 2, 1), 2);
        }
        if (Array.isArray(updateData.variants)) {
            updateData.variants = updateData.variants.map((v) => ({
                ...v,
                weight: v.weight !== undefined && v.weight !== null ? Number(v.weight) : 0,
                price: Number(v.price) || (updateData.basePrice || product.basePrice),
                quantity: v.quantity !== undefined ? Math.min(Math.max(Number(v.quantity) || 0, 0), 50) : 0,
            }));
        }

        // Normalize images if provided
        if (Array.isArray(updateData.images)) {
            updateData.images = updateData.images
                .map((img) => {
                    if (typeof img === "string") {
                        return { url: img, altText: updateData.name || product.name || "Product image" };
                    }
                    if (img && typeof img === "object") {
                        return {
                            url: img.url || img.imageUrl || "",
                            thumbnail: img.thumbnail || "",
                            medium: img.medium || "",
                            altText: img.altText || updateData.name || product.name || "Product image",
                        };
                    }
                    return null;
                })
                .filter((img) => Boolean(img && img.url));
        }

        // Remove immutable/system fields from updateData
        delete updateData._id;
        delete updateData.id;
        delete updateData.user;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.__v;

        // Update the product
        Object.keys(updateData).forEach((key) => {
            product[key] = updateData[key];
        });

        // Preserve approved status for existing products; only reset if product was previously rejected
        if (product.status === "rejected") {
            product.status = "pending";
            product.rejectedReason = null;
        }

        await product.save();

        const platformSettings = await PlatformSettings.getInstance();
        const isBonusActive = Boolean(
            platformSettings?.systemPreferences?.bonusWeekEnabled ??
            platformSettings?.isBonusEventActive
        );

        let productObj = product.toObject ? product.toObject() : { ...product };
        this._convertVariantAttributes(productObj);
        productObj.variantAttributes = this._extractUniqueVariantAttributes(product);
        productObj = processPromoInfo(productObj, isBonusActive);

        return productObj;
    }

    /**
     * Delete a seller's product (soft delete)
     * @param {string} productId - ID of the product to delete
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<void>}
     */
    async deleteProduct(productId, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to delete it",
                404
            );
        }

        // Soft delete the product
        product.deleted = true;
        product.deletedAt = new Date();
        await product.save();
    }

    /**
     * Set product promotional pricing
     * @param {string} productId - ID of the product
     * @param {Object} promoData - Promotional data
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Updated product
     */
    async setProductPromotion(productId, promoData, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to update it",
                404
            );
        }

        const { promoPrice, saleStartDate, saleEndDate } = promoData;

        // Validate promotional price
        if (promoPrice <= 0) {
            throw new AppError(
                "Promotional price must be a positive number",
                400
            );
        }

        if (promoPrice >= product.basePrice) {
            throw new AppError(
                "Promotional price must be less than the base price",
                400
            );
        }

        // Update promotional fields
        product.promoPrice = promoPrice;
        product.onSale = true;

        if (saleStartDate) {
            product.saleStartDate = new Date(saleStartDate);
        } else {
            product.saleStartDate = new Date(); // Default to now
        }

        if (saleEndDate) {
            product.saleEndDate = new Date(saleEndDate);
        }

        await product.save();
        return product;
    }

    /**
     * Remove product promotional pricing
     * @param {string} productId - ID of the product
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Updated product
     */
    async removeProductPromotion(productId, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to update it",
                404
            );
        }

        // Remove promotional fields
        product.promoPrice = null;
        product.onSale = false;
        product.saleStartDate = null;
        product.saleEndDate = null;

        await product.save();
        return product;
    }

    /**
     * Add a variant to a seller's product with optional promotional pricing
     * @param {string} productId - ID of the product
     * @param {Object} variantData - Variant data
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Updated product
     */
    async addVariant(productId, variantData, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to update it",
                404
            );
        }

        // Handle promotional pricing for variant
        if (
            variantData.promoPrice !== undefined &&
            variantData.promoPrice !== null
        ) {
            if (variantData.promoPrice <= 0) {
                throw new AppError(
                    "Variant promotional price must be a positive number",
                    400
                );
            }

            if (variantData.promoPrice >= variantData.price) {
                throw new AppError(
                    "Variant promotional price must be less than the regular price",
                    400
                );
            }
        }

        if (variantData.quantity !== undefined) {
            variantData.quantity = Math.min(Math.max(Number(variantData.quantity) || 0, 0), 50);
        }

        // Add the variant
        product.variants.push(variantData);
        await product.save();

        // Return the newly added variant
        const newVariant = product.variants[product.variants.length - 1];
        return { product, variant: newVariant };
    }

    /**
     * Update a variant for a seller's product
     * @param {string} productId - ID of the product
     * @param {string} variantId - ID of the variant
     * @param {Object} updateData - Updated variant data
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Updated product
     */
    async updateVariant(productId, variantId, updateData, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to update it",
                404
            );
        }

        // Find the variant
        const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === variantId
        );

        if (variantIndex === -1) {
            throw new AppError("Variant not found", 404);
        }

        // Handle promotional pricing for variant
        if (updateData.promoPrice !== undefined) {
            if (updateData.promoPrice === null || updateData.promoPrice === 0) {
                // Removing promo price
                updateData.promoPrice = null;
            } else {
                // Adding or updating promo price
                if (updateData.promoPrice <= 0) {
                    throw new AppError(
                        "Variant promotional price must be a positive number",
                        400
                    );
                }

                const variantPrice =
                    updateData.price || product.variants[variantIndex].price;
                if (updateData.promoPrice >= variantPrice) {
                    throw new AppError(
                        "Variant promotional price must be less than the regular price",
                        400
                    );
                }
            }
        }

        if (updateData.quantity !== undefined) {
            updateData.quantity = Math.min(Math.max(Number(updateData.quantity) || 0, 0), 50);
        }

        // Update the variant
        Object.keys(updateData).forEach((key) => {
            product.variants[variantIndex][key] = updateData[key];
        });

        await product.save();
        return { product, variant: product.variants[variantIndex] };
    }

    /**
     * Delete a variant from a seller's product
     * @param {string} productId - ID of the product
     * @param {string} variantId - ID of the variant
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Updated product
     */
    async deleteVariant(productId, variantId, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to update it",
                404
            );
        }

        // Find the variant
        const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === variantId
        );

        if (variantIndex === -1) {
            throw new AppError("Variant not found", 404);
        }

        // Remove the variant
        product.variants.splice(variantIndex, 1);
        await product.save();

        return product;
    }

    /**
     * Set variant promotional pricing
     * @param {string} productId - ID of the product
     * @param {string} variantId - ID of the variant
     * @param {Object} promoData - Promotional data
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Updated product and variant
     */
    async setVariantPromotion(productId, variantId, promoData, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to update it",
                404
            );
        }

        // Find the variant
        const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === variantId
        );

        if (variantIndex === -1) {
            throw new AppError("Variant not found", 404);
        }

        const { promoPrice } = promoData;

        // Validate promotional price
        if (promoPrice <= 0) {
            throw new AppError(
                "Promotional price must be a positive number",
                400
            );
        }

        if (promoPrice >= product.variants[variantIndex].price) {
            throw new AppError(
                "Promotional price must be less than the regular price",
                400
            );
        }

        // Update promotional fields
        product.variants[variantIndex].promoPrice = promoPrice;

        await product.save();
        return { product, variant: product.variants[variantIndex] };
    }

    /**
     * Remove variant promotional pricing
     * @param {string} productId - ID of the product
     * @param {string} variantId - ID of the variant
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Updated product and variant
     */
    async removeVariantPromotion(productId, variantId, sellerId) {
        // Find the product by ID and seller ID
        const product = await Product.findOne({
            _id: productId,
            user: sellerId,
            deleted: false,
        });

        if (!product) {
            throw new AppError(
                "Product not found or you don't have permission to update it",
                404
            );
        }

        // Find the variant
        const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === variantId
        );

        if (variantIndex === -1) {
            throw new AppError("Variant not found", 404);
        }

        // Remove promotional fields
        product.variants[variantIndex].promoPrice = null;

        await product.save();
        return { product, variant: product.variants[variantIndex] };
    }

    /**
     * Get seller dashboard product statistics
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Product statistics
     */
    async getSellerProductStats(sellerId) {
        const stats = await Product.aggregate([
            { $match: { user: sellerId, deleted: false } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    featuredProducts: {
                        $sum: { $cond: [{ $eq: ["$featured", true] }, 1, 0] },
                    },
                    onSaleProducts: {
                        $sum: { $cond: [{ $eq: ["$onSale", true] }, 1, 0] },
                    },
                    productsByCategory: {
                        $push: {
                            category: "$category",
                            name: "$name",
                            id: "$_id",
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalProducts: 1,
                    featuredProducts: 1,
                    onSaleProducts: 1,
                    productsByCategory: 1,
                },
            },
        ]);

        // Process category data
        const categoryCounts = {};
        if (stats.length > 0 && stats[0].productsByCategory) {
            stats[0].productsByCategory.forEach((product) => {
                if (!categoryCounts[product.category]) {
                    categoryCounts[product.category] = 0;
                }
                categoryCounts[product.category]++;
            });

            // Replace the full product list with just the counts
            stats[0].productsByCategory = Object.entries(categoryCounts).map(
                ([category, count]) => ({
                    category,
                    count,
                })
            );
        }

        return stats.length > 0
            ? stats[0]
            : {
                  totalProducts: 0,
                  featuredProducts: 0,
                  onSaleProducts: 0,
                  productsByCategory: [],
              };
    }
}

export default new SellerProductService();
