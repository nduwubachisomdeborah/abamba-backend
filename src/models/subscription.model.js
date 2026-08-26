import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'unsubscribed'],
      default: 'pending'
    },
    confirmationToken: {
      type: String
    },
    confirmationExpires: {
      type: Date
    },
    unsubscribeToken: {
      type: String
    },
    subscribedAt: {
      type: Date,
      default: Date.now
    },
    confirmedAt: {
      type: Date
    },
    unsubscribedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ confirmationToken: 1 });
subscriptionSchema.index({ unsubscribeToken: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
