import mongoose from "mongoose";

const adminPermissionSchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
            unique: true,
        },
        pages: {
            type: [String],
            default: [],
        },
        full: {
            type: Boolean,
            default: false,
            description:
                "When true, admin has full page access regardless of pages list",
        },
    },
    { timestamps: true }
);

adminPermissionSchema.index({ admin: 1 }, { unique: true });

const AdminPermission = mongoose.model(
    "AdminPermission",
    adminPermissionSchema
);

export default AdminPermission;
