import express from "express";
import {
    authenticate,
    restrictTo,
    verifiedSellerOnly,
} from "../../middlewares/auth.js";
import CustomerController from "../../controllers/customer.controller.js";

const router = express.Router();

// All customer routes require seller authentication
router.use(authenticate);
router.use(restrictTo("seller"));
router.use(verifiedSellerOnly);

// Customer listing routes
router.get("/", CustomerController.getCustomers);
router.get("/:customerId", CustomerController.getCustomerById);

// Customer order routes
router.get("/:customerId/orders", CustomerController.getCustomerOrders);

// Customer metrics for seller
router.get("/metrics/overview", CustomerController.getCustomerMetrics);
router.get("/metrics/recent", CustomerController.getRecentCustomers);
router.get("/metrics/top", CustomerController.getTopCustomers);

export default router;
