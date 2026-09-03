import mongoose from "mongoose";
import CategoryOption from "./categoryOptions.model.js";

// Define variant schema for product variations
const variantSchema = new mongoose.Schema({
    attributes: {
        type: Map,
        of: String,
        required: [true, "Variant attributes are required"],
        default: {},
    },
    price: {
        type: Number,
        required: [true, "Please provide variant price"],
        min: [0, "Price must be a positive number"],
    },
    promoPrice: {
        type: Number,
        min: [0, "Promotional price must be a positive number"],
        default: null,
    },
    bonusPrice: {
        type: Number,
        min: [0, "Bonus price must be a positive number"],
        default: null,
    },
    quantity: {
        type: Number,
        required: [true, "Please provide variant quantity"],
        min: [0, "Quantity cannot be negative"],
        default: 0,
    },
    weight: {
        type: Number,
        required: [true, "Please provide variant weight"],
        min: [0, "Weight cannot be negative"],
        default: 0,
    },
    sku: {
        type: String,
        trim: true,
    },
    images: [
        {
            url: {
                type: String,
                required: true,
            },
            altText: {
                type: String,
                default: "Variant image",
            },
        },
    ],
    inStock: {
        type: Boolean,
        default: true,
    },
});

// Convert Map attributes to plain objects for serialization
variantSchema.set("toJSON", {
    transform: function (doc, ret) {
        if (ret.attributes instanceof Map) {
            ret.attributes = Object.fromEntries(ret.attributes);
        }
        return ret;
    },
});

variantSchema.set("toObject", {
    transform: function (doc, ret) {
        if (ret.attributes instanceof Map) {
            ret.attributes = Object.fromEntries(ret.attributes);
        }
        return ret;
    },
});

const productStatusSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    rejectedAt: {
        type: Date,
        default: null,
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    rejectedReason: {
        type: String,
        trim: true,
        default: null,
    },
});

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide product name"],
            trim: true,
            maxlength: [100, "Product name cannot exceed 100 characters"],
        },
        description: {
            type: String,
            required: [true, "Please provide product description"],
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },
        basePrice: {
            type: Number,
            required: [true, "Please provide base product price"],
            min: [0, "Price must be a positive number"],
        },
        weight: {
            type: Number,
            required: [true, "Please provide product weight"],
            min: [0, "Weight must be a positive number"],
        },
        quantity: {
            type: Number,
            required: [true, "Please provide product quantity"],
            min: [0, "Quantity cannot be negative"],
        },
        promoPrice: {
            type: Number,
            min: [0, "Promotional price must be a positive number"],
            default: null,
        },
        bonusPrice: {
            type: Number,
            min: [0, "Bonus price must be a positive number"],
            default: null,
        },
        onSale: {
            type: Boolean,
            default: false,
        },
        saleStartDate: {
            type: Date,
            default: null,
        },
        saleEndDate: {
            type: Date,
            default: null,
        },
        expiryDate: {
            type: Date,
            default: null,
        },
        category: {
            type: String,
            required: [true, "Please provide product category"],
            trim: true,
            lowercase: true,
        },
        brand: {
            type: String,
            trim: true,
        },
        images: [
            {
                url: {
                    type: String,
                    required: true,
                },
                altText: {
                    type: String,
                    default: "Product image",
                },
            },
        ],
        featured: {
            type: Boolean,
            default: false,
        },
        rating: {
            type: Number,
            default: 0,
            min: [0, "Rating must be at least 0"],
            max: [5, "Rating cannot exceed 5"],
        },
        numReviews: {
            type: Number,
            default: 0,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        variants: [variantSchema],
        hasVariants: {
            type: Boolean,
            default: false,
        },
        isDummy: {
            type: Boolean,
            default: false,
        },
        lowStockAlert: {
            type: Number,
            default: null,
        },
        deleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
            select: false,
        },
        approved: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "disabled"],
            default: "pending",
        },
        rejectedAt: {
            type: Date,
            default: null,
            select: false,
        },
        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            select: false,
        },
        rejectedReason: {
            type: String,
            trim: true,
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
            select: false,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            select: false,
        },
        disabled: {
            type: Boolean,
            default: false,
            select: false,
        },
        disabledAt: {
            type: Date,
            default: null,
            select: false,
        },
        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            select: false,
        },
        disabledReason: {
            type: String,
            trim: true,
            default: null,
            select: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Add index for faster queries
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ "variants.price": 1 });
productSchema.index({ rating: -1 });
productSchema.index({ featured: 1 });
productSchema.index({ brand: 1 });

