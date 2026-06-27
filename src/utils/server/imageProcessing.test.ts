import { describe, it, expect, vi, beforeEach } from "vitest";
import { filesToParts, fetchOgImage } from "./imageProcessing";

function createMockFile(
  content: string,
  name: string,
  type: string,
  size?: number,
): File {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }
  return file;
}

describe("filesToParts", () => {
  it("converts files to parts", async () => {
    const file = createMockFile("fake-image-data", "test.png", "image/png");
    const result = await filesToParts([file]);
    expect("parts" in result).toBe(true);
    if ("parts" in result) {
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]).toHaveProperty("inlineData");
      expect(result.parts[0].inlineData?.mimeType).toBe("image/png");
      expect(result.parts[0].inlineData?.data).toBeTruthy();
    }
  });

  it("returns error for invalid file type", async () => {
    const file = createMockFile("data", "test.gif", "image/gif");
    const result = await filesToParts([file]);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(415);
    }
  });

  it("returns error for empty file", async () => {
    const file = createMockFile("", "empty.png", "image/png");
    const result = await filesToParts([file]);
    expect("error" in result).toBe(true);
  });

  it("returns error for oversized file", async () => {
    const file = createMockFile("x".repeat(9 * 1024 * 1024), "big.png", "image/png", 9 * 1024 * 1024);
    const result = await filesToParts([file]);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(413);
    }
  });

  it("handles multiple files", async () => {
    const file1 = createMockFile("a", "a.png", "image/png");
    const file2 = createMockFile("b", "b.jpg", "image/jpeg");
    const result = await filesToParts([file1, file2]);
    expect("parts" in result).toBe(true);
    if ("parts" in result) {
      expect(result.parts).toHaveLength(2);
    }
  });
});

describe("fetchOgImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and returns image data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("fake-image-bytes", {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const result = await fetchOgImage("https://example.com/og.jpg");
    expect(result).not.toBeNull();
    expect(result?.base64).toBe(Buffer.from("fake-image-bytes").toString("base64"));
    expect(result?.mimeType).toBe("image/jpeg");
  });

  it("returns null for non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404 }),
    );
    const result = await fetchOgImage("https://example.com/404");
    expect(result).toBeNull();
  });

  it("returns null for non-image content type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("text", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    const result = await fetchOgImage("https://example.com/page");
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    const result = await fetchOgImage("https://example.com/og.jpg");
    expect(result).toBeNull();
  });
});
