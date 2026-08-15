import { describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => {
  const MockGenAI = class {
    models = { generateContent: mockGenerateContent };
  };
  return { GoogleGenAI: MockGenAI };
});

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

    const result = await generateImage("test-key", [{ text: "prompt" }], "画像の生成に失敗しました。");

    expect(result).toEqual({ error: "画像の生成に失敗しました。", status: 502 });
  });

  it("propagates unexpected errors", async () => {
    mockGenerateContent.mockRejectedValue(new Error("network down"));

    await expect(
      generateImage("test-key", [{ text: "prompt" }], "失敗メッセージ"),
    ).rejects.toThrow("network down");
  });
});
