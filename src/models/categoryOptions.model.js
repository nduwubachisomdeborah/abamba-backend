import mongoose from "mongoose";

const optionValueSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        values: {
            type: [String],
            required: true,
        },
        type: {
            type: String,
            enum: ["color", "dropdown", "text"],
            default: "dropdown",
        },
        immutable: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const categoryOptionSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        options: {
            type: [optionValueSchema],
            required: true,
            default: [],
        },
        approved: {
            type: Boolean,
            default: false,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const CategoryOption = mongoose.model("CategoryOption", categoryOptionSchema);

export default CategoryOption;
