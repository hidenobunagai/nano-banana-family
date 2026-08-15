import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextResponse } from "next/server";

const mockGenerateImage = vi.hoisted(() => vi.fn());

function jsonResponse(data: Record<string, unknown>, status: number): NextResponse {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  }) as unknown as NextResponse;
}

vi.mock("@/utils/server/api-helpers", () => ({
  authenticateRequest: vi.fn(),
  checkUserRateLimit: vi.fn(),
  validateApiKey: vi.fn(),
  handleApiError: vi.fn((e) =>
    jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500),
  ),
  validateImageFile: vi.fn(),
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
}));

import { POST } from "./route";

function createRequest(prompt?: string, images?: File[]): Request {
  const fd = new FormData();
  if (prompt) fd.set("prompt", prompt);
  if (images) for (const img of images) fd.append("images", img);
  return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

describe("POST /api/freestyle-edit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { authenticateRequest } = await import("@/utils/server/api-helpers");
    vi.mocked(authenticateRequest).mockResolvedValue({
      response: jsonResponse({ error: "認証が必要です。" }, 401),
    });

    const res = await POST(createRequest("edit", [new File(["a"], "a.png")]));
    expect(res.status).toBe(401);
  });

  it("returns 400 when prompt is missing", async () => {
    const { authenticateRequest, checkUserRateLimit, validateApiKey } =
      await import("@/utils/server/api-helpers");
    vi.mocked(authenticateRequest).mockResolvedValue({
      session: { user: { email: "test@example.com" } },
    });
    vi.mocked(checkUserRateLimit).mockReturnValue({ allowed: true });
    vi.mocked(validateApiKey).mockReturnValue({ key: "test-key" });

    const res = await POST(createRequest(undefined, [new File(["a"], "a.png")]));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("編集内容を入力してください");
  });

  it("returns 400 when no images", async () => {
    const { authenticateRequest, checkUserRateLimit, validateApiKey } =
      await import("@/utils/server/api-helpers");
    vi.mocked(authenticateRequest).mockResolvedValue({
      session: { user: { email: "test@example.com" } },
    });
    vi.mocked(checkUserRateLimit).mockReturnValue({ allowed: true });
    vi.mocked(validateApiKey).mockReturnValue({ key: "test-key" });

    const res = await POST(createRequest("edit"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("画像を1枚以上");
  });

  it("returns 200 on successful generation", async () => {
    const { authenticateRequest, checkUserRateLimit, validateApiKey, handleApiError } =
      await import("@/utils/server/api-helpers");
    const { filesToParts } = await import("@/utils/server/imageProcessing");

    vi.mocked(authenticateRequest).mockResolvedValue({
      session: { user: { email: "test@example.com" } },
    });
    vi.mocked(checkUserRateLimit).mockReturnValue({ allowed: true });
    vi.mocked(validateApiKey).mockReturnValue({ key: "test-key" });
    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    vi.mocked(handleApiError).mockImplementation((e) =>
      jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500),
    );
    mockGenerateImage.mockResolvedValue({
      imageBase64: "base64-data",
      mimeType: "image/png",
    });

    const res = await POST(createRequest("make it blue", [new File(["a"], "a.png")]));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageBase64).toBe("base64-data");
    expect(body.mimeType).toBe("image/png");
  });

  it("returns 502 when Gemini returns no image", async () => {
    const { authenticateRequest, checkUserRateLimit, validateApiKey } =
      await import("@/utils/server/api-helpers");
    const { filesToParts } = await import("@/utils/server/imageProcessing");

    vi.mocked(authenticateRequest).mockResolvedValue({
      session: { user: { email: "test@example.com" } },
    });
    vi.mocked(checkUserRateLimit).mockReturnValue({ allowed: true });
    vi.mocked(validateApiKey).mockReturnValue({ key: "test-key" });
    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    mockGenerateImage.mockResolvedValue({ error: "画像の生成に失敗しました。", status: 502 });

    const res = await POST(createRequest("edit", [new File(["a"], "a.png")]));
    expect(res.status).toBe(502);
  });
});
