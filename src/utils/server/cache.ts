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
   * Get a cached value
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

  /**
   * Delete a cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const imageGenerationCache = new MemoryCache(10 * 60 * 1000); // 10 minutes for image generation

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort();
  const keyParts = sortedKeys.map((key) => {
    const value = params[key];
    if (value instanceof File) {
      return `${key}:${value.name}:${value.size}`;
    }
    return `${key}:${String(value)}`;
  });
  return keyParts.join("|");
}

/**
 * Check if response is cacheable
 */
export function isCacheableResponse(response: unknown): boolean {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  // Don't cache error responses
  if ("error" in response) {
    return false;
  }

  return true;
}