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

vi.mock("@/utils/server/api-helpers", () => ({
  handleApiError: vi.fn((e) =>
    jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500),
  ),
  validateFormData: vi.fn((schema, data) => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error.issues.map((i: any) => i.message).join(", ") };
  }),
}));

vi.mock("@/utils/server/imageProcessing", () => ({
  filesToParts: vi.fn(),
}));

vi.mock("@/utils/server/imageGeneration", () => ({
  generateImage: mockGenerateImage,
  IMAGE_GENERATION_TIMEOUT_MS: 90_000,
}));

vi.mock("@/utils/server/cache", () => ({
  fileFingerprint: vi.fn(async () => "mock-fingerprint"),
  generateCacheKey: vi.fn(() => "mock-cache-key"),
  imageGenerationCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
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
  });

  it("returns 200 on successful story generation", async () => {
    const { handleApiError } = await import("@/utils/server/api-helpers");
    const { filesToParts } = await import("@/utils/server/imageProcessing");
    const { imageGenerationCache } = await import("@/utils/server/cache");

    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    vi.mocked(imageGenerationCache.get).mockReturnValue(undefined);
    vi.mocked(handleApiError).mockImplementation((e) =>
      jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500),
    );
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

  it("passes the shared generation deadline to generateImage", async () => {
    const { filesToParts } = await import("@/utils/server/imageProcessing");
    const { imageGenerationCache } = await import("@/utils/server/cache");
    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    vi.mocked(imageGenerationCache.get).mockReturnValue(undefined);
    mockGenerateImage.mockResolvedValue({ imageBase64: "x", mimeType: "image/png" });

    await POST(createRequest("picture-book", [new File(["a"], "a.png")]));

    const signal = mockGenerateImage.mock.calls[0][3];
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
