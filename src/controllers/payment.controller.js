import crypto from "crypto";
import PaymentService from "../services/payment.service.js";
import User from "../models/user.model.js";
import BannerAd from "../models/bannerAd.model.js";
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
            const secret = (
                process.env.PAYSTACK_SECRET_KEY ||
                process.env.PAYSTACK_API_KEY ||
                ""
            ).trim();

            if (secret && req.headers["x-paystack-signature"]) {
                const isValid = verifyPaystackSignature(req, secret);
                if (!isValid) {
                    console.warn("[PaystackWebhook] Invalid signature received");
                }
            }

            // Parse payload safely whether raw or json
            const payload = Buffer.isBuffer(req.body)
                ? JSON.parse(req.body.toString("utf8"))
                : req.body || {};

            // Only proceed for charge.success
            const event = payload?.event;
            const data = payload?.data || {};
            const reference = data?.reference || payload?.reference;
            const metadata = data?.metadata || payload?.metadata || {};

            console.log("[PaystackWebhook] Received:", { event, reference, type: metadata?.type });

            if (!reference) {
                return res
                    .status(200)
                    .json({ success: true, message: "Ignored: no reference" });
            }

            // 1. Vendor Subscription Activation
            if (metadata?.type === "vendor_subscription") {
                const sellerId = metadata.sellerId || metadata.userId;
                const sellerEmail = data.customer?.email || metadata.email;
                const seller = sellerId
                    ? await User.findById(sellerId)
                    : (sellerEmail ? await User.findOne({ email: sellerEmail.toLowerCase() }) : null);

                if (seller) {
                    const planId = metadata.planId || "starter";
                    seller.subscriptionPlan = planId;
                    seller.subscriptionStatus = "active";
                    seller.subscriptionPrice = (Number(data.amount) || 0) / 100;
                    seller.subscriptionPaidAt = new Date();
                    seller.subscriptionExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                    seller.subscriptionReference = reference;
                    await seller.save();
                    console.log(`[PaystackWebhook] Vendor subscription activated for ${seller.email} (${planId})`);
                }

                return res.status(200).json({
                    success: true,
                    processed: true,
                    event,
                    reference,
                    type: "vendor_subscription",
                });
            }

            // 2. Banner Ad Payment Marking
            if (metadata?.type === "banner_ad") {
                const adId = metadata.adId || metadata.bannerAdId;
                const ad = adId
                    ? await BannerAd.findById(adId)
                    : await BannerAd.findOne({ paymentReference: reference });

                if (ad) {
                    ad.paymentStatus = "paid";
                    await ad.save();
                    console.log(`[PaystackWebhook] Banner ad payment marked as paid: ${ad._id}`);
                }

                return res.status(200).json({
                    success: true,
                    processed: true,
                    event,
                    reference,
                    type: "banner_ad",
                });
            }

            // 3. Addon Boost Logging
            if (metadata?.type === "addon_boost") {
                console.log("[PaystackWebhook] Purchased addon boost:", {
                    reference,
                    amount: (Number(data.amount) || 0) / 100,
                    metadata,
                });

                return res.status(200).json({
                    success: true,
                    processed: true,
                    event,
                    reference,
                    type: "addon_boost",
                });
            }

            // 4. Default: Standard Order Finalization
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
