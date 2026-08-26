import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            enum: ["paystack", "funz", "manual", "other"],
            default: "paystack",
        },
        method: {
            type: String,
            enum: [
                "credit_card",
                "paypal",
                "bank_transfer",
                "cash_on_delivery",
                "other",
            ],
            required: true,
        },
        reference: {
            type: String,
        },
        transactionId: {
            type: String,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: process.env.CURRENCY || "NGN",
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded"],
            default: "pending",
        },
        customerEmail: {
            type: String,
        },
        details: {
            type: Object,
            default: {},
        },
        metadata: {
            type: Object,
            default: {},
        },
    },
    { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
