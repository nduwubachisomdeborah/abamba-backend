import express from "express";
import SettingsController from "../../controllers/settings.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.js";
import { validateUpdatePlatformSettings } from "../../validators/admin.platformSettings.validator.js";

const router = express.Router();

// GET settings should NOT require super admin token so public pages & sellers can view settings
router.get("/platform", SettingsController.getPlatformSettings);
router.get("/promotions", SettingsController.getPromotionsStatus);
router.get("/", SettingsController.getPublicSettings);

// PATCH & PUT settings MUST be protected for Admin only
router.patch(
    "/platform",
    authenticate,
    adminOnly,
    validateUpdatePlatformSettings,
    SettingsController.updatePlatformSettings
);
router.put(
    "/platform",
    authenticate,
    adminOnly,
    validateUpdatePlatformSettings,
    SettingsController.updatePlatformSettings
);
router.patch(
    "/",
    authenticate,
    adminOnly,
    validateUpdatePlatformSettings,
    SettingsController.updatePlatformSettings
);
router.put(
    "/",
    authenticate,
    adminOnly,
    validateUpdatePlatformSettings,
    SettingsController.updatePlatformSettings
);

// Admin protected route for toggling promotions
router.patch(
    "/promotions",
    authenticate,
    adminOnly,
    SettingsController.toggleBonusEvent
);
router.put(
    "/promotions",
    authenticate,
    adminOnly,
    SettingsController.toggleBonusEvent
);

export default router;

