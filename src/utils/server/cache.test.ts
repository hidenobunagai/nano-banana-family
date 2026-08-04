import { generateCacheKey, imageGenerationCache } from "./cache";

describe("MemoryCache", () => {
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
});

describe("generateCacheKey", () => {
  it("generates consistent key", () => {
    const key = generateCacheKey({ b: "2", a: "1" });
    expect(key).toBe("a:1|b:2");
  });

  it("handles single values", () => {
    const key = generateCacheKey({ a: "1" });
    expect(key).toBe("a:1");
  });
});
