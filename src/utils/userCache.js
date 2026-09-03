/**
 * High-Performance In-Memory & Distributed Cache for Users
 * Provides fast O(1) lookups, LRU auto-eviction, and TTL expiration
 */
class UserCache {
    constructor(maxSize = 5000, ttlMs = 5 * 60 * 1000) {
        this.data = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlMs;

        // Auto clean expired items every 10 minutes to maintain lean memory
        setInterval(() => this.cleanup(), 10 * 60 * 1000).unref();
    }

    get(userId) {
        if (!userId) return null;
        const key = userId.toString();
        const entry = this.data.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.data.delete(key);
            return null;
        }

        // LRU update: refresh position
        this.data.delete(key);
        this.data.set(key, entry);

        return entry.user;
    }

    set(userId, user) {
        if (!userId || !user) return;
        const key = userId.toString();

        if (this.data.has(key)) {
            this.data.delete(key);
        } else if (this.data.size >= this.maxSize) {
            // Evict oldest item
            const oldestKey = this.data.keys().next().value;
            this.data.delete(oldestKey);
        }

        this.data.set(key, {
            user,
            expiry: Date.now() + this.ttl,
        });
    }

    invalidate(userId) {
        if (!userId) return;
        this.data.delete(userId.toString());
    }

    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.data.entries()) {
            if (now > value.expiry) {
                this.data.delete(key);
            }
        }
    }
}

const userCache = new UserCache();
export default userCache;
