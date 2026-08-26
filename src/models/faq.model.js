import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: [true, "Question is required"],
            trim: true,
        },
        answer: {
            type: String,
            required: [true, "Answer is required"],
            trim: true,
        },
        category: {
            type: String,
            trim: true,
            default: "General",
        },
        order: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        deleted: {
            type: Boolean,
            default: false,
            select: false,
        },
        deletedAt: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for better query performance
faqSchema.index({ category: 1, order: 1 });
faqSchema.index({ isPublished: 1 });

const FAQ = mongoose.model("FAQ", faqSchema);

export default FAQ;
