import mongoose from "mongoose";
import { getNextSequence } from "./counter.model.js";

// Schema for order items
const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variant: {
            type: String, // Using String type for variant ID
            default: null,
        },
        name: {
            type: String,
            required: true,
        },
        sku: {
            type: String,
            required: false,
        },
        price: {
            type: Number,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        variantAttributes: {
            type: Object,
            default: {},
        },
        imageUrl: {
            type: String,
        },
    },
    { _id: true },
);

// Address schema for shipping and billing
const addressSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        addressLine1: {
            type: String,
            required: true,
        },
        addressLine2: {
            type: String,
        },
        city: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        zipCode: {
            type: String,
            required: true,
        },
        country: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        coordinates: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
            },
            lastUpdated: {
                type: Date,
                default: Date.now,
            },
        },
    },
    { _id: false },
);

// Payment details schema
const paymentSchema = new mongoose.Schema(
    {
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
        transactionId: {
            type: String,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "NGN",
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded"],
            default: "pending",
        },
        details: {
            type: Object,
            default: {},
        },
    },
    { _id: false, timestamps: true },
);

// Main order schema
const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: Number,
            unique: true,
        },
        orderHolder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrderHolder",
            default: null,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: [orderItemSchema],
        status: {
            type: String,
            enum: [
                "pending",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
                "refunded",
            ],
            default: "pending",
        },
        sellerWalletStatus: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending",
        },
        shippingAddress: addressSchema,
        addressId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User.addresses",
        },
        payment: paymentSchema,
        subtotal: {
            type: Number,
            required: true,
        },
        shippingCost: {
            type: Number,
            default: 0,
        },
        platformFee: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            required: true,
        },
        notes: {
            type: String,
        },
        shipment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shipment",
            default: null,
        },
        logisticsDispatch: {
            company: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "LogisticsCompany",
                default: null,
            },
            companyName: { type: String, default: null },
            companyEmail: { type: String, default: null },
            deliveryFee: { type: Number, default: 0 },
            notifiedAt: { type: Date, default: null },
            status: {
                type: String,
                enum: ["notified", "acknowledged", "picked_up", "delivered"],
                default: "notified",
            },
        },
        deleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// Format total price
orderSchema.virtual("formattedTotal").get(function () {
    return `$${this.total.toFixed(2)}`;
});

// Ensure orderId is set before saving
orderSchema.pre("save", async function (next) {
    if (!this.orderId) {
        try {
            this.orderId = await getNextSequence("orderId");
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Index for efficient queries
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
