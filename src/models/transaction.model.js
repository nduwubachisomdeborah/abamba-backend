import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["payout", "earning", "refund", "withdrawal"],
            required: true,
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
            enum: ["pending", "completed", "failed", "cancelled"],
            default: "pending",
        },
        method: {
            type: String,
            enum: ["bank_transfer", "paypal", "wallet_transfer", "other"],
            required: true,
        },
        accountDetails: {
            bankName: String,
            accountNumber: String,
            accountName: String,
            paypalEmail: String,
            // Add other payment method details as needed
        },
        reference: {
            type: String,
            unique: true,
            sparse: true, // Allow null values but unique when present
        },
        transactionId: {
            type: String,
        },
        description: {
            type: String,
        },
        metadata: {
            type: Object,
            default: {},
        },
        processedAt: {
            type: Date,
        },
        failureReason: {
            type: String,
        },
    },
    { timestamps: true }
);

// Index for efficient queries
transactionSchema.index({ user: 1, status: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
