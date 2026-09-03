import crypto from "crypto";
import PaymentService from "../services/payment.service.js";
import { badResponse, successResponse } from "../utils/response.util.js";

// Helper to get raw body if available
function getRawBody(req) {
    if (Buffer.isBuffer(req.body)) return req.body;
    // Some setups attach raw body separately
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) return req.rawBody;
    // Fallback: rebuild from parsed JSON (may fail signature verification due to spacing)
    try {
        return Buffer.from(JSON.stringify(req.body || {}));
    } catch {
        return Buffer.from("");
    }
}

function verifyPaystackSignature(req, secret) {
    try {
        const signature =
            req.headers["x-paystack-signature"] ||
            req.headers["x-paystack-signature".toLowerCase()];
        if (!signature) return false;
        const raw = getRawBody(req);
        const hash = crypto
            .createHmac("sha512", secret)
            .update(raw)
            .digest("hex");
        return hash === signature;
    } catch {
        return false;
    }
}

class PaymentController {
    async webhookPaystack(req, res) {
        try {
            // Parse payload safely whether raw or json
            const payload = Buffer.isBuffer(req.body)
                ? JSON.parse(req.body.toString("utf8"))
                : req.body || {};

            // Only proceed for charge.success
            const event = payload?.event;
            const reference = payload?.data?.reference || payload?.reference;

            console.log("[PaystackWebhook] Received:", { event, reference });

            if (!reference) {
                return res
                    .status(200)
                    .json({ success: true, message: "Ignored: no reference" });
            }

            const result = await PaymentService.verifyAndFinalizeByReference(
                reference
            );

            return res.status(200).json({
                success: true,
                processed: true,
                event,
                reference,
                data: {
                    paymentId: result.payment?._id,
                    orderHolderId: result.orderHolder?._id,
                    orders: result.orders?.map((o) => o._id) || [],
                },
            });
        } catch (err) {
            console.log(err);
            // Always 200 for webhooks to avoid retries storm, but include error info
            return res.status(200).json({
                success: false,
                processed: false,
                error: err?.message || "Webhook error",
            });
        }
    }

    async webhookFunz(req, res) {
        try {
            const payload = Buffer.isBuffer(req.body)
                ? JSON.parse(req.body.toString("utf8"))
                : req.body || {};

            const event = payload?.event;
            const status = payload?.status;
            const reference = payload?.data?.reference;

            console.log("[FunzWebhook] Received:", { event, status, reference });

            if (!reference) {
                return res
                    .status(200)
                    .json({ success: true, message: "Ignored: no reference" });
            }

            // Only process completed transactions
            if (
                event !== "transaction.update" ||
                status?.toUpperCase() !== "COMPLETED"
            ) {
                return res.status(200).json({
                    success: true,
                    processed: false,
                    message: `Ignored: event=${event}, status=${status}`,
                });
            }

            const result =
                await PaymentService.verifyAndFinalizeByReference(reference);

            return res.status(200).json({
                success: true,
                processed: true,
                event,
                reference,
                data: {
                    paymentId: result.payment._id,
                    orderHolderId: result.orderHolder._id,
                    orders: result.orders.map((o) => o._id),
                },
            });
        } catch (err) {
            console.log("[FunzWebhook] Error:", err);
            return res.status(200).json({
                success: false,
                processed: false,
                error: err?.message || "Webhook error",
            });
        }
    }

    getPaymentProviders(req, res) {
        const providers = PaymentService.getPaymentProviders();
        return successResponse(
            res,
            "Providers fetched successfully",
            providers
        );
    }

    async getPaymentStatus(req, res) {
        try {
            const { reference } = req.query;

            if (!reference) {
                return badResponse(res, "Missing reference");
            }

            const status = await PaymentService.getPaymentStatus(reference);

            return successResponse(
                res,
                "Payment status fetched successfully",
                status
            );
        } catch (error) {
            return badResponse(
                res,
                error?.message || "Failed to get payment status"
            );
        }
    }
}

export default new PaymentController();
