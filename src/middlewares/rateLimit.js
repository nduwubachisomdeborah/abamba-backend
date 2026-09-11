import rateLimit from "express-rate-limit";

/**
 * Strict Rate Limiter for Authentication (Login, Signup, Password Reset)
 * Prevents credential stuffing and brute-force attacks.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // max 20 requests per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        status: "fail",
        message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
    },
});

/**
 * Very Strict Rate Limiter for OTP Requests & Verifications
 * Prevents SMS/Email spamming and OTP brute-forcing.
 */
export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 6, // max 6 attempts per 10 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        status: "fail",
        message: "Too many OTP requests from this IP. Please wait 10 minutes before requesting or verifying again.",
    },
});

/**
 * Rate Limiter for Checkout & Payment Initiation
 * Prevents order creation flooding & fake transaction attempts.
 */
export const checkoutLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // max 30 orders/payment attempts per 10 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        status: "fail",
        message: "Too many checkout or payment attempts. Please slow down and try again shortly.",
    },
});
