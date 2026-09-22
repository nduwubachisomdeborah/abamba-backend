import express from "express";
import {
    authenticate,
    restrictTo,
    verifiedSellerOnly,
    optionalAuth,
} from "../../middlewares/auth.js";
import SellerController from "../../controllers/seller.contoller.js";
import OrderController from "../../controllers/order.controller.js";
import CustomerController from "../../controllers/customer.controller.js";
import { loginUserSchema } from "../../validators/user.validator.js";
import { payoutRequestSchema } from "../../validators/user.validator.js";
import validate from "../../middlewares/validate.js";
import {
    sellerOnBoardingSchema,
    sellerSignUpSchema,
    sellerUpdateProfilePictureSchema,
    sellerUpdatePasswordSchema,
    sellerUpdateNotificationSettingsSchema,
    sellerUpdateBankSchema,
} from "../../validators/seller.validator.js";
import {
    verifyOTPSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from "../../validators/auth.validator.js";

const router = express.Router();

// Seller routes
router.post("/login", validate(loginUserSchema), SellerController.loginSeller);
router.post(
    "/signup",
    validate(sellerSignUpSchema),
    SellerController.signUpSeller,
);
router.post(
    "/forgot-password",
    validate(forgotPasswordSchema),
    SellerController.forgotPassword,
);
router.post(
    "/reset-password",
    validate(resetPasswordSchema),
    SellerController.resetPassword,
);
router.post(
    "/verify-otp",
    validate(verifyOTPSchema),
    SellerController.verifyOTP,
);
router.post("/resend-otp", SellerController.resendOTP);
router.post(
    "/onboard",
    authenticate,
    restrictTo("seller", "user", "buyer", "customer"),
    validate(sellerOnBoardingSchema),
    SellerController.onBoarding,
);

router.get("/bank/list", SellerController.getBanks);
router.get(
    "/bank/resolve",
    authenticate,
    restrictTo("seller", "user", "buyer", "customer"),
    SellerController.resolveBankAccount,
);
router.patch(
    "/bank",
    authenticate,
    restrictTo("seller"),
    validate(sellerUpdateBankSchema),
    SellerController.updateBank,
);
router.get(
    "/stats",
    authenticate,
    restrictTo("seller"),
    SellerController.getSellerStats,
);

// Transaction routes
router.get(
    "/transactions",
    authenticate,
    restrictTo("seller"),
    SellerController.getUserTransactions,
);

router.get(
    "/me",
    authenticate,
    restrictTo("seller", "user", "buyer", "customer"),
    SellerController.getSeller,
);

router.patch(
    "/profile-picture",
    authenticate,
    restrictTo("seller"),
    validate(sellerUpdateProfilePictureSchema),
    SellerController.updateProfilePicture,
);

router.patch(
    "/password",
    authenticate,
    restrictTo("seller"),
    validate(sellerUpdatePasswordSchema),
    SellerController.updatePassword,
);

router.patch(
    "/notification-settings",
    authenticate,
    restrictTo("seller"),
    validate(sellerUpdateNotificationSettingsSchema),
    SellerController.updateNotificationSettings,
);

// Seller Order routes
router.get("/orders", authenticate, OrderController.getOrders);
router.get("/orders/:id", authenticate, OrderController.getOrderById);
router.patch("/orders/:id/status", authenticate, OrderController.updateOrderStatus);

// Seller Customer routes
router.get("/customers", authenticate, restrictTo("seller"), CustomerController.getCustomers);
router.get("/customers/metrics/overview", authenticate, restrictTo("seller"), CustomerController.getCustomerMetrics);
router.get("/customers/metrics/recent", authenticate, restrictTo("seller"), CustomerController.getRecentCustomers);
router.get("/customers/metrics/top", authenticate, restrictTo("seller"), CustomerController.getTopCustomers);
router.get("/customers/:customerId", authenticate, restrictTo("seller"), CustomerController.getCustomerById);
router.get("/customers/:customerId/orders", authenticate, restrictTo("seller"), CustomerController.getCustomerOrders);

// Seller Wallet alias
router.get(
    "/wallet",
    authenticate,
    restrictTo("seller"),
    SellerController.getUserTransactions,
);

// Following & Payout routes (must precede /:sellerId to prevent parameter shadowing)
router.get("/following", authenticate, SellerController.getFollowing);

router.post(
    ["/payout", "/payouts"],
    authenticate,
    restrictTo("seller"),
    validate(payoutRequestSchema),
    SellerController.requestPayout,
);
router.get(
    "/payouts",
    authenticate,
    restrictTo("seller"),
    SellerController.getAllPayouts,
);

// Get seller by ID with optional authentication for follow status
router.get(
    "/:sellerId",
    optionalAuth(authenticate),
    SellerController.getSellerById,
);

// Follow/unfollow seller endpoints
router.post("/:sellerId/follow", authenticate, SellerController.followSeller);
router.delete(
    "/:sellerId/follow",
    authenticate,
    SellerController.unfollowSeller,
);

// Get followers and following lists
router.get("/:sellerId/followers", SellerController.getSellerFollowers);

export default router;
