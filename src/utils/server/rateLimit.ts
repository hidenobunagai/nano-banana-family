/**
 * In-memory sliding window rate limiter (best-effort on serverless).
 * Warm instances share state between requests; cold starts reset the counter.
 * Sufficient for a family-only app where strict enforcement is not required.
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10; // per user per window
const PRUNE_THRESHOLD = 1000; // prune expired entries above this size

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function pruneExpired(now: number): void {
  if (store.size < PRUNE_THRESHOLD) return;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the limit resets (only set when not allowed) */
  retryAfter?: number;
}

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);
  const entry = store.get(userId);

  if (!entry || now > entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
