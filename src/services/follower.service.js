import Follower from "../models/follower.model.js";
import User from "../models/user.model.js";
import { AppError } from "../middlewares/error.js";

class FollowerService {
    /**
     * Follow a seller
     * @param {string} followerId - ID of the user who wants to follow
     * @param {string} sellerId - ID of the seller to follow
     * @returns {Promise<Object>} Follow relationship object
     */
    async followSeller(followerId, sellerId) {
        // Check if the seller exists and is actually a seller
        const seller = await User.findById(sellerId);

        if (!seller) {
            throw new AppError("Seller not found", 404);
        }

        if (seller.role !== "seller") {
            throw new AppError("You can only follow sellers", 400);
        }

        const follower = await User.findById(followerId);

        if (!follower || follower.isGuest) {
            throw new AppError("You must be logged in to follow a seller", 401);
        }

        // Check if already following
        const existingFollow = await Follower.findOne({
            follower: followerId,
            following: sellerId,
        });

        if (existingFollow) {
            throw new AppError("You are already following this seller", 400);
        }

        // Create follow relationship
        const follow = await Follower.create({
            follower: followerId,
            following: sellerId,
        });

        return await Follower.findById(follow._id)
            .populate("follower", "name email profilePicture")
            .populate("following", "name email profilePicture business");
    }

    /**
     * Unfollow a seller
     * @param {string} followerId - ID of the user who wants to unfollow
     * @param {string} sellerId - ID of the seller to unfollow
     * @returns {Promise<void>}
     */
    async unfollowSeller(followerId, sellerId) {
        const follow = await Follower.findOneAndDelete({
            follower: followerId,
            following: sellerId,
        });

        if (!follow) {
            throw new AppError("You are not following this seller", 400);
        }

        return follow;
    }

    /**
     * Check if a user is following a seller
     * @param {string} followerId - ID of the user
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<Object>} Object with isFollowing boolean and follow details if exists
     */
    async isFollowing(followerId, sellerId) {
        if (!followerId || !sellerId) {
            return { isFollowing: false, followDetails: null };
        }

        try {
            const follow = await Follower.findOne({
                follower: followerId,
                following: sellerId,
            }).select("followedAt");

            if (follow) {
                return {
                    isFollowing: true,
                    followDetails: {
                        followedAt: follow.followedAt,
                    },
                };
            }

            return { isFollowing: false, followDetails: null };
        } catch (error) {
            console.error("Error checking follow status:", error);
            return { isFollowing: false, followDetails: null };
        }
    }

    /**
     * Get followers of a seller
     * @param {string} sellerId - ID of the seller
     * @param {Object} options - Query options (page, limit)
     * @returns {Promise<Object>} Followers list with pagination
     */
    async getFollowers(sellerId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const [followers, total] = await Promise.all([
            Follower.find({ following: sellerId })
                .populate("follower", "name email profilePicture")
                .sort({ followedAt: -1 })
                .skip(skip)
                .limit(limit),
            Follower.countDocuments({ following: sellerId }),
        ]);

        return {
            followers: followers.map((f) => ({
                user: f.follower,
                followedAt: f.followedAt,
            })),
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        };
    }

    /**
     * Get sellers that a user is following
     * @param {string} userId - ID of the user
     * @param {Object} options - Query options (page, limit)
     * @returns {Promise<Object>} Following list with pagination
     */
    async getFollowing(userId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const [following, total] = await Promise.all([
            Follower.find({ follower: userId })
                .populate("following", "name email profilePicture business")
                .sort({ followedAt: -1 })
                .skip(skip)
                .limit(limit),
            Follower.countDocuments({ follower: userId }),
        ]);

        return {
            following: following.map((f) => ({
                seller: f.following,
                followedAt: f.followedAt,
            })),
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        };
    }

    /**
     * Get follower count for a seller
     * @param {string} sellerId - ID of the seller
     * @returns {Promise<number>} Number of followers
     */
    async getFollowerCount(sellerId) {
        try {
            return await Follower.countDocuments({ following: sellerId });
        } catch (error) {
            console.error("Error getting follower count:", error);
            return 0;
        }
    }

    /**
     * Get following count for a user
     * @param {string} userId - ID of the user
     * @returns {Promise<number>} Number of sellers the user is following
     */
    async getFollowingCount(userId) {
        try {
            return await Follower.countDocuments({ follower: userId });
        } catch (error) {
            console.error("Error getting following count:", error);
            return 0;
        }
    }
}

export default new FollowerService();
