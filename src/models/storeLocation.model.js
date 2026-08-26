import mongoose from "mongoose";

const storeLocationSchema = new mongoose.Schema(
    {
        addressCode: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            trim: true,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        latitude: {
            type: Number,
            required: true,
        },
        longitude: {
            type: Number,
            required: true,
        },
        city: {
            type: String,
        },
        state: {
            type: String,
        },
        country: {
            type: String,
        },
        postalCode: {
            type: String,
        },
        firstName: {
            type: String,
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

const StoreLocation = mongoose.model("StoreLocation", storeLocationSchema);

export default StoreLocation;
