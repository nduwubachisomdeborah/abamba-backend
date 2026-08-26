import Review from "../models/review.model.js";
import Product from "../models/product.model.js";
import { AppError } from "../middlewares/error.js";
import mongoose from "mongoose";
import PaginationUtil from "../utils/pagination.util.js";
import Order from "../models/order.model.js";

class ReviewService {
    /**
     * Get all reviews with pagination and filtering
     * @param {Object} query - Query parameters for filtering
     * @param {string|null} currentUserId - Current user ID for interaction indicators
     * @returns {Promise<Object>} Reviews and pagination data
     */
    async getReviews(query = {}, currentUserId = null) {
        // Extract pagination parameters
        const { page, limit, skip } =
            PaginationUtil.getPaginationOptions(query);

        // Build filter object
        const filter = { deleted: false };

        // Add seller filter - get reviews for products owned by seller
        if (query.seller) {
            const sellerProducts = await Product.find({
                user: query.seller,
                deleted: false,
            }).select("_id");
            filter.product = { $in: sellerProducts.map((p) => p._id) };
        }

        // Add product filter if provided
        if (query.product) {
            filter.product = query.product;
        }

        // Add user filter if provided
        if (query.user) {
            filter.user = query.user;
        }

        // Add rating filter if provided
        if (query.rating) {
            filter.rating = Number(query.rating);
        }

        // Add status filter if provided
        if (query.status) {
            filter.status = query.status;
        }

        // Add verified filter if provided
        if (query.verified) {
            filter.verified = query.verified === "true";
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
        const total = await Review.countDocuments(filter);

        // Get reviews with pagination, filtering, and sorting
        const reviews = await Review.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate({
                path: "user",
                select: "name email profilePicture",
            })
            .populate({
                path: "product",
                select: "name images",
            });

        // Add user interaction indicators if currentUserId provided
        let enrichedReviews = reviews;
        if (currentUserId) {
            const userIdStr = currentUserId.toString();
            enrichedReviews = reviews.map((review) => {
                const reviewObj = review.toObject();
                reviewObj.markedHelpful = review.helpful?.users?.some(
                    (u) => u.toString() === userIdStr,
                );
                reviewObj.markedUnhelpful = review.unhelpful?.users?.some(
                    (u) => u.toString() === userIdStr,
                );
                reviewObj.isOwnReview =
                    review.user?._id?.toString() === userIdStr;
                return reviewObj;
            });
        }

        // Generate pagination metadata
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        return { reviews: enrichedReviews, pagination };
    }

    /**
     * Get reviews for a specific product
     * @param {string} productId - Product ID
     * @param {Object} query - Query parameters for filtering and pagination
     * @param {string|null} currentUserId - Current user ID for interaction indicators
     * @returns {Promise<Object>} Reviews and pagination data
     */
    async getProductReviews(productId, query = {}, currentUserId = null) {
        // Make sure the product exists and is not deleted
        const product = await Product.findOne({
            _id: productId,
            deleted: false,
        });
        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Set product ID in query for getReviews
        query.product = productId;

        // Only show published reviews by default
        if (!query.status) {
            query.status = "published";
        }

        return await this.getReviews(query, currentUserId);
    }

    /**
     * Get rating statistics for a product
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Rating statistics object
     */
    async getProductRatingStats(productId) {
        // Make sure the product exists and is not deleted
        const product = await Product.findOne({
            _id: productId,
            deleted: false,
        });
        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Get counts for each rating level (1-5)
        const ratingStats = await Review.aggregate([
            {
                $match: {
                    product: new mongoose.Types.ObjectId(productId),
                    deleted: false,
                    status: "published",
                },
            },
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    rating: "$_id",
                    count: 1,
                },
            },
            {
                $sort: { rating: 1 },
            },
        ]);

        // Calculate total and average
        const totalReviews = ratingStats.reduce(
            (sum, item) => sum + item.count,
            0,
        );
        const totalScore = ratingStats.reduce(
            (sum, item) => sum + item.rating * item.count,
            0,
        );
        const averageRating = totalReviews > 0 ? totalScore / totalReviews : 0;

