import reviewService from "../services/review.service.js";
import { asyncHandler } from "../middlewares/error.js";
import {
    sendResponse,
    successResponse,
    errorResponse,
} from "../utils/response.util.js";

class ReviewController {
    /**
     * @desc    Get all reviews with pagination and filtering
     * @route   GET /api/v1/reviews
     * @access  Private (Admin: all, Seller: their products, User: own reviews)
     */
    static getReviews = asyncHandler(async (req, res) => {
        const user = req.user;
        const query = { ...req.query };

        if (!user) {
            // Unauthenticated - no access
            return errorResponse(res, "Authentication required", 401);
        }

        if (user.role === "admin") {
            // Admin sees all reviews
            delete query.user;
            delete query.seller;
        } else if (user.role === "seller") {
            // Seller sees reviews on their products
            query.seller = user._id;
            delete query.user;
        } else {
            // Regular user sees only their own reviews
            query.user = user._id;
            delete query.seller;
        }

        const { reviews, pagination } = await reviewService.getReviews(
            query,
            user._id
        );

        return successResponse(res, "Reviews retrieved successfully", {
            reviews,
            pagination,
        });
    });

    /**
     * @desc    Get reviews for a specific product
     * @route   GET /api/v1/products/:productId/reviews
     * @access  Public
     */
    static getProductReviews = asyncHandler(async (req, res) => {
        const { reviews, pagination } = await reviewService.getProductReviews(
            req.params.productId,
            req.query,
            req.user?._id || null
        );

        return successResponse(res, "Product reviews retrieved successfully", {
            reviews,
            pagination,
        });
    });

    /**
     * @desc    Get a specific review by ID
     * @route   GET /api/v1/reviews/:id
     * @access  Public
     */
    static getReviewById = asyncHandler(async (req, res) => {
        const review = await reviewService.getReviewById(req.params.id);

        return successResponse(res, "Review retrieved successfully", review);
    });

    /**
     * @desc    Create a new review
     * @route   POST /api/v1/products/:productId/reviews
     * @access  Private
     */
    static createReview = asyncHandler(async (req, res) => {
        // Add product ID from URL params to request body
        const reviewData = {
            ...req.body,
            product: req.params.productId,
        };

        const review = await reviewService.createReview(
            reviewData,
            req.user.id
        );

        return sendResponse(
            res,
            201,
            true,
            "Review created successfully",
            review
        );
    });

    /**
     * @desc    Update a review
     * @route   PUT /api/v1/reviews/:id
     * @access  Private (Owner or Admin)
     */
    static updateReview = asyncHandler(async (req, res) => {
        const review = await reviewService.updateReview(
            req.params.id,
            req.body,
            req.user.id,
            req.user.role
        );

        return successResponse(res, "Review updated successfully", review);
    });

    /**
     * @desc    Delete a review (soft delete)
     * @route   DELETE /api/v1/reviews/:id
     * @access  Private (Owner or Admin)
     */
    static deleteReview = asyncHandler(async (req, res) => {
        await reviewService.deleteReview(
            req.params.id,
            req.user.id,
            req.user.role
        );

        return successResponse(res, "Review deleted successfully", null);
    });

    /**
     * @desc    Mark a review as helpful
     * @route   POST /api/v1/reviews/:id/helpful
     * @access  Private
     */
    static markReviewHelpful = asyncHandler(async (req, res) => {
        const review = await reviewService.markReviewHelpfulness(
            req.params.id,
            req.user.id,
            true
        );

        return successResponse(res, "Review marked as helpful", review);
    });

    /**
     * @desc    Mark a review as unhelpful
     * @route   POST /api/v1/reviews/:id/unhelpful
     * @access  Private
     */
    static markReviewUnhelpful = asyncHandler(async (req, res) => {
        const review = await reviewService.markReviewHelpfulness(
            req.params.id,
            req.user.id,
            false
        );

        return successResponse(res, "Review marked as unhelpful", review);
    });

    /**
     * @desc    Add a reply to a review
     * @route   POST /api/v1/reviews/:id/reply
     * @access  Private (Admin or Seller who owns the product)
     */
    static addReviewReply = asyncHandler(async (req, res) => {
        const { content } = req.body;

        if (!content) {
            return errorResponse(res, "Reply content is required", 400);
        }

        const review = await reviewService.addReviewReply(
            req.params.id,
            content,
            req.user.id,
            req.user.role
        );

        return successResponse(res, "Reply added to review", review);
    });

    /**
     * @desc    Admin: Update review status
     * @route   PATCH /api/v1/reviews/:id/status
     * @access  Private (Admin)
     */
    static updateReviewStatus = asyncHandler(async (req, res) => {
        const { status } = req.body;

        if (!status) {
            return errorResponse(res, "Status is required", 400);
        }

        const review = await reviewService.updateReviewStatus(
            req.params.id,
            status
        );

        return successResponse(res, "Review status updated", review);
    });

    /**
     * @desc    Admin: Mark a review as verified
     * @route   PATCH /api/v1/reviews/:id/verify
     * @access  Private (Admin)
     */
    static verifyReview = asyncHandler(async (req, res) => {
        const review = await reviewService.verifyReview(req.params.id);

        return successResponse(res, "Review marked as verified", review);
    });

    /**
     * @desc    Check if user can review a product
     * @route   GET /api/v1/products/:productId/reviews/can-review
     * @access  Private
     */
    static canReviewProduct = asyncHandler(async (req, res) => {
        const eligibility = await reviewService.canReviewProduct(
            req.params.productId,
            req.user.id
        );

        return successResponse(
            res,
            eligibility.canReview
                ? "You can review this product"
                : "Cannot review this product",
            eligibility
        );
    });
}

export default ReviewController;
