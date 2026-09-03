import { Router } from "express";
import AdminController from "../../controllers/admin.controller.js";
import FaqController from "../../controllers/faq.controller.js";
import NotificationController from "../../controllers/notification.controller.js";
import validate from "../../middlewares/validate.js";
import { authenticate, adminOnly } from "../../middlewares/auth.js";
import { adminLoginSchema } from "../../validators/admin.auth.validator.js";
import { validateSetPermissions } from "../../validators/admin.permission.validator.js";
import {
    validateCreateAdmin,
    validateUpdateAdmin,
} from "../../validators/admin.manage.validator.js";
import { validateUpdateSellerApproval } from "../../validators/admin.seller.validator.js";
import { validateUpdatePlatformSettings } from "../../validators/admin.platformSettings.validator.js";
import {
    validateCreateFaq,
    validateUpdateFaq,
} from "../../validators/admin.faq.validator.js";
import {
    validateProductRejection,
    validatePayoutRejection,
} from "../../validators/admin.product.validator.js";
import {
    validateCreateNotification,
    validateUpdateNotification,
} from "../../validators/notification.validator.js";
import {
    validateCreateStoreLocation,
    validateUpdateStoreLocation,
} from "../../validators/admin.storeLocation.validator.js";
import {
    getAllCompanies,
    getShippingStats,
    toggleCompanyStatus,
    markMonthlyPayoutSettled,
    updateCompany,
} from "../../controllers/logistics.controller.js";

const router = Router();

// Public routes for admin authentication
router.post("/login", validate(adminLoginSchema), AdminController.login);

// Protected admin routes
router.get("/profile", authenticate, adminOnly, AdminController.getProfile);
router.get(
    "/permissions",
    authenticate,
    adminOnly,
    AdminController.getPermissions,
);
router.get("/stats", authenticate, adminOnly, AdminController.getStats);

router.get("/users", authenticate, adminOnly, AdminController.getAllUsers);

router.get("/admins", authenticate, adminOnly, AdminController.getAllAdmins);

router.get("/sellers", authenticate, adminOnly, AdminController.getAllSellers);

router.get(
    "/sellers/:id/info",
    authenticate,
    adminOnly,
    AdminController.getSellerInfo,
);

router.get(
    "/sellers/:id/orders",
    authenticate,
    adminOnly,
    AdminController.getSellerOrders,
);

router.get(
    "/sellers/:id/reviews",
    authenticate,
    adminOnly,
    AdminController.getSellerReviews,
);

router.get(
    "/sellers/:id/payments",
    authenticate,
    adminOnly,
    AdminController.getSellerPayments,
);

router.patch(
    "/sellers/:id/approval",
    authenticate,
    adminOnly,
    validateUpdateSellerApproval,
    AdminController.updateSellerApproval,
);

router.patch(
    "/users/:id/suspend",
    authenticate,
    adminOnly,
    AdminController.suspendUser,
);

router.patch(
    "/users/:id/unsuspend",
    authenticate,
    adminOnly,
    AdminController.unsuspendUser,
);

router.delete(
    "/users/:id",
    authenticate,
    adminOnly,
    AdminController.deleteUser,
);

// Notification management (system -> user)
router.post(
    "/notifications",
    authenticate,
    adminOnly,
    validateCreateNotification,
    NotificationController.createNotification,
);
router.patch(
    "/notifications/:notificationId",
    authenticate,
    adminOnly,
    validateUpdateNotification,
    NotificationController.updateNotification,
);

// Admin management (create/update admins with permissions)
router.post(
    "/",
    authenticate,
    adminOnly,
    validateCreateAdmin,
    AdminController.createAdmin,
);
router.patch(
    "/:id",
    authenticate,
    adminOnly,
    validateUpdateAdmin,
    AdminController.updateAdmin,
);
router.delete("/:id", authenticate, adminOnly, AdminController.deleteAdmin);

// Platform settings routes
router.get("/settings/platform", AdminController.getPlatformSettings);

router.patch(
    "/settings/platform",
    authenticate,
    adminOnly,
    validateUpdatePlatformSettings,
    AdminController.updatePlatformSettings,
);

router.patch(
    "/products/:productId/approve",
    authenticate,
    adminOnly,
    AdminController.approveProduct,
);

