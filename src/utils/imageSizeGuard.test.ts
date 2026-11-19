import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fitFormDataImagesWithinTotalSize,
  fitImagesWithinTotalSize,
  TOTAL_IMAGE_SIZE_ERROR,
  totalFileSize,
} from "./imageSizeGuard";

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

function createSizedJpegFile(name: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
}

describe("imageSizeGuard", () => {
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
      callback(new Blob(["data"], { type: "image/jpeg" }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("returns the files unchanged when the total already fits", async () => {
    const files = [createSizedJpegFile("a.jpg", 8), createSizedJpegFile("b.jpg", 8)];
    const result = await fitImagesWithinTotalSize(files, 100);
    expect(result).toEqual(files);
    expect(result[0]).toBe(files[0]);
  });

  it("shrinks oversized images until the total fits", async () => {
    mockImageConfig = { width: 4000, height: 3000, failLoad: false };
    const files = [createSizedJpegFile("a.jpg", 60), createSizedJpegFile("b.jpg", 60)];
    const result = await fitImagesWithinTotalSize(files, 100);
    expect(totalFileSize(result)).toBeLessThanOrEqual(100);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("a.jpg");
  });

  it("throws a user-facing error when even the smallest step cannot fit", async () => {
    // 100x100 images are below every fit step, so resizing returns them as-is.
    const files = [createSizedJpegFile("a.jpg", 60), createSizedJpegFile("b.jpg", 60)];
    await expect(fitImagesWithinTotalSize(files, 100)).rejects.toThrow(TOTAL_IMAGE_SIZE_ERROR);
  });

  it("returns the same FormData when the images already fit", async () => {
    const formData = new FormData();
    formData.append("prompt", "hello");
    formData.append("images", createSizedJpegFile("a.jpg", 8));
    const result = await fitFormDataImagesWithinTotalSize(formData, 100);
    expect(result).toBe(formData);
  });

  it("replaces oversized images in FormData and keeps the text fields", async () => {
    mockImageConfig = { width: 4000, height: 3000, failLoad: false };
    const formData = new FormData();
    formData.append("prompt", "hello");
    formData.append("images", createSizedJpegFile("a.jpg", 60));
    formData.append("images", createSizedJpegFile("b.jpg", 60));
    const result = await fitFormDataImagesWithinTotalSize(formData, 100);
    expect(result).not.toBe(formData);
    expect(result.get("prompt")).toBe("hello");
    const fitted = result.getAll("images") as File[];
    expect(fitted).toHaveLength(2);
    expect(totalFileSize(fitted)).toBeLessThanOrEqual(100);
  });
});
