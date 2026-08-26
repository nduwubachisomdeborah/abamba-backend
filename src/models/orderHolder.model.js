import mongoose from "mongoose";

const orderHolderSchema = new mongoose.Schema(
    {
        orderId: {
            type: Number,
            unique: true,
            index: true,
            sparse: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        orders: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order",
                required: true,
            },
        ],
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null,
        },
        addressId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User.addresses",
            default: null,
        },
        shippingAddress: {
            fullName: String,
            addressLine1: String,
            addressLine2: String,
            city: String,
            state: String,
            zipCode: String,
            country: String,
            phoneNumber: String,
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
        provider: {
            type: String,
            enum: ["paystack", "funz", "manual", "other"],
            default: "paystack",
        },
        subtotal: { type: Number, required: true },
        shippingCost: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        currency: { type: String, default: process.env.CURRENCY || "NGN" },
        status: {
            type: String,
            enum: ["pending", "paid", "failed", "cancelled", "refunded"],
            default: "pending",
            index: true,
        },
        notes: { type: String },
        metadata: { type: Object, default: {} },
    },
    { timestamps: true }
);

// Counter collection for auto-incrementing sequences
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});
// Use a unique model name to avoid collisions with any other Counter models
const OrderHolderCounter =
    mongoose.models.OrderHolderCounter ||
    mongoose.model("OrderHolderCounter", counterSchema);

// Auto-increment orderId starting at 1 on create
orderHolderSchema.pre("save", async function (next) {
    try {
        if (this.isNew && (this.orderId === undefined || this.orderId === null)) {
            const counter = await OrderHolderCounter.findOneAndUpdate(
                { _id: "orderHolder" },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.orderId = counter.seq || 1;
        }
        next();
    } catch (err) {
        next(err);
    }
});

const OrderHolder = mongoose.model("OrderHolder", orderHolderSchema);

export default OrderHolder;
