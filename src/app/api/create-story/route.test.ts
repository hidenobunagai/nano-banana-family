import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextResponse } from "next/server";

const mockGenerateImage = vi.hoisted(() => vi.fn());
const mockWithApiAuth = vi.hoisted(() => vi.fn());

function jsonResponse(data: Record<string, unknown>, status: number): NextResponse {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  }) as unknown as NextResponse;
}

vi.mock("@/utils/server/withApiAuth", () => ({
  withApiAuth: mockWithApiAuth,
}));

vi.mock("@/utils/server/imageProcessing", () => ({
  filesToParts: vi.fn(),
}));

vi.mock("@/utils/server/imageGeneration", () => ({
  generateImage: mockGenerateImage,
  IMAGE_GENERATION_TIMEOUT_MS: 90_000,
}));

import { POST } from "./route";

function createRequest(
  storyType = "picture-book",
  images?: File[],
  customPrompt?: string,
): Request {
  const fd = new FormData();
  fd.set("storyType", storyType);
  fd.set("tone", "funny");
  fd.set("language", "ja");
  if (customPrompt) fd.set("customPrompt", customPrompt);
  if (images) for (const img of images) fd.append("images", img);
  return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

function createMalformedRequest(): Request {
  return {
    formData: () => Promise.reject(new TypeError("Could not parse content as FormData")),
  } as unknown as Request;
}

describe("POST /api/create-story", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithApiAuth.mockResolvedValue({
      ok: true,
      session: { user: { email: "test@example.com" } },
      apiKey: "test-key",
    });
  });

  it("runs the shared auth guard for create-story", async () => {
    const { filesToParts } = await import("@/utils/server/imageProcessing");
    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    mockGenerateImage.mockResolvedValue({ imageBase64: "x", mimeType: "image/png" });

    await POST(createRequest("picture-book", [new File(["a"], "a.png")]));

    expect(mockWithApiAuth).toHaveBeenCalledWith("create-story");
  });

  it("returns the guard response when not authenticated", async () => {
    mockWithApiAuth.mockResolvedValue({
      ok: false,
      response: jsonResponse({ error: "認証が必要です。" }, 401),
    });

    const res = await POST(createRequest("picture-book", [new File(["a"], "a.png")]));
    expect(res.status).toBe(401);
    const { filesToParts } = await import("@/utils/server/imageProcessing");
    expect(filesToParts).not.toHaveBeenCalled();
  });

  it("returns the guard response when rate limited", async () => {
    mockWithApiAuth.mockResolvedValue({
      ok: false,
      response: jsonResponse({ error: "リクエストが多すぎます。" }, 429),
    });

    const res = await POST(createRequest("picture-book", [new File(["a"], "a.png")]));
    expect(res.status).toBe(429);
  });

  it("returns the guard response when the API key is missing", async () => {
    mockWithApiAuth.mockResolvedValue({
      ok: false,
      response: jsonResponse({ error: "Gemini API キーが設定されていません。" }, 500),
    });

    const res = await POST(createRequest("picture-book", [new File(["a"], "a.png")]));
    expect(res.status).toBe(500);
  });

  it("returns 400 when no images uploaded", async () => {
    const res = await POST(createRequest("picture-book", []));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("写真を1枚以上");
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  it("returns 400 when the real schema rejects too many images", async () => {
    const images = Array.from(
      { length: 6 },
      (_, index) => new File(["a"], `a-${index}.png`, { type: "image/png" }),
    );

    const res = await POST(createRequest("picture-book", images));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("最大5枚");
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  it("returns 200 on successful story generation", async () => {
    const { filesToParts } = await import("@/utils/server/imageProcessing");

    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    mockGenerateImage.mockResolvedValue({
      imageBase64: "story-base64-data",
      mimeType: "image/png",
    });

    const res = await POST(createRequest("comic", [new File(["a"], "a.png")], "公園での冒険"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageBase64).toBe("story-base64-data");
    expect(body.mimeType).toBe("image/png");
  });

  it("returns 400 when the request body is not a valid form", async () => {
    const res = await POST(createMalformedRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("形式");
  });

  it("passes the shared generation deadline to generateImage", async () => {
    const { filesToParts } = await import("@/utils/server/imageProcessing");
    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    mockGenerateImage.mockResolvedValue({ imageBase64: "x", mimeType: "image/png" });

    await POST(createRequest("picture-book", [new File(["a"], "a.png")]));

    const signal = mockGenerateImage.mock.calls[0][3];
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
