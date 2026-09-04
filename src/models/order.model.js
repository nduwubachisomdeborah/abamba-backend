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
            default: "N/A",
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
    { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Virtual for total item price (price * quantity)
orderItemSchema.virtual("totalPrice").get(function () {
    return Number(((this.price || 0) * (this.quantity || 1)).toFixed(2));
});

orderItemSchema.virtual("formattedPrice").get(function () {
    return `₦${Number(this.price || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
});

orderItemSchema.virtual("formattedTotalPrice").get(function () {
    const total = (this.price || 0) * (this.quantity || 1);
    return `₦${Number(total).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
});

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
            required: false,
            default: "000000",
        },
        country: {
            type: String,
            required: false,
            default: "NG",
        },
        phoneNumber: {
            type: String,
            required: false,
            default: "0000000000",
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
            default: "bank_transfer",
            required: false,
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
                "paid",
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
        logistics: {
            courierId: { type: String, default: null },
            courierName: { type: String, default: null },
            courierEmail: { type: String, default: null },
            shippingFee: { type: Number, default: 3000 },
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "completed", "failed", "refunded"],
            default: "pending",
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
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Virtuals for formatted currency values
orderSchema.virtual("formattedSubtotal").get(function () {
    return `₦${Number(this.subtotal || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
});

orderSchema.virtual("formattedShippingCost").get(function () {
    return `₦${Number(this.shippingCost || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
});

orderSchema.virtual("formattedPlatformFee").get(function () {
    return `₦${Number(this.platformFee || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
});

orderSchema.virtual("formattedTotal").get(function () {
    return `₦${Number(this.total || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
});

// Virtual for seller earnings (seller receives subtotal; shipping goes to logistics and platformFee to platform)
orderSchema.virtual("sellerEarnings").get(function () {
    return Number((this.subtotal || 0).toFixed(2));
});

orderSchema.virtual("formattedSellerEarnings").get(function () {
    return `₦${Number(this.subtotal || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
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
