import mongoose from "mongoose";

const productViewedSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        count: {
            type: Number,
            default: 1,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Add index for faster queries
productViewedSchema.index({ product: 1, user: 1 }, { unique: true });

const ProductViewed = mongoose.model("ProductViewed", productViewedSchema);

export default ProductViewed;
