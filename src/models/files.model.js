import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    metadata: {
        type: Object,
        default: {},
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    deleted: {
        type: Boolean,
        default: false,
        select: false,
    },
    deletedAt: {
        type: Date,
        default: null,
        select: false,
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

fileSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

fileSchema.pre("findOneAndUpdate", function (next) {
    this.updatedAt = Date.now();
    next();
});

fileSchema.pre("updateOne", function (next) {
    this.updatedAt = Date.now();
    next();
});

fileSchema.pre("updateMany", function (next) {
    this.updatedAt = Date.now();
    next();
});

fileSchema.pre("update", function (next) {
    this.updatedAt = Date.now();
    next();
});

const File = mongoose.model("File", fileSchema);

export default File;
