import crypto from "crypto";

/**
 * Middleware to verify ShipBubble webhook signature
 * Uses HMAC SHA512 with SHIPBUBBLE_API_KEY as the secret
 */
export const verifyShipBubbleSignature = (req, res, next) => {
    const signature = req.headers["x-ship-signature"];
    const secretKey = process.env.SHIPBUBBLE_API_KEY;

    if (!signature) {
        return res.status(401).json({
            success: false,
            message: "Missing webhook signature",
        });
    }

    if (!secretKey) {
        console.error("SHIPBUBBLE_API_KEY not configured");
        return res.status(500).json({
            success: false,
            message: "Webhook verification not configured",
        });
    }

    // Create HMAC SHA512 hash of the raw body
    const rawBody =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const expectedSignature = crypto
        .createHmac("sha512", secretKey)
        .update(rawBody)
        .digest("hex");

    // Compare signatures
    if (signature !== expectedSignature) {
        console.warn("Invalid ShipBubble webhook signature");
        return res.status(401).json({
            success: false,
            message: "Invalid webhook signature",
        });
    }

    next();
};
