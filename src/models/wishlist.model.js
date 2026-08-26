import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        addedAt: {
          type: Date,
          default: Date.now
        },
        notes: {
          type: String,
          trim: true,
          maxlength: 200
        }
      }
    ],
    name: {
      type: String,
      trim: true,
      default: 'Wishlist'
    },
    // For soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      select: false
    },
    deletedAt: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'products.product': 1 });

// Don't include deleted wishlists in queries by default
wishlistSchema.pre('find', function() {
  if (!this._conditions.hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: false });
  }
});

wishlistSchema.pre('findOne', function() {
  if (!this._conditions.hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: false });
  }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
