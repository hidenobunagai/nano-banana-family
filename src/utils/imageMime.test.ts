import { describe, expect, it } from "vitest";
import { ALLOWED_IMAGE_MIME_TYPES, resolveMimeType } from "./imageMime";

describe("resolveMimeType", () => {
  it("normalizes common JPEG variants", () => {
    const jpgFile = new File(["data"], "photo.jpg", { type: "image/jpg" });
    const pjpegFile = new File(["data"], "photo.jpg", { type: "image/pjpeg" });

    expect(resolveMimeType(jpgFile)).toBe("image/jpeg");
    expect(resolveMimeType(pjpegFile)).toBe("image/jpeg");
  });

  it("falls back to file extension when type is missing", () => {
    const file = new File(["data"], "photo.webp", { type: "" });

    expect(resolveMimeType(file)).toBe("image/webp");
  });

  it("returns null for unsupported formats", () => {
    const file = new File(["data"], "photo.gif", { type: "image/gif" });

    expect(resolveMimeType(file)).toBeNull();
  });

  it("exposes the allowed image types", () => {
    expect([...ALLOWED_IMAGE_MIME_TYPES]).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });
});
