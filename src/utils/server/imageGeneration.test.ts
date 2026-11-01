import { describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", async () => {
  // The real enum and error classes are needed: the mapping keys off the
  // SDK's own status codes and block reasons.
  const actual = await vi.importActual<typeof import("@google/genai")>("@google/genai");
  const MockGenAI = class {
    models = { generateContent: mockGenerateContent };
  };
  return { ...actual, GoogleGenAI: MockGenAI };
});

vi.mock("@/utils/server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { ApiError, BlockedReason, FinishReason } from "@google/genai";

import { GENERATION_ERROR_MESSAGES } from "@/utils/generationErrorMessages";
import { generateImage } from "./imageGeneration";

function imageResponse(base64: string | undefined, mimeType = "image/png"): unknown {
  return {
    candidates: [
      {
        content: {
          parts: base64
            ? [{ inlineData: { data: base64, mimeType } }]
            : [{ text: "sorry, no image" }],
        },
      },
    ],
  };
}

describe("generateImage", () => {
  it("returns the validated image payload on success", async () => {
    mockGenerateContent.mockResolvedValue(imageResponse("base64-data"));

    const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

    expect(result).toEqual({ imageBase64: "base64-data", mimeType: "image/png" });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
        contents: [{ role: "user", parts: [{ text: "prompt" }] }],
      }),
    );
  });

  it("defaults the mime type to image/png when absent", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: "base64-data" } }],
          },
        },
      ],
    });

    const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

    expect(result).toEqual({ imageBase64: "base64-data", mimeType: "image/png" });
  });

  it("returns an error descriptor when Gemini returns no image", async () => {
    mockGenerateContent.mockResolvedValue(imageResponse(undefined));

    const result = await generateImage(
      "test-key",
      [{ text: "prompt" }],
      "画像の生成に失敗しました。",
    );

    expect(result).toEqual({ error: "画像の生成に失敗しました。", status: 502 });
  });

  it("propagates unexpected errors", async () => {
    mockGenerateContent.mockRejectedValue(new Error("network down"));

    await expect(generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ")).rejects.toThrow(
      "network down",
    );
  });

  it("passes the abort signal to the client config", async () => {
    mockGenerateContent.mockResolvedValue(imageResponse("base64-data"));
    const signal = new AbortController().signal;

    await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ", signal);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ config: { abortSignal: signal } }),
    );
  });

  it("returns a 504 timeout error when the signal aborts", async () => {
    const controller = new AbortController();
    mockGenerateContent.mockRejectedValueOnce(new Error("aborted"));

    const promise = generateImage(
      "test-key",
      [{ text: "prompt" }],
      "失敗メッセージ",
      controller.signal,
    );
    controller.abort();

    await expect(promise).resolves.toEqual({
      error: "生成がタイムアウトしました。時間をおいて再度お試しください。",
      status: 504,
    });
  });

  describe("upstream failures", () => {
    it("maps a 429 to a rate limit failure", async () => {
      mockGenerateContent.mockRejectedValue(
        new ApiError({ message: "quota exceeded for model gemini-x", status: 429 }),
      );

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(result).toEqual({
        error: GENERATION_ERROR_MESSAGES.rateLimited,
        status: 429,
      });
    });

    it("maps a 400 to an invalid request failure", async () => {
      mockGenerateContent.mockRejectedValue(
        new ApiError({ message: "invalid argument at api_single_request", status: 400 }),
      );

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(result).toEqual({
        error: GENERATION_ERROR_MESSAGES.invalidRequest,
        status: 400,
      });
    });

    it.each([
      "API key not valid. Please pass a valid API key. [reason: API_KEY_INVALID]",
      "FAILED_PRECONDITION: User location is not supported for the API use.",
    ])("keeps a configuration 400 on the generic path: %s", async (message) => {
      mockGenerateContent.mockRejectedValue(new ApiError({ message, status: 400 }));

      // A misconfigured key must surface as a server error, not as a request
      // the family could fix by changing photos or text.
      await expect(
        generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ"),
      ).rejects.toBeInstanceOf(ApiError);
    });

    it.each([500, 503, 504])("maps an upstream %i to a 503 failure", async (status) => {
      mockGenerateContent.mockRejectedValue(
        new ApiError({ message: "internal error at api_single_request", status }),
      );

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(result).toEqual({
        error: GENERATION_ERROR_MESSAGES.serviceUnavailable,
        status: 503,
      });
    });

    it("never leaks the upstream message", async () => {
      mockGenerateContent.mockRejectedValue(
        new ApiError({ message: "key GEMINI_SECRET leaked at internal.host", status: 429 }),
      );

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(JSON.stringify(result)).not.toContain("GEMINI_SECRET");
    });

    it("keeps the generic path for an unmapped status", async () => {
      mockGenerateContent.mockRejectedValue(new ApiError({ message: "unauthorized", status: 401 }));

      await expect(
        generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ"),
      ).rejects.toThrow("unauthorized");
    });
  });

  describe("safety blocks", () => {
    it("returns 422 when the prompt was blocked for safety", async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [],
        promptFeedback: { blockReason: BlockedReason.SAFETY },
      });

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(result).toEqual({
        error: GENERATION_ERROR_MESSAGES.safetyBlocked,
        status: 422,
      });
    });

    it.each([
      BlockedReason.PROHIBITED_CONTENT,
      BlockedReason.IMAGE_SAFETY,
      BlockedReason.BLOCKLIST,
    ])("returns 422 for the blocked prompt reason %s", async (blockReason) => {
      mockGenerateContent.mockResolvedValue({
        candidates: [],
        promptFeedback: { blockReason },
      });

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(result).toEqual({
        error: GENERATION_ERROR_MESSAGES.safetyBlocked,
        status: 422,
      });
    });

    it.each([
      FinishReason.SAFETY,
      FinishReason.IMAGE_SAFETY,
      FinishReason.PROHIBITED_CONTENT,
      FinishReason.RECITATION,
      FinishReason.SPII,
      FinishReason.BLOCKLIST,
    ])("returns 422 for the finish reason %s", async (finishReason) => {
      mockGenerateContent.mockResolvedValue({
        candidates: [{ content: { parts: [{ text: "no image" }] }, finishReason }],
      });

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(result).toEqual({
        error: GENERATION_ERROR_MESSAGES.safetyBlocked,
        status: 422,
      });
    });

    it("keeps the generic failure for a non-safety finish reason", async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [
          { content: { parts: [{ text: "no image" }] }, finishReason: FinishReason.STOP },
        ],
      });

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(result).toEqual({ error: "失敗メッセージ", status: 502 });
    });

    it("keeps the generic failure when nothing indicates a block", async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [
          { content: { parts: [{ text: "no image" }] }, finishReason: FinishReason.NO_IMAGE },
        ],
      });

      const result = await generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ");

      expect(result).toEqual({ error: "失敗メッセージ", status: 502 });
    });
  });
});
