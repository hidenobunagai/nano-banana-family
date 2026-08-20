import { fileFingerprint, generateCacheKey, imageGenerationCache } from "./cache";

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
  it("generates consistent key regardless of property order", () => {
    const key = generateCacheKey({ b: "2", a: "1" });
    expect(key).toBe(
      JSON.stringify([
        ["a", "1"],
        ["b", "2"],
      ]),
    );
  });

  it("distinguishes delimiter-like values from separate keys", () => {
    const combined = generateCacheKey({ prompt: "a|b", images: [] });
    const separate = generateCacheKey({ prompt: "a", images: ["b"] });
    expect(combined).not.toBe(separate);
  });

  it("serializes array values", () => {
    const key = generateCacheKey({ images: ["x.png:1:image/png"] });
    expect(key).toBe(JSON.stringify([["images", ["x.png:1:image/png"]]]));
  });
});

describe("fileFingerprint", () => {
  it("distinguishes files with identical name/size/type but different content", async () => {
    const sameMetadata = (bytes: number[]) =>
      new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" });
    const a = sameMetadata([1, 2, 3]);
    const b = sameMetadata([4, 5, 6]);

    expect(a.size).toBe(b.size);
    expect(a.type).toBe(b.type);
    expect(await fileFingerprint(a)).not.toBe(await fileFingerprint(b));
  });

  it("is stable for identical content", async () => {
    const a = new File(["same bytes"], "a.png", { type: "image/png" });
    const b = new File(["same bytes"], "b.png", { type: "image/png" });

    expect(await fileFingerprint(a)).toBe(await fileFingerprint(b));
  });
});
