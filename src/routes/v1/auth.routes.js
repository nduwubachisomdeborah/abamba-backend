import { Router } from "express";
import AuthController from "../../controllers/auth.controller.js";
import UserController from "../../controllers/user.controller.js";
import {
    signupSchema,
    loginSchema,
    verifyOTPSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from "../../validators/auth.validator.js";
import validate from "../../middlewares/validate.js";
import { authenticate, optionalAuth } from "../../middlewares/auth.js";
import { authLimiter, otpLimiter } from "../../middlewares/rateLimit.js";

const router = Router();

// Public routes
router.post(
    "/signup",
    authLimiter,
    validate(signupSchema),
    optionalAuth(authenticate),
    AuthController.signup
);
router.post("/login", authLimiter, validate(loginSchema), AuthController.login);
router.post("/guest", authLimiter, AuthController.guest);
router.post("/resend-otp", otpLimiter, AuthController.resendOTP);
router.post("/google", authLimiter, AuthController.googleSignIn);
router.post(
    "/forgot-password",
    authLimiter,
    validate(forgotPasswordSchema),
    AuthController.forgotPassword
);
router.post(
    "/reset-password",
    authLimiter,
    validate(resetPasswordSchema),
    AuthController.resetPassword
);

// OTP verification route - public route, uses email and OTP code
router.post("/verify-otp", otpLimiter, validate(verifyOTPSchema), AuthController.verifyOTP);

// Protected routes (require authentication)
router.post("/switch-role", authenticate, AuthController.switchRole);
router.get("/me", authenticate, UserController.getMe);
router.get("/profile", authenticate, UserController.getMe);
router.get("/user", authenticate, UserController.getMe);

export default router;
