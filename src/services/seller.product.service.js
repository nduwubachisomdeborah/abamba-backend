import Product from "../models/product.model.js";
import CategoryOption from "../models/categoryOptions.model.js";
import { AppError } from "../middlewares/error.js";
import PaginationUtil from "../utils/pagination.util.js";

class SellerProductService {
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

        // Add category filter if provided
        if (query.category) {
            filter.category = query.category;
        }

        // Add search by name filter if provided
        if (query.search) {
            filter.name = { $regex: query.search, $options: "i" };
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

        // Generate pagination info
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        return { products, pagination };
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

        // Validate that the category exists in CategoryOption
        if (productData.category) {
            const categoryExists = await CategoryOption.findOne({
                category: productData.category?.toLowerCase(),
            });

            if (!categoryExists) {
                throw new AppError(
                    `Category '${productData.category}' is not a valid category. Please check available categories.`,
                    400
                );
            }
        }

        // Handle promotional pricing
        if (
            productData.promoPrice !== undefined &&
            productData.promoPrice !== null
        ) {
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

        // Create the product
        const product = await Product.create(productData);
        return product;
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

        return product;
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

        // Validate that the category exists in CategoryOption (if category is being updated)
        if (updateData.category) {
            const categoryExists = await CategoryOption.findOne({
                category: updateData.category,
            });

            if (!categoryExists) {
                throw new AppError(
                    `Category '${updateData.category}' is not a valid category. Please check available categories.`,
                    400
                );
            }
        }

        // Handle promotional pricing
        if (updateData.promoPrice !== undefined) {
            if (updateData.promoPrice === null) {
                // Removing promo price
                updateData.onSale = false;
                updateData.saleStartDate = null;
                updateData.saleEndDate = null;
            } else {
                // Adding or updating promo price
                if (updateData.promoPrice <= 0) {
                    throw new AppError(
                        "Promotional price must be a positive number",
                        400
                    );
                }

                const basePrice = updateData.basePrice || product.basePrice;
                if (updateData.promoPrice >= basePrice) {
                    throw new AppError(
                        "Promotional price must be less than the base price",
                        400
                    );
                }

                updateData.onSale = true;
            }
        }

        // Update the product
        Object.keys(updateData).forEach((key) => {
            product[key] = updateData[key];
        });

        product.approved = false;
        product.status = "pending";
        product.approvedAt = null;
        product.approvedBy = null;
        product.rejectedAt = null;
        product.rejectedBy = null;
        product.rejectedReason = null;

        await product.save();
        return product;
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
