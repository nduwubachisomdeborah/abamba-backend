import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
            unique: true,
        },
        notification: {
            type: mongoose.Schema.Types.Mixed,
            default: {
                orderConfirmation: true,
                orderStatusChange: true,
                orderDelivered: true,
                emailNotification: true,
            },
        },
    },
    {
        timestamps: true,
    }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
