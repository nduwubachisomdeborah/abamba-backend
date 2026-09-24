/**
 * /api/v1/sellers/* routes
 *
 * Seller-scoped data routes (orders, etc.) requiring a sellerToken or
 * a unified JWT with seller role. Distinct from /api/v1/seller/* which
 * handles seller authentication and profile actions.
 *
 * Frontend expects:
 *   GET /sellers/orders  -> seller's own orders (sellerToken in Authorization header)
 */

import express from "express";
import { authenticate, restrictTo } from "../../middlewares/auth.js";
import OrderController from "../../controllers/order.controller.js";

const router = express.Router();

/**
 * GET /api/v1/sellers/orders
 * Returns only the authenticated seller's orders.
 * Seller is identified from the JWT (sellerToken or unified token).
 * Supports query params: page, limit, status, search, sort
 *
 * Response shape:
 *   { data: { orders: [...], pagination: { total, page, pages, hasPrev, hasNext } } }
 */
router.get(
    "/orders",
    authenticate,
    restrictTo("seller", "user", "buyer"),
    OrderController.getSellerOrders
);

/**
 * GET /api/v1/sellers/orders/:id
 * Get a single order by ID - only if it belongs to this seller.
 */
router.get(
    "/orders/:id",
    authenticate,
    restrictTo("seller", "user", "buyer"),
    OrderController.getOrderById
);

/**
 * PATCH /api/v1/sellers/orders/:id/status
 * Update order status for a seller-owned order.
 */
router.patch(
    "/orders/:id/status",
    authenticate,
    restrictTo("seller", "user", "buyer"),
    OrderController.updateOrderStatus
);

export default router;
