import mongoose from "mongoose";

const bannerAdSchema = new mongoose.Schema(
    {
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        storeName: {
            type: String,
            trim: true,
            default: "",
        },
        packageId: {
            type: String,
            enum: ["flash_48h", "growth_7w", "mega_1m"],
            required: true,
        },
        amountPaid: {
            type: Number,
            required: true,
            default: 0,
        },
        paymentReference: {
            type: String,
            required: true,
            trim: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        photoUrl: {
            type: String,
            required: true,
            trim: true,
        },
        catchphrase: {
            type: String,
            required: true,
            maxlength: 40,
            trim: true,
        },
        buttonLink: {
            type: String,
            required: true,
            trim: true,
        },
        approvalStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        durationHours: {
            type: Number,
            default: 48,
        },
        startDate: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        rejectionReason: {
            type: String,
            default: null,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// High performance compound indexes for public homepage banner fetching and seller querying
bannerAdSchema.index({ approvalStatus: 1, isActive: 1, expiresAt: 1 });
bannerAdSchema.index({ sellerId: 1, createdAt: -1 });

const BannerAd = mongoose.model("BannerAd", bannerAdSchema);

export default BannerAd;

