import { Router } from "express";
import {
    getCheckoutLogistics,
    getAllCompanies,
    getShippingStats,
    toggleCompanyStatus,
    markMonthlyPayoutSettled,
    updateCompany,
} from "../../controllers/logistics.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.js";

const router = Router();

// Public Checkout & Query Routes
router.get("/checkout-options", getCheckoutLogistics);
router.get("/companies", getAllCompanies);
router.get("/stats", getShippingStats);

// Admin Logistics Management Routes
router.get("/", authenticate, adminOnly, getAllCompanies);
router.patch("/:id/toggle", authenticate, adminOnly, toggleCompanyStatus);
router.post("/:id/settle", authenticate, adminOnly, markMonthlyPayoutSettled);
router.patch("/:id", authenticate, adminOnly, updateCompany);

export default router;