router.patch(
    "/products/:productId/reject",
    authenticate,
    adminOnly,
    validateProductRejection,
    AdminController.rejectProduct,
);

router.get(
    "/products",
    authenticate,
    adminOnly,
    AdminController.getAllProducts,
);

router.get("/orders", authenticate, adminOnly, AdminController.getAllOrders);
router.get(
    "/orders/stats",
    authenticate,
    adminOnly,
    AdminController.getOrderStats,
);
router.post(
    "/orders/sync-pending",
    authenticate,
    adminOnly,
    AdminController.syncPendingPayments,
);
router.get("/orders/:id", authenticate, adminOnly, AdminController.getOrder);
router.patch(
    "/orders/:id/deliver",
    authenticate,
    adminOnly,
    AdminController.markOrderDelivered,
);
router.patch(
    "/orders/:id/status",
    authenticate,
    adminOnly,
    AdminController.updateOrderStatus,
);

// FAQ management routes
router.get("/faqs", authenticate, adminOnly, FaqController.getAllFaqs);
router.get(
    "/faqs/categories",
    authenticate,
    adminOnly,
    FaqController.getFaqCategories,
);
router.get("/faqs/:id", authenticate, adminOnly, FaqController.getFaqById);
router.post(
    "/faqs",
    authenticate,
    adminOnly,
    validateCreateFaq,
    FaqController.createFaq,
);
router.patch(
    "/faqs/:id",
    authenticate,
    adminOnly,
    validateUpdateFaq,
    FaqController.updateFaq,
);
router.delete("/faqs/:id", authenticate, adminOnly, FaqController.deleteFaq);

// Payout management routes
router.get(
    "/payouts/stats",
    authenticate,
    adminOnly,
    AdminController.getPayoutStats,
);
router.get(
    "/payouts",
    authenticate,
    adminOnly,
    AdminController.getPendingPayouts,
);
router.patch(
    "/payouts/:id/approve",
    authenticate,
    adminOnly,
    AdminController.approvePayout,
);
router.patch(
    "/payouts/:id/reject",
    authenticate,
    adminOnly,
    validatePayoutRejection,
    AdminController.rejectPayout,
);

// Shipping management routes
router.get(
    "/shipping/couriers",
    authenticate,
    adminOnly,
    AdminController.getCouriers,
);

router.patch(
    "/shipping/couriers/:id/toggle",
    authenticate,
    adminOnly,
    AdminController.toggleCourier,
);

router.get(
    "/orders/:id/shipping-rates",
    authenticate,
    adminOnly,
    AdminController.getOrderCarriers,
);

router.post(
    "/orders/:id/shipment",
    authenticate,
    adminOnly,
    AdminController.createShipment,
);

// Store Location management routes
router.post(
    "/store-locations",
    authenticate,
    adminOnly,
    validateCreateStoreLocation,
    AdminController.createStoreLocation,
);

router.get(
    "/store-locations",
    authenticate,
    adminOnly,
    AdminController.getAllStoreLocations,
);

router.get(
    "/store-locations/:id",
    authenticate,
    adminOnly,
    AdminController.getStoreLocation,
);

router.patch(
    "/store-locations/:id",
    authenticate,
    adminOnly,
    validateUpdateStoreLocation,
    AdminController.updateStoreLocation,
);

router.delete(
    "/store-locations/:id",
    authenticate,
    adminOnly,
    AdminController.deleteStoreLocation,
);

// Regional Logistics management routes
router.get(
    "/regional-logistics",
    authenticate,
    adminOnly,
    getAllCompanies,
);
router.get(
    "/regional-logistics/stats",
    authenticate,
    adminOnly,
    getShippingStats,
);
router.get(
    "/shipping/stats",
    authenticate,
    adminOnly,
    getShippingStats,
);
router.patch(
    "/regional-logistics/:id/toggle",
    authenticate,
    adminOnly,
    toggleCompanyStatus,
);
router.post(
    "/regional-logistics/:id/settle",
    authenticate,
    adminOnly,
    markMonthlyPayoutSettled,
);
router.patch(
    "/regional-logistics/:id",
    authenticate,
    adminOnly,
    updateCompany,
);

export default router;
