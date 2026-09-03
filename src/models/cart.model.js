import mongoose from "mongoose";

const itemShipmentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        default: 3000,
    },
    price: {
        type: Number,
        default: 3000,
    },
    total: {
        type: Number,
        default: 3000,
    },
    fee: {
        type: Number,
        default: 3000,
    },
    service_code: {
        type: String,
        default: "richmond",
    },
    carrierId: {
        type: String,
        default: "richmond",
    },
    courier_id: {
        type: String,
        default: "richmond",
    },
    carrierName: {
        type: String,
        default: "RichmondLogistics (Standard Delivery)",
    },
    courier_name: {
        type: String,
        default: "RichmondLogistics (Standard Delivery)",
    },
    name: {
        type: String,
        default: "RichmondLogistics",
    },
    carrierLogo: {
        type: String,
        default: null,
    },
    request_token: {
        type: String,
        default: "REQ-REGIONAL",
    },
});

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variant: {
            type: String, // Using String type for variant ID
            default: null,
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity cannot be less than 1"],
            default: 1,
        },
        shipping: {
            type: itemShipmentSchema,
            required: false,
            default: () => ({
                amount: 3000,
                service_code: "richmond",
                carrierId: "richmond",
                carrierName: "RichmondLogistics",
                request_token: "REQ-REGIONAL",
            }),
        },
        price: {
            type: Number,
            required: true,
            min: [0, "Price cannot be negative"],
        },
    },
    { _id: true, timestamps: false }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        items: [cartItemSchema],
        totalItems: {
            type: Number,
            default: 0,
        },
        totalPrice: {
            type: Number,
            default: 0,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Update the cart totals when items are modified
cartSchema.pre("save", function (next) {
    if (this.items && this.items.length > 0) {
        this.totalItems = this.items.reduce(
            (total, item) => total + (Number(item.quantity) || 1),
            0
        );
        this.totalPrice = this.items.reduce(
            (total, item) =>
                total + (Number(item.price) || 0) * (Number(item.quantity) || 1),
            0
        );
    } else {
        this.totalItems = 0;
        this.totalPrice = 0;
    }
    if (isNaN(this.totalPrice) || typeof this.totalPrice !== "number") {
        this.totalPrice = 0;
    }
    if (isNaN(this.totalItems) || typeof this.totalItems !== "number") {
        this.totalItems = 0;
    }
    this.lastUpdated = Date.now();
    next();
});

// Virtual for formatted price
cartSchema.virtual("formattedTotalPrice").get(function () {
    return `$${this.totalPrice.toFixed(2)}`;
});

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
