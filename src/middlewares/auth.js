import jwt from "jsonwebtoken";
import { asyncHandler } from "./error.js";
import { AppError } from "./error.js";
import User from "../models/user.model.js";
import userCache from "../utils/userCache.js";

/**
 * Base authentication middleware that extracts and verifies JWT tokens
 */
const extractAndVerifyToken = asyncHandler(async (req, res, next) => {
    let token;

    // Check if auth header exists and has the correct format
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (req.bypassAuth && !token) {
        req.user = null;
        return next();
    }

    // If no token is found, return error
    if (!token) {
        return next(
            new AppError(
                "You are not logged in. Please log in to get access",
                401
            )
        );
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Try to get user from cache first
        let currentUser = userCache.get(decoded.id);

        // If not in cache, fetch from database and cache the result
        if (!currentUser) {
            currentUser = await User.findById(decoded.id).populate("business");

            // Check if user still exists
            if (!currentUser) {
                const error = new AppError(
                    "The user associated with this token no longer exists",
                    401
                );
                req.error = error;
                return next(error);
            }

            // Check if user changed password after token was issued
            if (currentUser.passwordChangedAfter(decoded.iat)) {
                return next(
                    new AppError(
                        "User recently changed password. Please log in again",
                        401
                    )
                );
            }

            // Save user in cache for future requests
            userCache.set(decoded.id, currentUser);
        }

        // Set the user in the request
        req.user = currentUser;

        // Add decoded token to request
        req.decodedToken = decoded;

        next();
    } catch (error) {
        if (req.bypassAuth) {
            next();
        }

        if (error.name === "AppError") {
            return next(error);
        }

        return next(new AppError("Invalid token. Please log in again", 401));
    }
});

/**
 * Regular authentication middleware - requires a fully verified user
 * For use on most protected routes
 */
export const authenticate = asyncHandler(async (req, res, next) => {
    extractAndVerifyToken(req, res, () => {
        if (req.error) {
            const error = req.error;
            req.error = null;
            return next(error);
        }

        next();
    });
});

/**
 * Session authentication middleware - allows access with temporary session tokens
 * Only for use on OTP verification endpoints
 */
export const sessionAuthenticate = asyncHandler(async (req, res, next) => {
    await extractAndVerifyToken(req, res, next);
});

// Middleware to restrict access to certain roles
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You do not have permission to perform this action",
                    403
                )
            );
        }
        next();
    };
};

// Middleware to restrict access to verified sellers
export const verifiedSellerOnly = asyncHandler(async (req, res, next) => {
    authenticate(req, res, () => {
        if (req.user?.role !== "seller" || !req.user?.business?.approved) {
            return next(
                new AppError(
                    "You do not have permission to perform this action. Please verify your business first.",
                    403
                )
            );
        }
        next();
    });
});

/**
 * Admin middleware - requires a user with admin role
 * For use on admin-only routes
 */
export const adminOnly = asyncHandler(async (req, res, next) => {
    // First authenticate the user
    authenticate(req, res, () => {
        // Then check if the user is an admin
        if (req.user.role !== "admin") {
            return next(
                new AppError("This route is restricted to administrators", 403)
            );
        }
        next();
    });
});

/**
 * Optional authentication middleware factory - allows both authenticated and non-authenticated users
 * If a valid token is provided, the specified auth middleware will be used
 * If no token or auth fails, the request continues without authentication
 * This is useful for endpoints that provide enhanced functionality for authenticated users
 * but still work for anonymous users (e.g., product listings, wishlist status)
 *
 * @param {Function} authMiddleware - The authentication middleware to use when token is present (default: authenticate)
 * @returns {Function} Express middleware function
 */
export const optionalAuth = (authMiddleware = authenticate) => {
    return asyncHandler(async (req, res, next) => {
        req.bypassAuth = true;
        let token;

        // Check if auth header exists and has the correct format
        if (
            req.headers?.authorization &&
            req.headers?.authorization.startsWith("Bearer")
        ) {
            token = req.headers?.authorization.split(" ")[1];
        }

        // If no token is found, continue without authentication
        if (!token) {
            req.user = null;
            return next();
        }

        // If token exists, try to authenticate using the provided middleware
        // If authentication fails, continue without authentication instead of throwing error
        try {
            // Create a mock response object to capture any errors
            let authError = null;
            const mockNext = (error) => {
                if (error) {
                    authError = error;
                }
            };

            // Try to authenticate using the provided middleware
            await new Promise((resolve) => {
                authMiddleware(req, res, (error) => {
                    mockNext(error);
                    resolve();
                });
            });

            // If authentication failed, continue without authentication
            if (authError) {
                req.user = null;
                return next();
            }

            // Authentication succeeded, continue with authenticated user
            next();
        } catch (error) {
            // If any error occurs, continue without authentication
            req.user = null;
            next();
        }
    });
};