        // Format the response as an array with all ratings 1-5
        const ratingDistribution = [];
        for (let i = 1; i <= 5; i++) {
            const found = ratingStats.find((item) => item.rating === i);
            ratingDistribution.push({
                rating: i,
                count: found ? found.count : 0,
            });
        }

        return {
            distribution: ratingDistribution,
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
            totalReviews,
        };
    }

    /**
     * Get a specific review by ID
     * @param {string} reviewId - Review ID
     * @returns {Promise<Object>} Review object
     */
    async getReviewById(reviewId) {
        const review = await Review.findOne({ _id: reviewId, deleted: false })
            .populate({
                path: "user",
                select: "name email profilePicture",
            })
            .populate({
                path: "product",
                select: "name images",
            });

        if (!review) {
            throw new AppError("Review not found", 404);
        }

        return review;
    }

    /**
     * Create a new review
     * @param {Object} reviewData - Review data
     * @param {string} userId - User ID of the reviewer
     * @returns {Promise<Object>} New review object
     */
    async createReview(reviewData, userId) {
        // Check if product exists and is not deleted
        const product = await Product.findOne({
            _id: reviewData.product,
            deleted: false,
        });

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Check if variant exists if provided
        if (reviewData.variant) {
            const variantExists = product.variants.some(
                (variant) => variant._id.toString() === reviewData.variant,
            );

            if (!variantExists) {
                throw new AppError("Variant not found", 404);
            }
        }

        // Check if user has already reviewed this product
        const existingReview = await Review.findOne({
            product: reviewData.product,
            user: userId,
            deleted: false,
        });

        if (existingReview) {
            throw new AppError("You have already reviewed this product", 400);
        }

        // Ensure the user has purchased the product (delivered order)
        const orderMatch = {
            user: userId,
            deleted: false,
            status: "delivered",
            "items.product": new mongoose.Types.ObjectId(reviewData.product),
        };

        // If a variant is specified in the review, ensure the order includes that variant
        if (reviewData.variant) {
            orderMatch["items.variant"] = reviewData.variant;
        }

        const hasDeliveredOrder = await Order.exists(orderMatch);

        if (!hasDeliveredOrder) {
            throw new AppError(
                "You can only review products you have purchased and received",
                403,
            );
        }

        // Create the review
        const review = new Review({
            ...reviewData,
            user: userId,
            verified: true,
        });

        // Save the review
        await review.save();

        return review;
    }

    /**
     * Update a review
     * @param {string} reviewId - Review ID
     * @param {Object} updateData - Data to update
     * @param {string} userId - User ID of the requester
     * @param {string} userRole - User role for authorization
     * @returns {Promise<Object>} Updated review object
     */
    async updateReview(reviewId, updateData, userId, userRole) {
        // Find the review to check ownership
        const review = await Review.findOne({ _id: reviewId, deleted: false });

        if (!review) {
            throw new AppError("Review not found", 404);
        }

        // Check if user is the owner or admin
        if (review.user.toString() !== userId && userRole !== "admin") {
            throw new AppError("Not authorized to update this review", 403);
        }

        // Update the review
        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            updateData,
            { new: true, runValidators: true },
        );

        return updatedReview;
    }

    /**
     * Delete a review (soft delete)
     * @param {string} reviewId - Review ID
     * @param {string} userId - User ID of the requester
     * @param {string} userRole - User role for authorization
     * @returns {Promise<Object>} Deleted review object
     */
    async deleteReview(reviewId, userId, userRole) {
        // Find the review to check ownership
        const review = await Review.findOne({ _id: reviewId, deleted: false });

        if (!review) {
            throw new AppError("Review not found", 404);
        }

        // Check if user is the owner or admin
        if (review.user.toString() !== userId && userRole !== "admin") {
            throw new AppError("Not authorized to delete this review", 403);
        }

        // Soft delete the review
        review.deleted = true;
        review.deletedAt = new Date();
        await review.save();

        return review;
    }

    /**
     * Mark a review as helpful or unhelpful
     * @param {string} reviewId - Review ID
     * @param {string} userId - User ID of the requester
     * @param {boolean} isHelpful - Whether the review is helpful or not
     * @returns {Promise<Object>} Updated review object
     */
    async markReviewHelpfulness(reviewId, userId, isHelpful) {
        const review = await Review.findOne({ _id: reviewId, deleted: false });

        if (!review) {
            throw new AppError("Review not found", 404);
        }

        // Check if user has already marked this review
        const helpfulIndex = review.helpful.users.indexOf(userId);
        const unhelpfulIndex = review.unhelpful.users.indexOf(userId);

        // Remove existing votes if any
        if (helpfulIndex !== -1) {
            review.helpful.users.splice(helpfulIndex, 1);
            review.helpful.count -= 1;
        }

        if (unhelpfulIndex !== -1) {
            review.unhelpful.users.splice(unhelpfulIndex, 1);
            review.unhelpful.count -= 1;
        }

        // Add new vote
        if (isHelpful) {
            review.helpful.users.push(userId);
            review.helpful.count += 1;
        } else {
            review.unhelpful.users.push(userId);
            review.unhelpful.count += 1;
        }

        await review.save();

        return review;
    }

    /**
     * Add a reply to a review (Admin or product owner/seller)
     * @param {string} reviewId - Review ID
     * @param {string} replyContent - Reply content
     * @param {string} userId - User ID
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Updated review object
     */
    async addReviewReply(reviewId, replyContent, userId, userRole) {
        const review = await Review.findOne({ _id: reviewId, deleted: false });

        if (!review) {
            throw new AppError("Review not found", 404);
        }

        // Check authorization: admin can reply to any, seller only to their products
        if (userRole === "seller") {
            const product = await Product.findOne({
                _id: review.product,
                user: userId,
                deleted: false,
            });
            if (!product) {
                throw new AppError(
                    "You can only reply to reviews on your products",
                    403,
                );
            }
        }

        // Add the reply
        review.reply = {
            content: replyContent,
            createdAt: new Date(),
            user: userId,
        };

        await review.save();

        return review;
    }

    /**
     * Admin: Update review status (published, pending, rejected)
     * @param {string} reviewId - Review ID
     * @param {string} status - New status
     * @returns {Promise<Object>} Updated review object
     */
    async updateReviewStatus(reviewId, status) {
        const validStatuses = ["published", "pending", "rejected"];

        if (!validStatuses.includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        const review = await Review.findOne({ _id: reviewId, deleted: false });

        if (!review) {
            throw new AppError("Review not found", 404);
        }

        review.status = status;
        await review.save();

        return review;
    }

    /**
     * Admin: Mark a review as verified
     * @param {string} reviewId - Review ID
     * @returns {Promise<Object>} Updated review object
     */
    async verifyReview(reviewId) {
        const review = await Review.findOne({ _id: reviewId, deleted: false });

        if (!review) {
            throw new AppError("Review not found", 404);
        }

        review.verified = true;
        await review.save();

        return review;
    }

    /**
     * Check if a user can review a product
     * @param {string} productId - Product ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Eligibility status and reason
     */
    async canReviewProduct(productId, userId) {
        // Check if product exists and is not deleted
        const product = await Product.findOne({
            _id: productId,
            deleted: false,
        });

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Check if user has already reviewed this product
        const existingReview = await Review.findOne({
            product: productId,
            user: userId,
            deleted: false,
        });

        if (existingReview) {
            return {
                canReview: false,
                reason: "You have already reviewed this product",
                hasExistingReview: true,
                existingReviewId: existingReview._id,
            };
        }

        // Check if the user has purchased and received the product
        const hasDeliveredOrder = await Order.exists({
            user: userId,
            deleted: false,
            status: "delivered",
            "items.product": new mongoose.Types.ObjectId(productId),
        });

        if (!hasDeliveredOrder) {
            return {
                canReview: false,
                reason: "You can only review products you have purchased and received",
                hasPurchased: false,
            };
        }

        return {
            canReview: true,
            reason: "You can review this product",
            hasPurchased: true,
            hasExistingReview: false,
        };
    }
}

export default new ReviewService();
