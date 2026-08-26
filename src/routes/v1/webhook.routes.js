import { Router } from "express";
import WebhookController from "../../controllers/webhook.controller.js";
import { verifyShipBubbleSignature } from "../../middlewares/shipbubble.middleware.js";

const router = Router();

// ShipBubble webhook endpoint
router.post(
    "/shipbubble",
    verifyShipBubbleSignature,
    WebhookController.handleShipBubble,
);

export default router;
