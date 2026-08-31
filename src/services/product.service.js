import Product from "../models/product.model.js";
import CategoryOption from "../models/categoryOptions.model.js";
import Review from "../models/review.model.js";
import { AppError } from "../middlewares/error.js";
import PaginationUtil from "../utils/pagination.util.js";
import reviewService from "./review.service.js";
import { processPromoInfo } from "./promo.helper.js";
import ProductViewed from "../models/productviewed.model.js";

class ProductService {
    /**
     * Extract unique variant attributes from a product
     * @param {Object} product - Product document
     * @returns {Object} Object with attribute names as keys and arrays of unique values as values
     */
    /**
     * Convert variant attributes Map to regular objects for all variants in a product
     * @param {Object} product - Product with variants to process
     * @returns {Object} The product with variant attributes properly converted
     */
    _convertVariantAttributes(productObj) {
        if (!productObj.variants || productObj.variants.length === 0) {
            return productObj;
        }

        // Convert each variant's attributes Map to a regular object
        productObj.variants = productObj.variants.map((variant) => {
            if (
                variant.attributes &&
                (variant.attributes instanceof Map ||
                    variant.attributes.size > 0)
            ) {
                // If it's a Map, convert it to a regular object
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
        if (!product.variants || product.variants.length === 0) {
            return {};
        }

        // Initialize an object to store all attribute names and their unique values
        const attributeMap = {};

        // Process each variant
        product.variants.forEach((variant) => {
            if (variant.attributes && variant.attributes.size > 0) {
                // Convert Map to object for easier processing
                const attributes =
                    variant.attributes instanceof Map
                        ? Object.fromEntries(variant.attributes)
                        : variant.attributes;

                // Add each attribute to our map of unique values
                Object.entries(attributes).forEach(([key, value]) => {
                    if (!attributeMap[key]) {
                        attributeMap[key] = new Set();
                    }
                    attributeMap[key].add(value);
                });
            }
        });

        // Convert Sets to arrays for the final result
        const result = {};
        Object.entries(attributeMap).forEach(([key, valueSet]) => {
            result[key] = Array.from(valueSet);
        });

        return result;
    }

    /**
     * Get all products with pagination and filtering
     * @param {Object} query - Query parameters for filtering
     * @returns {Promise<Object>} Products and pagination data
     */
    async getProducts(query = {}) {
        // Extract pagination parameters
        const { page, limit, skip } =
            PaginationUtil.getPaginationOptions(query);

        // Check if rating stats should be included
        const includeRatingStats = query.includeRatingStats === "true";

        // Build filter object - always exclude deleted products
        const filter = { deleted: false };

        // Only show approved products unless admin or the owner of the product
        const isAdmin = query.isAdmin === "true";
        const userId = query.userId;

        if (!isAdmin) {
            // For regular users, only show approved products that are not disabled
            filter.approved = true;
            filter.disabled = false;

            // If we have a user ID, also show their own products regardless of approval status
            if (userId) {
                filter.$or = [
                    { approved: true, disabled: false },
                    { user: userId },
                ];
            }
        }

        // Add category filter if provided
        if (query.category) {
            filter.category = query.category;
        }

        // Add brand filter if provided (supports comma-separated values)
        if (query.brand) {
            // Check if brand contains multiple values separated by commas
            if (query.brand.includes(",")) {
                const brands = query.brand.split(",").map((b) => b.trim());
                filter.brand = {
                    $in: brands.map((brand) => new RegExp(brand, "i")),
                };
            } else {
                filter.brand = { $regex: query.brand, $options: "i" };
            }
        }

        // Add price range filter if provided (for basePrice and variant prices)
        if (query.minPrice || query.maxPrice) {
            // Create a complex query for both basePrice and variant prices
            const priceConditions = [];

            // Base price condition
            const basePriceCondition = {};
            if (query.minPrice)
                basePriceCondition.basePrice = { $gte: Number(query.minPrice) };
            if (query.maxPrice)
                basePriceCondition.basePrice = {
                    ...basePriceCondition.basePrice,
                    $lte: Number(query.maxPrice),
                };

            if (Object.keys(basePriceCondition).length > 0) {
                priceConditions.push(basePriceCondition);
            }

            // Variant price condition
            if (query.minPrice || query.maxPrice) {
                const variantPriceCondition = { "variants.price": {} };
                if (query.minPrice)
                    variantPriceCondition["variants.price"].$gte = Number(
                        query.minPrice,
                    );
                if (query.maxPrice)
                    variantPriceCondition["variants.price"].$lte = Number(
                        query.maxPrice,
                    );

                priceConditions.push(variantPriceCondition);
            }

            if (priceConditions.length > 0) {
                filter.$or = priceConditions;
            }
        }

        // Add search by name filter if provided
        if (query.search) {
            filter.name = { $regex: query.search, $options: "i" };
        }

        // Add seller ID filter if provided
        if (query.sellerId) {
            filter.user = query.sellerId;
        }

        // Add featured filter if provided
        if (query.featured) {
            filter.featured = query.featured === "true";
        }

        // Add promo filter if provided (filter by products with active promotions)
        if (query.promoActive === "true") {
            const now = new Date();
            filter.onSale = true;
            filter.promoPrice = { $ne: null };

            // Complex filter for date ranges to match promoActive virtual field logic
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    // No start date, or start date is in the past
                    { saleStartDate: null },
                    { saleStartDate: { $lte: now } },
                ],
            });
            filter.$and.push({
                $or: [
                    // No end date, or end date is in the future
                    { saleEndDate: null },
                    { saleEndDate: { $gte: now } },
                ],
            });
        }

        // Add variant attribute filters if provided
        if (query.attributes) {
            try {
                // Parse the attributes JSON string
                const attributes = JSON.parse(query.attributes);

                // Build attribute filters for variants
                const attrFilters = [];
                for (const [key, value] of Object.entries(attributes)) {
                    // Create the attribute match condition
                    const attrMatch = {};
                    attrMatch[`variants.attributes.${key}`] = value;
                    attrFilters.push(attrMatch);
                }

                if (attrFilters.length > 0) {
                    filter.$and = filter.$and || [];
                    filter.$and.push({ $or: attrFilters });
                }
            } catch (error) {
                // If there's an error parsing JSON, ignore the attribute filter
                console.error("Error parsing attributes filter:", error);
            }
        }

        // Add in stock filter for variants if provided
        if (query.inStock === "true") {
            filter["variants.inStock"] = true;
            filter["variants.quantity"] = { $gt: 0 };
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

        // Get products with pagination, filtering, and sorting
        const products = await Product.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate({
                path: "user",
                select: "name email +business",
            });

        // Generate pagination metadata
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        // Process products to include additional data
        if (products.length > 0) {
            const processedProducts = products.map((product) => {
                const productObj = product.toObject();

                // Add unique variant attributes
                productObj.variantAttributes =
                    this._extractUniqueVariantAttributes(product);

                // Add seller business name fallback
                productObj.sellerName =
                    product.user?.business?.businessName ||
                    product.user?.name ||
                    "Vendor";

                return productObj;
            });

            // Include detailed rating statistics if requested
            if (includeRatingStats) {
                const productsWithStats = await Promise.all(
                    processedProducts.map(async (productObj) => {
                        try {
                            const ratingStats =
                                await reviewService.getProductRatingStats(
                                    productObj._id,
                                );
                            productObj.ratingStats = ratingStats;
                            return productObj;
                        } catch (error) {
                            console.error(
                                `Error getting rating stats for product ${productObj._id}:`,
                                error,
                            );
                            return productObj;
                        }
                    }),
                );

                return { products: productsWithStats, pagination };
            }

            return { products: processedProducts, pagination };
        }

        return { products, pagination };
    }

    /**
     * Get product by ID
     * @param {string} id - Product ID
     * @param {boolean} includeRatingStats - Whether to include detailed rating statistics
     * @returns {Promise<Object>} Product object with optional rating statistics
     */
    async getProductById(id, includeRatingStats = false, options = {}) {
        const product = await Product.findOne({
            _id: id,
            deleted: false,
        })
            .populate({
                path: "user",
                select: "name email +business",
            })
            .select(
                options?.isAdmin
                    ? "+disabled +disabledAt +disabledBy +disabledReason +approvedBy +approvedAt"
                    : "",
            );

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Convert to object and process variant data
        const productObj = product.toObject();

        // Convert variant attributes Maps to regular objects
        this._convertVariantAttributes(productObj);

        // Add unique variant attributes
        productObj.variantAttributes =
            this._extractUniqueVariantAttributes(product);

        // Add seller business name fallback
        productObj.sellerName =
            product.user?.business?.businessName ||
            product.user?.name ||
            "Vendor";

        // Include detailed rating statistics if requested
        if (includeRatingStats) {
            try {
                const ratingStats =
                    await reviewService.getProductRatingStats(id);
                productObj.ratingStats = ratingStats;
                return productObj;
            } catch (error) {
                // If there's an error getting rating stats, just return the product
                console.error("Error getting rating stats:", error);
                return productObj;
            }
        }

        return productObj;
    }

    /**
     * Create new product
     * @param {Object} productData - Product data
     * @param {string} userId - User ID of the creator
     * @returns {Promise<Object>} New product object
     */
    async createProduct(productData, userId) {
        const normalizedCat = (productData.category || "other").trim().toLowerCase();

        // Ensure category is registered in CategoryOption
        const categoryExists = await CategoryOption.findOne({
            category: normalizedCat,
        });
        if (!categoryExists) {
            await CategoryOption.create({
                category: normalizedCat,
                options: [],
                approved: true,
                user: userId,
            });
        }

        // Add user ID to product data
        const productToCreate = {
            ...productData,
            category: normalizedCat,
            user: userId,
        };

        // Set hasVariants flag if variants are provided
        if (productData.variants && productData.variants.length > 0) {
            productToCreate.hasVariants = true;
        }

        const newProduct = new Product(productToCreate);

        return await newProduct.save();
    }

    /**
     * Update product by ID
     * @param {string} id - Product ID
     * @param {Object} updateData - Data to update
     * @param {string} userId - User ID of the requester
     * @param {string} userRole - User role for authorization
     * @returns {Promise<Object>} Updated product object
     */
    async updateProduct(id, updateData, userId, userRole) {
        // First find the product to check ownership
        const product = await Product.findById(id);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Check if user is the owner or admin
        if (product.user.toString() !== userId && userRole !== "admin") {
            throw new AppError("Not authorized to update this product", 403);
        }

        // Set hasVariants flag if variants are provided
        if (updateData.variants && updateData.variants.length > 0) {
            updateData.hasVariants = true;
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        return updatedProduct;
    }

    /**
     * Delete product by ID (soft delete)
     * @param {string} id - Product ID
     * @param {string} userId - User ID of the requester
     * @param {string} userRole - User role for authorization
     * @returns {Promise<Object>} Deleted product object
     */
    async deleteProduct(id, userId, userRole) {
        // First find the product to check ownership
        const product = await Product.findOne({ _id: id, deleted: false });

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Check if user is the owner or admin
        if (product.user.toString() !== userId && userRole !== "admin") {
            throw new AppError("Not authorized to delete this product", 403);
        }

        // Soft delete the product
        product.deleted = true;
        product.deletedAt = new Date();
        await product.save();

        return product;
    }

    /**
     * Get featured products
     * @param {number} limit - Number of products to return
     * @param {boolean} includeRatingStats - Whether to include detailed rating statistics
     * @returns {Promise<Array>} Array of featured products
     */
    async getFeaturedProducts(limit = 5, includeRatingStats = false) {
        const products = await Product.find({ featured: true, deleted: false })
            .sort({ rating: -1 })
            .limit(limit)
            .populate({
                path: "user",
                select: "name email +business",
            });

        // Process products to include additional data
        if (products.length > 0) {
            const processedProducts = products.map((product) => {
                const productObj = product.toObject();

                // Add unique variant attributes
                productObj.variantAttributes =
                    this._extractUniqueVariantAttributes(product);

                // Add seller business name fallback
                productObj.sellerName =
                    product.user?.business?.businessName ||
                    product.user?.name ||
                    "Vendor";

                return productObj;
            });

            // Include detailed rating statistics if requested
            if (includeRatingStats) {
                const productsWithStats = await Promise.all(
                    processedProducts.map(async (productObj) => {
                        try {
                            const ratingStats =
                                await reviewService.getProductRatingStats(
                                    productObj._id,
                                );
                            productObj.ratingStats = ratingStats;
                            return productObj;
                        } catch (error) {
                            console.error(
                                `Error getting rating stats for product ${productObj._id}:`,
                                error,
                            );
                            return productObj;
                        }
                    }),
                );

                return productsWithStats;
            }

            return processedProducts;
        }

        return products;
    }

    /**
     * Get product statistics
     * @returns {Promise<Object>} Product statistics
     */
    async getProductStats() {
        const stats = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    avgBasePrice: { $avg: "$basePrice" },
                    minBasePrice: { $min: "$basePrice" },
                    maxBasePrice: { $max: "$basePrice" },
                    avgRating: { $avg: "$rating" },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        return stats;
    }

    /**
     * Add variant to product
     * @param {string} productId - Product ID
     * @param {Object} variantData - Variant data to add
     * @param {string} userId - User ID of the requester
     * @param {string} userRole - User role for authorization
     * @returns {Promise<Object>} Updated product with new variant
     */
    async addVariant(productId, variantData, userId, userRole) {
        // First find the product to check ownership
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Check if user is the owner or admin
        if (product.user.toString() !== userId && userRole !== "admin") {
            throw new AppError("Not authorized to update this product", 403);
        }

        // Convert attributes from object to Map if needed
        if (
            variantData.attributes &&
            !(variantData.attributes instanceof Map)
        ) {
            variantData.attributes = new Map(
                Object.entries(variantData.attributes),
            );
        }

        // Add the variant to the product
        product.variants.push(variantData);
        product.hasVariants = true;

        // Save the updated product
        await product.save();

        return product;
    }

    /**
     * Update product variant
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @param {Object} updateData - Data to update
     * @param {string} userId - User ID of the requester
     * @param {string} userRole - User role for authorization
     * @returns {Promise<Object>} Updated product with modified variant
     */
    async updateVariant(productId, variantId, updateData, userId, userRole) {
        // First find the product to check ownership
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Check if user is the owner or admin
        if (product.user.toString() !== userId && userRole !== "admin") {
            throw new AppError("Not authorized to update this product", 403);
        }

        // Find the variant in the product
        const variantIndex = product.variants.findIndex(
            (variant) => variant._id.toString() === variantId,
        );

        if (variantIndex === -1) {
            throw new AppError("Variant not found", 404);
        }

        // Convert attributes from object to Map if needed
        if (updateData.attributes && !(updateData.attributes instanceof Map)) {
            updateData.attributes = new Map(
                Object.entries(updateData.attributes),
            );
        }

        // Update the variant properties
        Object.keys(updateData).forEach((key) => {
            product.variants[variantIndex][key] = updateData[key];
        });

        // Save the updated product
        await product.save();

        return product;
    }

    /**
     * Delete product variant
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID to delete
     * @param {string} userId - User ID of the requester
     * @param {string} userRole - User role for authorization
     * @returns {Promise<Object>} Updated product without the deleted variant
     */
    async deleteVariant(productId, variantId, userId, userRole) {
        // First find the product to check ownership
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Check if user is the owner or admin
        if (product.user.toString() !== userId && userRole !== "admin") {
            throw new AppError("Not authorized to update this product", 403);
        }

        // Find the variant in the product
        const variantIndex = product.variants.findIndex(
            (variant) => variant._id.toString() === variantId,
        );

        if (variantIndex === -1) {
            throw new AppError("Variant not found", 404);
        }

        // Remove the variant
        product.variants.splice(variantIndex, 1);

        // Update hasVariants flag if no variants left
        if (product.variants.length === 0) {
            product.hasVariants = false;
        }

        // Save the updated product
        await product.save();

        return product;
    }

    /**
     * Update product variant stock
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @param {number} quantity - New quantity
     * @returns {Promise<Object>} Updated product with modified variant stock
     */
    async updateVariantStock(productId, variantId, quantity) {
        // Find the product
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Find the variant in the product
        const variantIndex = product.variants.findIndex(
            (variant) => variant._id.toString() === variantId,
        );

        if (variantIndex === -1) {
            throw new AppError("Variant not found", 404);
        }

        // Update the quantity
        product.variants[variantIndex].quantity = quantity;
        product.variants[variantIndex].inStock = quantity > 0;

        // Save the updated product
        await product.save();

        return product;
    }

    /**
     * Get product variants
     * @param {string} productId - Product ID
     * @returns {Promise<Array>} Array of product variants
     */
    async getProductVariants(productId) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        return product.variants || [];
    }

    /**
     * Get product variant by ID
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @returns {Promise<Object>} Product variant
     */
    async getVariantById(productId, variantId) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        const variant = product.variants.find(
            (variant) => variant._id.toString() === variantId,
        );

        if (!variant) {
            throw new AppError("Variant not found", 404);
        }

        return variant;
    }

