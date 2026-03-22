import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateImageFile, isAbortError } from "./api-helpers";

// Mock the dependencies
vi.mock("@/auth", () => ({
  authOptions: {},
}));

vi.mock("@/utils/server/rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));

describe("api-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateImageFile", () => {
    const mockResolveMimeType = vi.fn();
    const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
    const MAX_FILE_SIZE_MB = 8;

    it("should return valid for a valid image file", () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 * 1024 }); // 1MB

      mockResolveMimeType.mockReturnValue("image/jpeg");

      const result = validateImageFile(
        file,
        mockResolveMimeType,
        MAX_FILE_SIZE_BYTES,
        MAX_FILE_SIZE_MB
      );

      expect(result.valid).toBe(true);
    });

    it("should return error for empty file", () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 0 });

      const result = validateImageFile(
        file,
        mockResolveMimeType,
        MAX_FILE_SIZE_BYTES,
        MAX_FILE_SIZE_MB
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe("空の画像ファイルは処理できません。");
      expect(result.status).toBe(400);
    });

    it("should return error for file exceeding size limit", () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 }); // 10MB

      const result = validateImageFile(
        file,
        mockResolveMimeType,
        MAX_FILE_SIZE_BYTES,
        MAX_FILE_SIZE_MB
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("サイズが大きすぎます");
      expect(result.status).toBe(413);
    });

    it("should return error for unsupported mime type", () => {
      const file = new File(["test"], "test.gif", { type: "image/gif" });
      Object.defineProperty(file, "size", { value: 1024 * 1024 });

      mockResolveMimeType.mockReturnValue(null);

      const result = validateImageFile(
        file,
        mockResolveMimeType,
        MAX_FILE_SIZE_BYTES,
        MAX_FILE_SIZE_MB
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("サポートされていない画像形式");
      expect(result.status).toBe(415);
    });

    it("should include label in error messages when provided", () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 0 });

      const result = validateImageFile(
        file,
        mockResolveMimeType,
        MAX_FILE_SIZE_BYTES,
        MAX_FILE_SIZE_MB,
        "2枚目の画像"
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("2枚目の画像");
    });
  });

  describe("isAbortError", () => {
    it("should return true for AbortError", () => {
      const error = new Error("Request aborted");
      error.name = "AbortError";

      expect(isAbortError(error)).toBe(true);
    });

    it("should return false for regular Error", () => {
      const error = new Error("Regular error");

      expect(isAbortError(error)).toBe(false);
    });

    it("should return false for non-Error values", () => {
      expect(isAbortError("string error")).toBe(false);
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
      expect(isAbortError(123)).toBe(false);
    });
  });
});