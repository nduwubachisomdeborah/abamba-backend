import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Notification title is required"],
            trim: true,
            maxlength: 160,
        },
        description: {
            type: String,
            required: [true, "Notification description is required"],
            trim: true,
        },
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Notification recipient is required"],
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
