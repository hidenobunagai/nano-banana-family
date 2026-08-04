/**
 * Simple in-memory cache for API responses
 * Useful for caching repeated requests with same parameters
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 5 * 60 * 1000) {
    // Default: 5 minutes
    this.defaultTTL = defaultTTLMs;
  }

  /**
   * Get a cached value, lazily removing expired entries
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }
}

// Export singleton instance
export const imageGenerationCache = new MemoryCache(10 * 60 * 1000); // 10 minutes for image generation

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort();
  const keyParts = sortedKeys.map((key) => `${key}:${String(params[key])}`);
  return keyParts.join("|");
}
