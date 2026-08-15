import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resizeImage } from "./imageOptimization";

interface MockImageConfig {
  width: number;
  height: number;
  failLoad: boolean;
}

let mockImageConfig: MockImageConfig = { width: 100, height: 100, failLoad: false };

// jsdom does not implement URL.createObjectURL/revokeObjectURL
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  set src(_value: string) {
    queueMicrotask(() => {
      this.width = mockImageConfig.width;
      this.height = mockImageConfig.height;
      if (mockImageConfig.failLoad) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

const fakeCtx = {
  imageSmoothingEnabled: false,
  imageSmoothingQuality: "",
  drawImage: vi.fn(),
};

function createImageFile(name = "photo.png", type = "image/png"): File {
  return new File(["abc"], name, { type });
}

describe("resizeImage", () => {
  beforeEach(() => {
    mockImageConfig = { width: 100, height: 100, failLoad: false };
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal("Image", FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      fakeCtx as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      callback: BlobCallback,
    ) {
      callback(new Blob(["data"], { type: "image/png" }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("rejects non-image files", async () => {
    await expect(resizeImage(createImageFile("notes.txt", "text/plain"))).rejects.toThrow(
      "ファイルが画像ではありません。",
    );
  });

  it("rejects unsupported image types", async () => {
    await expect(resizeImage(createImageFile("anim.gif", "image/gif"))).rejects.toThrow(
      "サポートされていない画像形式です。",
    );
  });

  it("returns the original file when no resize is needed", async () => {
    const file = createImageFile();
    const result = await resizeImage(file);
    expect(result).toBe(file);
  });

  it("returns an optimized file when the image needs resizing", async () => {
    mockImageConfig = { width: 4000, height: 3000, failLoad: false };
    const file = createImageFile();
    const result = await resizeImage(file);

    expect(result).not.toBe(file);
    expect(result.name).toBe("photo.png");
    expect(result.type).toBe("image/png");
    expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("rejects when the canvas context is unavailable", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const file = createImageFile();
    await expect(resizeImage(file)).rejects.toThrow(
      "Canvas context を取得できませんでした。",
    );
  });

  it("rejects when the image fails to load", async () => {
    mockImageConfig = { width: 100, height: 100, failLoad: true };
    const file = createImageFile();
    await expect(resizeImage(file)).rejects.toThrow("画像の読み込みに失敗しました。");
  });
});
