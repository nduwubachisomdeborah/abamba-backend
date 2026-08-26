/**
 * Simple in-memory cache for users to reduce database queries
 * Provides methods to get, set, and invalidate user data
 */
const userCache = {
    data: new Map(),
    maxSize: 100, // Maximum number of users to keep in cache
    ttl: 5 * 60 * 1000, // Time to live: 5 minutes in milliseconds

    // Get user from cache
    get(userId) {
        const entry = this.data.get(userId);
        if (!entry) return null;

        // Check if entry has expired
        if (Date.now() > entry.expiry) {
            this.data.delete(userId);
            return null;
        }

        return entry.user;
    },

    // Set user in cache
    set(userId, user) {
        // If cache is at max size, remove the oldest entry
        if (this.data.size >= this.maxSize) {
            const oldestKey = this.data.keys().next().value;
            this.data.delete(oldestKey);
        }

        this.data.set(userId, {
            user,
            expiry: Date.now() + this.ttl,
        });
    },

    // Invalidate a user in the cache (e.g., after password change)
    invalidate(userId) {
        this.data.delete(userId);
    },
};

export default userCache;
