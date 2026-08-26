import express from "express";
import ShipmentController from "../../controllers/shipment.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { adminOnly } from "../../middlewares/auth.js";
import { sellerOrAdmin } from "../../middlewares/seller.js";
import {
    validateCreateShipment,
    validateUpdateShipment,
    validateTrackingUpdate,
    validateGetCarriers,
} from "../../validators/shipment.validator.js";

const router = express.Router();

// Public route for tracking
router.get(
    "/tracking/:trackingNumber",
    ShipmentController.getShipmentByTracking,
);

// Protect all other shipment routes
router.use(authenticate);

// Routes accessible by users, sellers, and admins
router.get("/", ShipmentController.getShipments);
router.get("/:id", ShipmentController.getShipmentById);

router.post("/carriers", validateGetCarriers, ShipmentController.getCarriers);

// Admin-only routes
router.post(
    "/",
    adminOnly,
    validateCreateShipment,
    ShipmentController.createShipment,
);
router.post(
    "/:id/tracking",
    adminOnly,
    validateTrackingUpdate,
    ShipmentController.addTrackingUpdate,
);
router.patch(
    "/:id",
    adminOnly,
    validateUpdateShipment,
    ShipmentController.updateShipment,
);
router.delete("/:id", adminOnly, ShipmentController.deleteShipment);

router.post("/webhook/shipment", ShipmentController.webhookShipment);

export default router;
