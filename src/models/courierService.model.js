import mongoose from "mongoose";

const courierServiceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        service_code: {
            type: String,
            required: true,
            unique: true,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        pin_image: {
            type: String,
        },
        origin_country: {
            type: String,
        },
        international: {
            type: Boolean,
        },
        domestic: {
            type: Boolean,
        },
        on_demand: {
            type: Boolean,
        },
        package_categories: [
            {
                id: Number,
                category: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

const CourierService = mongoose.model("CourierService", courierServiceSchema);

export default CourierService;
