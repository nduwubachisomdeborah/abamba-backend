import { asyncHandler } from './error.js';
import { authenticate } from './auth.js';
import { restrictTo } from './auth.js';

/**
 * Middleware to check if user is a seller or admin
 * For use on routes accessible by both sellers and admins
 */
export const sellerOrAdmin = asyncHandler(async (req, res, next) => {
  // First authenticate the user
  await authenticate(req, res, () => {
    // Then check if user has appropriate role using the restrictTo middleware
    restrictTo('seller', 'admin')(req, res, next);
  });
});

/**
 * Middleware to check if user is a seller only
 * For use on seller-specific routes
 */
export const sellerOnly = asyncHandler(async (req, res, next) => {
  // First authenticate the user
  await authenticate(req, res, () => {
    // Then check if user has seller role using the restrictTo middleware
    restrictTo('seller')(req, res, next);
  });
});
