import mongoose from "mongoose";

const itemShipmentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
    },
    service_code: {
        type: String,
    },
    carrierId: {
        type: String,
    },
    carrierName: {
        type: String,
    },
    carrierLogo: {
        type: String,
    },
    request_token: {
        type: String,
        required: true,
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
            required: true,
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
            (total, item) => total + item.quantity,
            0
        );
        this.totalPrice = this.items.reduce(
            (total, item) => total + item.price * item.quantity,
            0
        );
    } else {
        this.totalItems = 0;
        this.totalPrice = 0;
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
