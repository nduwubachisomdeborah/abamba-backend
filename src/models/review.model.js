import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "Review must belong to a product"],
        },
        variant: {
            type: String,  // Using String type for variant ID
            default: null
        },
        // This will be populated by the hook
        variantDetails: {
            type: Object,
            default: null
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Review must belong to a user"],
        },
        rating: {
            type: Number,
            required: [true, "Review must have a rating"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
        },
        title: {
            type: String,
            trim: true,
            maxlength: [100, "Review title cannot exceed 100 characters"],
        },
        comment: {
            type: String,
            required: [true, "Review must have a comment"],
            trim: true,
            maxlength: [1000, "Review comment cannot exceed 1000 characters"],
        },
        photos: [
            {
                url: {
                    type: String,
                    required: true,
                },
                caption: {
                    type: String,
                    default: "Product review photo",
                },
            },
        ],
        verified: {
            type: Boolean,
            default: false,
        },
        helpful: {
            count: {
                type: Number,
                default: 0,
            },
            users: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
            ],
        },
        unhelpful: {
            count: {
                type: Number,
                default: 0,
            },
            users: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
            ],
        },
        reply: {
            content: String,
            createdAt: Date,
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        },
        status: {
            type: String,
            enum: ["published", "pending", "rejected"],
            default: "published",
        },
        deleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for faster queries
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ user: 1 });

// Static method to calculate average rating for a product
reviewSchema.statics.calcAverageRating = async function (productId) {
    const stats = await this.aggregate([
        {
            $match: { 
                product: new mongoose.Types.ObjectId(productId),
                deleted: false,
                status: "published"
            },
        },
        {
            $group: {
                _id: "$product",
                numReviews: { $sum: 1 },
                avgRating: { $avg: "$rating" },
            },
        },
    ]);

    // Update the product with the calculated statistics
    if (stats.length > 0) {
        await mongoose.model("Product").findByIdAndUpdate(productId, {
            numReviews: stats[0].numReviews,
            rating: Math.round(stats[0].avgRating * 10) / 10, // Round to 1 decimal place
        });
    } else {
        // If no reviews, set default values
        await mongoose.model("Product").findByIdAndUpdate(productId, {
            numReviews: 0,
            rating: 0,
        });
    }
};

// Call calcAverageRating after save
reviewSchema.post("save", function () {
    // this.constructor refers to the Review model
    this.constructor.calcAverageRating(this.product);
});

// Hook to populate variant details from product
reviewSchema.pre(/^find/, async function(next) {
    // First let Mongoose populate the product and user references
    this.populate({
        path: 'product',
        select: 'name variants'
    }).populate({
        path: 'user',
        select: 'name email'
    });
    
    next();
});

// After population, add variant details if needed
reviewSchema.post(/^find/, async function(docs) {
    // Handle both single doc and array of docs
    if (!docs) return;
    
    if (!Array.isArray(docs)) {
        // Single document
        if (docs.variant && docs.product && docs.product.variants) {
            const variant = docs.product.variants.id(docs.variant);
            if (variant) {
                docs.variantDetails = variant.toObject();
            }
        }
    } else {
        // Array of documents
        docs.forEach(doc => {
            if (doc.variant && doc.product && doc.product.variants) {
                const variant = doc.product.variants.id(doc.variant);
                if (variant) {
                    doc.variantDetails = variant.toObject();
                }
            }
        });
    }
});

// Call calcAverageRating after update
reviewSchema.post(/^findOneAnd/, async function (doc) {
    if (doc) {
        await doc.constructor.calcAverageRating(doc.product);
    }
});

// Call calcAverageRating before removal
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.r = await this.model.findOne(this.getQuery());
    next();
});

reviewSchema.post(/^findOneAnd/, async function () {
    if (this.r) {
        await this.r.constructor.calcAverageRating(this.r.product);
    }
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;
