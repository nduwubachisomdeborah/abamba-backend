import { Router } from "express";
import ReviewController from "../../controllers/review.controller.js";
import {
    validateCreateReview,
    validateUpdateReview,
    validateReviewReply,
    validateReviewStatus,
} from "../../validators/review.validator.js";
import {
    authenticate,
    optionalAuth,
    restrictTo,
} from "../../middlewares/auth.js";

const router = Router();

// Public routes
router.get("/", authenticate, ReviewController.getReviews);
router.get("/:id", ReviewController.getReviewById);
router.get(
    "/:productId/reviews",
    optionalAuth(authenticate),
    ReviewController.getProductReviews
);

// Protected routes
router.use(authenticate); // All routes after this middleware require authentication

// User routes (authenticated user can access)
router.get("/:productId/reviews/can-review", ReviewController.canReviewProduct);
router.post(
    "/:productId/reviews",
    validateCreateReview,
    ReviewController.createReview
);
router.put("/:id", validateUpdateReview, ReviewController.updateReview);
router.delete("/:id", ReviewController.deleteReview);
router.post("/:id/helpful", ReviewController.markReviewHelpful);
router.post("/:id/unhelpful", ReviewController.markReviewUnhelpful);

// Admin/Seller routes
router.post(
    "/:id/reply",
    restrictTo("admin", "seller"),
    validateReviewReply,
    ReviewController.addReviewReply
);

// Admin only routes
router.patch(
    "/:id/status",
    restrictTo("admin"),
    validateReviewStatus,
    ReviewController.updateReviewStatus
);
router.patch("/:id/verify", restrictTo("admin"), ReviewController.verifyReview);

export default router;
