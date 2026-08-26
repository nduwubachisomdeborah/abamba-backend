import authService from "../services/auth.service.js";
import { asyncHandler } from "../middlewares/error.js";
import {
    sendResponse,
    successResponse,
    errorResponse,
    badResponse,
} from "../utils/response.util.js";

class AuthController {
    /**
     * @desc    Register a new user and send OTP
     * @route   POST /api/v1/auth/signup
     * @access  Public
     */
    static signup = asyncHandler(async (req, res) => {
        const { name, email, phoneNumber, password } = req.body;

        const result = await authService.signup({
            name,
            email,
            phoneNumber,
            password,
        });

        return sendResponse(
            res,
            201,
            true,
            "User registered successfully. Please verify your OTP.",
            {
                user: result.user,
            }
        );
    });

    /**
     * @desc    Guest user
     * @route   POST /api/v1/auth/guest
     * @access  Public
     */
    static guest = asyncHandler(async (req, res) => {
        const result = await authService.guest();

        return successResponse(res, "Guest user created successfully", {
            user: result.user,
            token: result.token,
        });
    });

    /**
     * @desc    Login user and send OTP
     * @route   POST /api/v1/auth/login
     * @access  Public
     */
    static login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const result = await authService.login(email, password);

        return successResponse(
            res,
            "Login successful. Please verify your OTP to get access token."
        );
    });

    /**
     * @desc    Verify OTP
     * @route   POST /api/v1/auth/verify-otp
     * @access  Public
     */
    static verifyOTP = asyncHandler(async (req, res) => {
        const { email, otpCode } = req.body;

        const result = await authService.verifyOTP(email, otpCode);

        return successResponse(res, "OTP verified successfully", {
            user: result.user,
            token: result.token,
        });
    });

    /**
     * @desc    Resend OTP
     * @route   POST /api/v1/auth/resend-otp
     * @access  Public
     */
    static resendOTP = asyncHandler(async (req, res) => {
        const { email } = req.body;

        if (!email) {
            return errorResponse(res, "Email is required", 400);
        }

        const result = await authService.resendOTP(email);

        // In a real application, you would send the OTP via SMS or email
        return successResponse(res, result.message, {
            // NOTE: In production, you would NOT send the OTP back in the response
            // It's included here for testing purposes only
            otp: result.otp,
            // Include a session token for subsequent verification
            sessionToken: result.sessionToken,
        });
    });

    /**
     * @desc    Sign in with Google
     * @route   POST /api/v1/auth/google
     * @access  Public
     */
    static googleSignIn = asyncHandler(async (req, res) => {
        const { idToken } = req.body;

        if (!idToken) {
            return errorResponse(res, "Google ID token is required", 400);
        }

        const result = await authService.googleSignIn(idToken);

        return successResponse(res, "Google sign-in successful", {
            user: result.user,
            token: result.token,
        });
    });

    /**
     * @desc    Forgot Password - Request password reset OTP
     * @route   POST /api/v1/auth/forgot-password
     * @access  Public
     */
    static forgotPassword = asyncHandler(async (req, res) => {
        const { email } = req.body;

        const result = await authService.forgotPassword(email);

        // In a real application, you would send the OTP via SMS or email
        return successResponse(res, result.message, {
            // NOTE: In production, you would NOT send the OTP back in the response
            // It's included here for testing purposes only
            otp: result.otp,
        });
    });

    /**
     * @desc    Reset Password with OTP
     * @route   POST /api/v1/auth/reset-password
     * @access  Public
     */
    static resetPassword = asyncHandler(async (req, res) => {
        const { email, otpCode, newPassword } = req.body;

        const result = await authService.resetPassword(
            email,
            otpCode,
            newPassword
        );

        return successResponse(res, "Password reset successful", {
            user: result.user,
            token: result.token,
        });
    });
}

export default AuthController;
