import express from "express";
import SettingsController from "../../controllers/settings.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.js";

const router = express.Router();

// Public routes
router.get("/promotions", SettingsController.getPromotionsStatus);
router.get("/", SettingsController.getPublicSettings);

// Admin protected route for toggling promotions
router.patch(
    "/promotions",
    authenticate,
    adminOnly,
    SettingsController.toggleBonusEvent
);

export default router;
