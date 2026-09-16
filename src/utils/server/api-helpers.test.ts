import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { validateImageFile, validateFormData, handleApiError } from "./api-helpers";
import { AppError } from "@/utils/errors";

vi.mock("@/utils/server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  },
}));

describe("api-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateImageFile", () => {
    it("should return valid for a valid image file", () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 * 1024 }); // 1MB

      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should return error for empty file", () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 0 });

      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("空の画像ファイルは処理できません。");
      expect(result.status).toBe(400);
    });

    it("should return error for file exceeding size limit", () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 }); // 10MB

      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("サイズが大きすぎます");
      expect(result.status).toBe(413);
    });

    it("should return error for unsupported mime type", () => {
      const file = new File(["test"], "test.gif", { type: "image/gif" });
      Object.defineProperty(file, "size", { value: 1024 * 1024 });

      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("サポートされていない画像形式");
      expect(result.status).toBe(415);
    });

    it("should include label in error messages when provided", () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 0 });

      const result = validateImageFile(file, "2枚目の画像");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("2枚目の画像");
    });
  });

  describe("validateFormData", () => {
    const schema = z.object({ name: z.string().min(1, "名前は必須です") });

    it("returns the parsed data when valid", () => {
      expect(validateFormData(schema, { name: "テスト" })).toEqual({
        success: true,
        data: { name: "テスト" },
      });
    });

    it("joins schema issues into a single error message", () => {
      const result = validateFormData(schema, { name: "" });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("名前は必須です");
    });
  });

  describe("handleApiError", () => {
    it("returns a JSON response with the AppError status and message", async () => {
      const res = handleApiError(new AppError("見つかりません", 404), "test-route", "user@media");

      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "見つかりません" });
    });

    it("falls back to a 500 for unexpected errors", async () => {
      const res = handleApiError(new Error("boom"), "test-route", "user@media");

      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toEqual({ error: "boom" });
    });
  });
});