// Virtual for formatted base price with currency
productSchema.virtual("formattedBasePrice").get(function () {
    return `₦${(this.basePrice || 0)?.toFixed(2)}`;
});

// Virtual to check if promo is currently active based on dates
productSchema.virtual("promoActive").get(function () {
    if (!this.onSale || !this.promoPrice) {
        return false;
    }

    const now = new Date();

    // If no start date is set, or start date is in the past
    const hasStarted = !this.saleStartDate || now >= this.saleStartDate;

    // If no end date is set, or end date is in the future
    const hasNotEnded = !this.saleEndDate || now <= this.saleEndDate;

    return hasStarted && hasNotEnded;
});

// Virtual for formatted promo price if promo is active
productSchema.virtual("formattedPromoPrice").get(function () {
    if (this.promoActive && this.promoPrice) {
        return `₦${this.promoPrice.toFixed(2)}`;
    }
    return null;
});

// Virtual to calculate total quantity across all variants
productSchema.virtual("totalQuantity").get(function () {
    if (!this.hasVariants || !this.variants || this.variants.length === 0) {
        return this.quantity;
    }
    return (
        this.variants.reduce((total, variant) => total + variant.quantity, 0) +
        this.quantity
    );
});

// Virtual to check if product is available (any variant in stock)
productSchema.virtual("isAvailable").get(function () {
    if (!this.hasVariants || !this.variants || this.variants.length === 0) {
        return false;
    }
    return this.variants.some(
        (variant) => variant.inStock && variant.quantity > 0
    );
});

// Get lowest price from all variants
productSchema.virtual("lowestPrice").get(function () {
    if (!this.hasVariants || !this.variants || this.variants.length === 0) {
        return this.basePrice;
    }
    const prices = this.variants.map((variant) => variant.price);
    return Math.min(...prices);
});

// Get highest price from all variants
productSchema.virtual("highestPrice").get(function () {
    if (!this.hasVariants || !this.variants || this.variants.length === 0) {
        return this.basePrice;
    }
    const prices = this.variants.map((variant) => variant.price);
    return Math.max(...prices);
});

// Method to get available variants
productSchema.methods.getAvailableVariants = function () {
    if (!this.hasVariants || !this.variants) {
        return [];
    }
    return this.variants.filter(
        (variant) => variant.inStock && variant.quantity > 0
    );
};

// Pre-save hook to update variant inStock status and check promotion status
productSchema.pre("save", function (next) {
    // Update variant inStock status
    if (this.variants && this.variants.length > 0) {
        this.hasVariants = true;
        this.variants.forEach((variant) => {
            variant.inStock = variant.quantity > 0;
        });
    } else {
        this.hasVariants = false;
    }

    // Check and update onSale status based on dates
    if (this.promoPrice) {
        const now = new Date();

        // If sale has start date and it's in the future, product is not on sale yet
        if (this.saleStartDate && now < this.saleStartDate) {
            this.onSale = false;
        }
        // If sale has end date and it's in the past, sale has ended
        else if (this.saleEndDate && now > this.saleEndDate) {
            this.onSale = false;
        }
        // Otherwise, if there's a promo price, product is on sale
        else {
            this.onSale = true;
        }
    } else {
        // No promo price, no sale
        this.onSale = false;
    }

    next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;
