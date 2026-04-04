import { generateCacheKey, isCacheableResponse, imageGenerationCache } from "./cache";

describe("MemoryCache", () => {
  beforeEach(() => {
    imageGenerationCache.clear();
  });

  it("returns null for missing key", () => {
    expect(imageGenerationCache.get("missing")).toBeNull();
  });

  it("stores and retrieves value", () => {
    imageGenerationCache.set("key1", "value1");
    expect(imageGenerationCache.get("key1")).toBe("value1");
  });

  it("returns null after expiration", () => {
    vi.useFakeTimers();
    imageGenerationCache.set("expiring", "data", 100);
    vi.advanceTimersByTime(150);
    expect(imageGenerationCache.get("expiring")).toBeNull();
    vi.useRealTimers();
  });

  it("deletes value", () => {
    imageGenerationCache.set("deleteme", "data");
    imageGenerationCache.delete("deleteme");
    expect(imageGenerationCache.get("deleteme")).toBeNull();
  });

  it("clears all values", () => {
    imageGenerationCache.set("a", 1);
    imageGenerationCache.set("b", 2);
    imageGenerationCache.clear();
    expect(imageGenerationCache.size).toBe(0);
  });

  it("clears expired entries", () => {
    vi.useFakeTimers();
    imageGenerationCache.set("valid", "data", 10000);
    imageGenerationCache.set("expired", "data", 100);
    vi.advanceTimersByTime(200);
    imageGenerationCache.clearExpired();
    expect(imageGenerationCache.get("valid")).toBe("data");
    expect(imageGenerationCache.get("expired")).toBeNull();
    vi.useRealTimers();
  });

  it("reports correct size", () => {
    imageGenerationCache.set("x", 1);
    imageGenerationCache.set("y", 2);
    expect(imageGenerationCache.size).toBe(2);
  });
});

describe("generateCacheKey", () => {
  it("generates consistent key", () => {
    const key = generateCacheKey({ b: "2", a: "1" });
    expect(key).toBe("a:1|b:2");
  });

  it("handles nested objects", () => {
    const key = generateCacheKey({ a: "1" });
    expect(key).toBe("a:1");
  });
});

describe("isCacheableResponse", () => {
  it("returns true for success response", () => {
    expect(isCacheableResponse({ imageBase64: "abc", mimeType: "image/png" })).toBe(true);
  });

  it("returns false for error response", () => {
    expect(isCacheableResponse({ error: "something failed" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isCacheableResponse(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isCacheableResponse("string")).toBe(false);
    expect(isCacheableResponse(42)).toBe(false);
  });
});
