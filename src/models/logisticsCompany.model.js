import mongoose from "mongoose";

const logisticsCompanySchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true }, // e.g. "richmond", "apex", "hens", "princeswift", "oksaturday"
        name: { type: String, required: true },
        email: { type: String, required: true }, // Linked dispatch email
        phone: { type: String, required: true },
        state: { type: String, enum: ["Imo", "Abia"], required: true },
        hub: { type: String, required: true }, // "Owerri Hub" or "Aba Hub"
        pricingType: {
            type: String,
            enum: ["location-matrix", "distance-zones"],
            required: true,
        },
        defaultBasePrice: { type: Number, default: 3000 },
        active: { type: Boolean, default: true }, // Admin Toggle
        bankDetails: {
            bankName: { type: String, default: "Zenith Bank" },
            accountNumber: { type: String, default: "0000000000" },
            accountName: { type: String, default: "" },
        },
        completedDeliveries: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 }, // Total delivery fees collected by Abamba for this company
        pendingPayout: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const LogisticsCompany = mongoose.model(
    "LogisticsCompany",
    logisticsCompanySchema
);

export default LogisticsCompany;
