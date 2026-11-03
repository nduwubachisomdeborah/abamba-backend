import { Router } from "express";
import WebhookController from "../../controllers/webhook.controller.js";
import PaymentController from "../../controllers/payment.controller.js";
import { verifyShipBubbleSignature } from "../../middlewares/shipbubble.middleware.js";

const router = Router();

// Paystack webhook endpoint
router.post("/paystack", PaymentController.webhookPaystack);

// ShipBubble webhook endpoint
router.post(
    "/shipbubble",
    verifyShipBubbleSignature,
    WebhookController.handleShipBubble,
);

export default router;
