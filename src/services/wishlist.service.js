import Wishlist from "../models/wishlist.model.js";
import Product from "../models/product.model.js";
import { AppError } from "../middlewares/error.js";
import mongoose from "mongoose";
import PaginationUtil from "../utils/pagination.util.js";

const paginationUtil = new PaginationUtil();

class WishlistService {
    /**
     * Get all wishlists for a user
     * @param {string} userId - User ID
     * @param {Object} query - Query parameters for pagination and filtering
     * @returns {Promise<Object>} Wishlists and pagination info
     */
    async getWishlists(userId, query = {}) {
        const { page = 1, limit = 10 } = query;

        const filter = { user: userId };

        // Get pagination options
        const {
            page: pageNum,
            limit: limitNum,
            skip,
        } = PaginationUtil.getPaginationOptions({ page, limit });

        // Get total count for pagination
        const total = await Wishlist.countDocuments(filter);

        // Get paginated wishlists
        const wishlists = await Wishlist.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate("products.product")
            .lean();

        // Get pagination data
        const paginationData = PaginationUtil.getPaginationData(
            total,
            pageNum,
            limitNum
        );

        return {
            wishlists,
            pagination: paginationData,
        };
    }

    /**
     * Get a specific wishlist by ID
     * @param {string} wishlistId - Wishlist ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Wishlist object
     */
    async getWishlistById(wishlistId, userId) {
        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            user: userId, // Only user's own wishlist
        }).populate("products.product");

        if (!wishlist) {
            throw new AppError("Wishlist not found or not accessible", 404);
        }

        return wishlist;
    }

    /**
     * Create a new wishlist
     * @param {string} userId - User ID
     * @param {Object} wishlistData - Wishlist data
     * @returns {Promise<Object>} New wishlist
     */
    async createWishlist(userId, wishlistData) {
        // Check if user already has a default wishlist
        if (!wishlistData.name || wishlistData.name === "Wishlist") {
            const defaultWishlist = await Wishlist.findOne({
                user: userId,
                name: "Wishlist",
            });

            if (defaultWishlist) {
                return defaultWishlist;
            }
        }

        const wishlist = new Wishlist({
            user: userId,
            name: wishlistData.name || "Wishlist",
            products: [],
        });

        await wishlist.save();

        return wishlist;
    }

    /**
     * Get or create default wishlist
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Default wishlist
     */
    async getOrCreateDefaultWishlist(userId) {
        // Try to find existing default wishlist
        let defaultWishlist = await Wishlist.findOne({
            user: userId,
            name: "Wishlist",
        });

        // Create default wishlist if it doesn't exist
        if (!defaultWishlist) {
            defaultWishlist = new Wishlist({
                user: userId,
                name: "Wishlist",
                products: [],
            });

            await defaultWishlist.save();
        }

        return defaultWishlist;
    }

    /**
     * Add a product to a wishlist
     * @param {string} wishlistId - Wishlist ID (optional, if not provided default wishlist will be used)
     * @param {string} userId - User ID
     * @param {Object} productData - Product data including product ID and optional notes
     * @returns {Promise<Object>} Updated wishlist
     */
    async addProductToWishlist(wishlistId, userId, productData) {
        const { productId, notes } = productData;

        // Validate product exists
        const product = await Product.findById(productId);
        if (!product) {
            throw new AppError("Product not found", 404);
        }

        let wishlist;

        // If no wishlist ID is provided, use default wishlist
        if (!wishlistId) {
            wishlist = await this.getOrCreateDefaultWishlist(userId);
        } else {
            // Find wishlist and ensure it belongs to the user
            wishlist = await Wishlist.findOne({
                _id: wishlistId,
                user: userId,
            });

            if (!wishlist) {
                throw new AppError("Wishlist not found or not accessible", 404);
            }
        }

        // Check if product is already in the wishlist
        const existingProduct = wishlist.products.find(
            (item) => item.product.toString() === productId
        );

        if (existingProduct) {
            // Update notes if provided
            if (notes) {
                existingProduct.notes = notes;
            }
            existingProduct.addedAt = new Date(); // Update timestamp
        } else {
            // Add new product to wishlist
            wishlist.products.push({
                product: productId,
                addedAt: new Date(),
                notes: notes || "",
            });
        }

        await wishlist.save();

        return await Wishlist.findById(wishlist._id).populate(
            "products.product",
            "name price images description"
        );
    }

    /**
     * Remove a product from a wishlist
     * @param {string} wishlistId - Wishlist ID
     * @param {string} userId - User ID
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Updated wishlist
     */
    async removeProductFromWishlist(wishlistId, userId, productId) {
        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            user: userId,
        });

        if (!wishlist) {
            throw new AppError("Wishlist not found or not accessible", 404);
        }

        // Remove product from wishlist
        wishlist.products = wishlist.products.filter(
            (item) => item.product.toString() !== productId
        );

        await wishlist.save();

        return await Wishlist.findById(wishlist._id).populate(
            "products.product",
            "name price images description"
        );
    }

    /**
     * Update wishlist details
     * @param {string} wishlistId - Wishlist ID
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated wishlist
     */
    async updateWishlist(wishlistId, userId, updateData) {
        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            user: userId,
        });

        if (!wishlist) {
            throw new AppError("Wishlist not found or not accessible", 404);
        }

        // Update fields
        if (updateData.name) {
            wishlist.name = updateData.name;
        }

        await wishlist.save();

        return await Wishlist.findById(wishlist._id).populate(
            "products.product",
            "name price images description"
        );
    }

    /**
     * Delete a wishlist (soft delete)
     * @param {string} wishlistId - Wishlist ID
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    async deleteWishlist(wishlistId, userId) {
        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            user: userId,
        });

        if (!wishlist) {
            throw new AppError("Wishlist not found or not accessible", 404);
        }

        // Don't allow deleting the default wishlist
        if (wishlist.name === "Wishlist") {
            throw new AppError("Cannot delete default wishlist", 400);
        }

        // Soft delete
        wishlist.isDeleted = true;
        wishlist.deletedAt = new Date();

        await wishlist.save();
    }

    /**
     * Check if a product is in any of the user's wishlists
     * @param {string} userId - User ID
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Object with isInWishlist boolean and wishlist info if found
     */
    async isProductInWishlist(userId, productId) {
        if (!userId || !productId) {
            return { isInWishlist: false, wishlist: null };
        }

        try {
            const wishlist = await Wishlist.findOne({
                user: userId,
                "products.product": productId,
            }).select("_id name products");

            if (wishlist) {
                // Find the specific product in the wishlist to get additional info
                const productInWishlist = wishlist.products.find(
                    (item) => item.product.toString() === productId
                );

                return {
                    isInWishlist: true,
                    wishlist: {
                        id: wishlist._id,
                        name: wishlist.name,
                        addedAt: productInWishlist?.addedAt,
                        notes: productInWishlist?.notes,
                    },
                };
            }

            return { isInWishlist: false, wishlist: null };
        } catch (error) {
            console.error("Error checking product in wishlist:", error);
            return { isInWishlist: false, wishlist: null };
        }
    }

    // Public wishlist functionality removed - wishlists are now private to each user
}

export default new WishlistService();
