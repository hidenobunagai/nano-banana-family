import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";
import { checkRateLimit } from "@/utils/server/rateLimit";
import {
  validateImageFile,
  authenticateRequest,
  checkUserRateLimit,
  validateApiKey,
} from "./api-helpers";

// Mock the dependencies
vi.mock("@/auth", () => ({
  authOptions: {},
}));

vi.mock("@/utils/server/rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
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
        MAX_FILE_SIZE_MB,
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
        MAX_FILE_SIZE_MB,
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
        MAX_FILE_SIZE_MB,
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
        MAX_FILE_SIZE_MB,
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
        "2枚目の画像",
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("2枚目の画像");
    });
  });

  describe("authenticateRequest", () => {
    it("returns 401 JSON response when there is no session", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await authenticateRequest();
      expect("response" in result).toBe(true);
      if ("response" in result) {
        expect(result.response.status).toBe(401);
        const body = await result.response.json();
        expect(body.error).toBe("認証が必要です。");
      }
    });

    it("returns the session when authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "test@example.com" },
      });

      const result = await authenticateRequest();
      expect("session" in result).toBe(true);
      if ("session" in result) {
        expect(result.session.user?.email).toBe("test@example.com");
      }
    });
  });

  describe("checkUserRateLimit", () => {
    it("returns allowed when within the limit", () => {
      vi.mocked(checkRateLimit).mockReturnValue({ allowed: true });

      expect(checkUserRateLimit("user@example.com")).toEqual({ allowed: true });
    });

    it("returns 429 JSON response when rate limited", async () => {
      vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, retryAfter: 30 });

      const result = checkUserRateLimit("user@example.com");
      expect("response" in result).toBe(true);
      if ("response" in result) {
        expect(result.response.status).toBe(429);
        const body = await result.response.json();
        expect(body.error).toContain("30秒後");
      }
    });
  });

  describe("validateApiKey", () => {
    it("returns the key when set", () => {
      const previous = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "test-key";
      try {
        expect(validateApiKey()).toEqual({ key: "test-key" });
      } finally {
        if (previous === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = previous;
      }
    });

    it("returns 500 JSON response when missing", async () => {
      const previous = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      try {
        const result = validateApiKey();
        expect("response" in result).toBe(true);
        if ("response" in result) {
          expect(result.response.status).toBe(500);
          const body = await result.response.json();
          expect(body.error).toBe("Gemini API キーが設定されていません。");
        }
      } finally {
        if (previous !== undefined) process.env.GEMINI_API_KEY = previous;
      }
    });
  });
});
