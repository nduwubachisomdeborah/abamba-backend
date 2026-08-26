import mongoose from "mongoose";

// Define schema for tracking updates
const trackingUpdateSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            required: true,
            enum: [
                "information_received",
                "in_transit",
                "out_for_delivery",
                "delivered",
                "failed_attempt",
                "exception",
                "returned",
            ],
        },
        location: {
            type: String,
        },
        description: {
            type: String,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false },
);

// Main shipment schema
const shipmentSchema = new mongoose.Schema(
    {
        orders: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order",
                required: true,
            },
        ],
        carrier: {
            type: String,
            default: "ShipBubble",
        },
        trackingNumber: {
            type: String,
            required: true,
        },
        trackingUrl: {
            type: String,
        },
        status: {
            type: String,
            required: true,
            enum: ["pending", "in_transit", "delivered", "failed", "returned"],
            default: "pending",
        },
        trackingHistory: [trackingUpdateSchema],
        estimatedDelivery: {
            type: Date,
        },
        actualDelivery: {
            type: Date,
        },
        shippingMethod: {
            type: String,
            required: true,
            enum: [
                "standard",
                "express",
                "priority",
                "overnight",
                "international",
            ],
        },
        shippingCost: {
            type: Number,
            default: 0,
        },
        packageWeight: {
            type: Number,
        },
        packageDimensions: {
            length: Number,
            width: Number,
            height: Number,
            unit: {
                type: String,
                enum: ["in", "cm"],
                default: "in",
            },
        },
        notes: {
            type: String,
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

// Auto-update status based on tracking history
shipmentSchema.pre("save", function (next) {
    if (this.trackingHistory && this.trackingHistory.length > 0) {
        const latestUpdate =
            this.trackingHistory[this.trackingHistory.length - 1];

        // Map tracking update status to shipment status
        switch (latestUpdate.status) {
            case "information_received":
            case "in_transit":
                this.status = "in_transit";
                break;
            case "out_for_delivery":
                this.status = "in_transit";
                break;
            case "delivered":
                this.status = "delivered";
                this.actualDelivery = latestUpdate.timestamp;
                break;
            case "failed_attempt":
            case "exception":
                this.status = "failed";
                break;
            case "returned":
                this.status = "returned";
                break;
        }
    }
    next();
});

// Create indexes for efficient queries
shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ orders: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ carrier: 1 });
shipmentSchema.index({ createdAt: -1 });

const Shipment = mongoose.model("Shipment", shipmentSchema);

export default Shipment;
