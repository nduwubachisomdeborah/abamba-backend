import mongoose from "mongoose";

const shippingOptionsSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        request_token: {
            type: String,
            required: true,
        },
        service_code: {
            type: String,
        },
        courier_id: {
            type: String,
        },
        courier_name: {
            type: String,
        },
        data: mongoose.Schema.Types.Mixed,
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
        },
        variant: {
            type: String, // Variant ID
            default: null,
        },
        quantity: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    },
);

const ShippingOptions = mongoose.model(
    "ShippingOptions",
    shippingOptionsSchema,
);

export default ShippingOptions;
