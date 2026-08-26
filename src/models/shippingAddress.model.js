import mongoose from "mongoose";

const shippingAddressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    addressId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    name: String,
    email: String,
    phone: String,
    address: String,
    longitude: Number,
    latitude: Number,
    validated: mongoose.Schema.Types.Mixed,
    validatedAt: {
        type: Date,
        default: Date.now,
    },
});

const ShippingAddress = mongoose.model(
    "ShippingAddress",
    shippingAddressSchema
);

export default ShippingAddress;
