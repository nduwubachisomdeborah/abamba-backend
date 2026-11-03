import express from "express";
import SellerSubscriptionController from "../../controllers/sellerSubscription.controller.js";

const router = express.Router();

/**
 * GET /api/v1/ads/live-banner
 * Public endpoint delivering active, non-expired approved ads for homepage
 */
router.get("/live-banner", SellerSubscriptionController.getLiveBanner);

export default router;

