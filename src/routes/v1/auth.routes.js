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

const router = Router();

// Public routes
router.post(
    "/signup",
    validate(signupSchema),
    optionalAuth(authenticate),
    AuthController.signup
);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/guest", AuthController.guest);
router.post("/resend-otp", AuthController.resendOTP);
router.post("/google", AuthController.googleSignIn);
router.post(
    "/forgot-password",
    validate(forgotPasswordSchema),
    AuthController.forgotPassword
);
router.post(
    "/reset-password",
    validate(resetPasswordSchema),
    AuthController.resetPassword
);

// OTP verification route - public route, uses email and OTP code
router.post("/verify-otp", validate(verifyOTPSchema), AuthController.verifyOTP);

// Protected routes (require authentication)
router.post("/switch-role", authenticate, AuthController.switchRole);
router.get("/me", authenticate, UserController.getMe);
router.get("/profile", authenticate, UserController.getMe);
router.get("/user", authenticate, UserController.getMe);

export default router;
