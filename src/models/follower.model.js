import mongoose from "mongoose";

const followerSchema = new mongoose.Schema(
    {
        follower: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Follower user ID is required"],
        },
        following: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Following user ID is required"],
        },
        followedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure a user can only follow another user once
followerSchema.index({ follower: 1, following: 1 }, { unique: true });

// Index for efficient queries
followerSchema.index({ following: 1 }); // For getting followers of a user
followerSchema.index({ follower: 1 }); // For getting who a user is following

// Prevent users from following themselves
followerSchema.pre("save", function (next) {
    if (this.follower.toString() === this.following.toString()) {
        const error = new Error("Users cannot follow themselves");
        return next(error);
    }
    next();
});

const Follower = mongoose.model("Follower", followerSchema);

export default Follower;