    async getProductOrVariantById(productId, variantId) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        const variant = product.variants.find(
            (variant) => variant._id.toString() === variantId,
        );

        if (!variant) {
            return product;
        }

        return {
            ...variant.toObject(),
            name: product.name,
            description: product.description,
            user: product.user,
            basePrice: variant.price,
        };
    }

    /**
     * Permanently delete a product (admin only)
     * @param {string} id - Product ID
     * @returns {Promise<Object>} Deleted product object
     */
    async permanentlyDeleteProduct(id) {
        const product = await Product.findById(id);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Permanently delete the product
        await Product.findByIdAndDelete(id);

        return product;
    }

    /**
     * Restore a soft-deleted product
     * @param {string} id - Product ID
     * @returns {Promise<Object>} Restored product object
     */
    async restoreProduct(id) {
        const product = await Product.findById(id);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        if (!product.deleted) {
            throw new AppError("Product is not deleted", 400);
        }

        // Restore the product
        product.deleted = false;
        product.deletedAt = null;
        await product.save();

        return product;
    }
    /**
     * Approve a product (admin only)
     * @param {string} productId - Product ID
     * @param {string} adminId - Admin user ID
     * @returns {Promise<Object>} Approved product
     */
    async approveProduct(productId, adminId) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Update approval fields
        product.approved = true;
        product.approvedAt = new Date();
        product.approvedBy = adminId;

        await product.save();
        return product;
    }

    /**
     * Reject product approval (admin only)
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Rejected product
     */
    async rejectProductApproval(productId) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Update approval fields
        product.approved = false;
        product.approvedAt = null;
        product.approvedBy = null;

        await product.save();
        return product;
    }

    /**
     * Disable a product (admin only)
     * @param {string} productId - Product ID
     * @param {string} adminId - Admin user ID
     * @param {string} reason - Reason for disabling
     * @returns {Promise<Object>} Disabled product
     */
    async disableProduct(productId, adminId, reason) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Update disabled fields
        product.disabled = true;
        product.disabledAt = new Date();
        product.disabledBy = adminId;
        product.disabledReason = reason || "No reason provided";
        product.status = "disabled";

        await product.save();
        return product;
    }

    /**
     * Enable a previously disabled product (admin only)
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Enabled product
     */
    async enableProduct(productId) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Reset disabled fields
        product.disabled = false;
        product.disabledAt = null;
        product.disabledBy = null;
        product.disabledReason = null;
        product.status = "approved";

        await product.save();
        return product;
    }

    /**
     * Get products pending approval (admin only)
     * @param {Object} query - Query parameters for filtering and pagination
     * @returns {Promise<Object>} Products and pagination data
     */
    async getProductsPendingApproval(query = {}) {
        // Extract pagination parameters
        const { page, limit, skip } =
            PaginationUtil.getPaginationOptions(query);

        // Build filter object for pending approval products
        const filter = { approved: false, deleted: false };

        // Add category filter if provided
        if (query.category) {
            filter.category = query.category;
        }

        // Count total matching documents
        const total = await Product.countDocuments(filter);

        // Get products with pagination, filtering, and sorting
        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "user",
                select: "name email",
            });

        // Generate pagination metadata
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        return { products, pagination };
    }

    /**
     * Get disabled products (admin only)
     * @param {Object} query - Query parameters for filtering and pagination
     * @returns {Promise<Object>} Products and pagination data
     */
    async getDisabledProducts(query = {}) {
        // Extract pagination parameters
        const { page, limit, skip } =
            PaginationUtil.getPaginationOptions(query);

        // Build filter object for disabled products
        const filter = { disabled: true, deleted: false };

        // Add category filter if provided
        if (query.category) {
            filter.category = query.category;
        }

        // Count total matching documents
        const total = await Product.countDocuments(filter);

        // Get products with pagination, filtering, and sorting
        const products = await Product.find(filter)
            .sort({ disabledAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate([
                {
                    path: "user",
                    select: "name email",
                },
                {
                    path: "disabledBy",
                    select: "name email",
                },
            ]);

        // Generate pagination metadata
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        return { products, pagination };
    }

    /**
     * Get unique brands and categories with optional filtering
     * @param {Object} filters - Filtering options
     * @param {string} [filters.category] - Filter brands by category
     * @param {string} [filters.search] - Search term to filter brands and categories
     * @param {string} [filters.sort] - Sort order (asc/desc)
     * @returns {Promise<Object>} Object containing arrays of unique brands and categories
     */
    async getBrandsAndCategories(filters = {}) {
        try {
            const baseQuery = { deleted: false };
            const brandQuery = { ...baseQuery };
            const categoryQuery = { ...baseQuery };

            // Apply category filter to brand query if provided
            if (filters.category) {
                brandQuery.category = filters.category;
            }

            // Apply search filter if provided
            if (filters.search) {
                const searchRegex = new RegExp(filters.search, "i");
                brandQuery.$or = [
                    { name: { $regex: searchRegex } },
                    { description: { $regex: searchRegex } },
                ];
                categoryQuery.$or = [
                    { name: { $regex: searchRegex } },
                    { description: { $regex: searchRegex } },
                ];
            }

            const [brands, categories] = await Promise.all([
                Product.distinct("brand", brandQuery),
                Product.distinct("category", categoryQuery),
            ]);

            // Filter out case-insensitive duplicates
            const uniqueBrands = this.filterCaseInsensitiveDuplicates(brands);
            const uniqueCategories =
                this.filterCaseInsensitiveDuplicates(categories);

            // Sort results
            const sortOrder = filters.sort === "desc" ? -1 : 1;
            const sortFn = (a, b) => {
                if (a < b) return -1 * sortOrder;
                if (a > b) return 1 * sortOrder;
                return 0;
            };

            return {
                brands: uniqueBrands.filter(Boolean).sort(sortFn),
                categories: uniqueCategories.filter(Boolean).sort(sortFn),
            };
        } catch (error) {
            console.error("Error fetching brands and categories:", error);
            return { brands: [], categories: [] };
        }
    }

    /**
     * Filter out duplicate strings that differ only by case, preferring lowercase versions
     * @param {Array<string>} items - Array of strings to filter
     * @returns {Array<string>} - Array with case-insensitive duplicates removed, preferring lowercase versions
     */
    filterCaseInsensitiveDuplicates(items) {
        if (!Array.isArray(items)) return [];

        // First, group items by their lowercase version
        const groups = new Map();

        for (const item of items) {
            if (!item) continue;

            const itemLower = String(item).toLowerCase();
            if (!groups.has(itemLower)) {
                groups.set(itemLower, []);
            }
            groups.get(itemLower).push(item);
        }

        // Then for each group, select the lowercase version if it exists, otherwise take the first one
        return Array.from(groups.entries())
            .map(([lowercaseKey, variants]) => {
                // Find exact lowercase match if it exists
                const lowercaseVariant = variants.find(
                    (v) => v === lowercaseKey,
                );
                return lowercaseVariant || variants[0];
            })
            .filter(Boolean);
    }

    async hasViewedProduct(userId, productId) {
        try {
            const productViewed = await ProductViewed.findOne({
                user: userId,
                product: productId,
            });
            return productViewed;
        } catch (error) {
            console.error("Error fetching product viewed:", error);
            return null;
        }
    }

    async addProductViewed(userId, productId) {
        const product = await this.getProductById(productId);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        const hasViewedProduct = await this.hasViewedProduct(userId, productId);

        if (hasViewedProduct) {
            hasViewedProduct.count += 1;
            hasViewedProduct.viewedAt = new Date();
            await hasViewedProduct.save();
            return hasViewedProduct;
        }

        const productViewed = await ProductViewed.create({
            user: userId,
            product: productId,
        });
        return productViewed;
    }

    async getProductViewed(userId, limit = 10) {
        try {
            const productViewed = await ProductViewed.find({
                user: userId,
            })
                .populate({
                    path: "product",
                })
                .sort({ viewedAt: -1 })
                .limit(limit);
            return productViewed;
        } catch (error) {
            console.error("Error fetching product viewed:", error);
            return [];
        }
    }
}

export default new ProductService();
