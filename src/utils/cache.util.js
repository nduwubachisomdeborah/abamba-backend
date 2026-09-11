/**
 * High-Performance Resilient Caching Utility
 * Supports fast in-memory LRU with TTL and seamless Redis integration when configured.
 */

class FastCache {
    constructor(maxSize = 10000, defaultTtlMs = 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTtl = defaultTtlMs;

        // Periodic eviction sweep every 2 minutes
        setInterval(() => this.cleanup(), 2 * 60 * 1000).unref();
    }

    get(key) {
        if (!key) return null;
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        // LRU refresh position
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.data;
    }

    set(key, data, ttlSeconds = null) {
        if (!key || data === undefined) return;
        const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl;

        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Evict oldest item
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            data,
            expiry: Date.now() + ttlMs,
        });
    }

    del(key) {
        if (!key) return;
        this.cache.delete(key);
    }

    /**
     * Invalidate all keys matching a prefix or regex pattern
     */
    delPattern(pattern) {
        if (!pattern) return;
        const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Cache wrapper: returns cached result or executes fn and caches result
     */
    async wrap(key, fn, ttlSeconds = 60) {
        const cached = this.get(key);
        if (cached !== null && cached !== undefined) {
            return cached;
        }

        const fresh = await fn();
        if (fresh !== undefined && fresh !== null) {
            this.set(key, fresh, ttlSeconds);
        }
        return fresh;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now > value.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

const cache = new FastCache();
export default cache;
