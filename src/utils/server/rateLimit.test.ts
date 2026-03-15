import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request for a new user", () => {
    const result = checkRateLimit("user-A");
    expect(result.allowed).toBe(true);
  });

  it("allows up to 10 requests within the window", () => {
    const userId = `user-${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(userId).allowed).toBe(true);
    }
  });

  it("blocks the 11th request within the window", () => {
    const userId = `user-${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) {
      checkRateLimit(userId);
    }
    const result = checkRateLimit(userId);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the 1-minute window expires", () => {
    const userId = `user-${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) {
      checkRateLimit(userId);
    }
    // exhaust the limit
    expect(checkRateLimit(userId).allowed).toBe(false);

    // advance past the window
    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit(userId).allowed).toBe(true);
  });

  it("tracks separate limits per user", () => {
    const userA = `user-${crypto.randomUUID()}`;
    const userB = `user-${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) checkRateLimit(userA);

    expect(checkRateLimit(userA).allowed).toBe(false);
    expect(checkRateLimit(userB).allowed).toBe(true);
  });

  it("returns retryAfter in seconds when blocked", () => {
    const userId = `user-${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) checkRateLimit(userId);

    const result = checkRateLimit(userId);
    expect(result.allowed).toBe(false);
    expect(typeof result.retryAfter).toBe("number");
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });
});
