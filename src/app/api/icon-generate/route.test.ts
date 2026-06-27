import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextResponse } from "next/server";

const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockFetchUrlMetadata = vi.hoisted(() => vi.fn());

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
  handleApiError: vi.fn((e, _l, _r, _u, fallback) =>
    jsonResponse({ error: e instanceof Error ? e.message : String(e), fallback }, 500),
  ),
  validateImageFile: vi.fn(),
}));

vi.mock("@/utils/server/imageProcessing", () => ({
  filesToParts: vi.fn(),
  fetchOgImage: vi.fn(),
}));

vi.mock("@/utils/server/urlMetadata", () => ({
  fetchUrlMetadata: mockFetchUrlMetadata,
}));

vi.mock("@google/genai", () => {
  const MockGenAI = class {
    models = { generateContent: mockGenerateContent };
  };
  return { GoogleGenAI: MockGenAI };
});

import { POST } from "./route";

function createRequest(overrides: Record<string, unknown> = {}): Request {
  const fd = new FormData();
  fd.set("name", (overrides.name as string) ?? "Test Contact");
  if (overrides.url) fd.set("url", overrides.url as string);
  if (overrides.style) fd.set("style", overrides.style as string);
  if (overrides.customPrompt) fd.set("customPrompt", overrides.customPrompt as string);
  if (overrides.images) {
    for (const img of overrides.images as File[]) fd.append("images", img);
  }
  return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

describe("POST /api/icon-generate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetchUrlMetadata.mockResolvedValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    const { authenticateRequest } = await import("@/utils/server/api-helpers");
    vi.mocked(authenticateRequest).mockResolvedValue({
      response: jsonResponse({ error: "認証が必要です。" }, 401),
    });

    const res = await POST(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const { authenticateRequest, checkUserRateLimit, validateApiKey } = await import("@/utils/server/api-helpers");
    vi.mocked(authenticateRequest).mockResolvedValue({
      session: { user: { email: "test@example.com" } },
    });
    vi.mocked(checkUserRateLimit).mockReturnValue({ allowed: true });
    vi.mocked(validateApiKey).mockReturnValue({ key: "test-key" });

    const fd = new FormData();
    const req = { formData: () => Promise.resolve(fd) } as unknown as Request;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("連絡先名を入力してください");
  });

  it("returns 200 on successful generation", async () => {
    const { authenticateRequest, checkUserRateLimit, validateApiKey, handleApiError } = await import("@/utils/server/api-helpers");
    const { filesToParts, fetchOgImage } = await import("@/utils/server/imageProcessing");

    vi.mocked(authenticateRequest).mockResolvedValue({
      session: { user: { email: "test@example.com" } },
    });
    vi.mocked(checkUserRateLimit).mockReturnValue({ allowed: true });
    vi.mocked(validateApiKey).mockReturnValue({ key: "test-key" });
    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    vi.mocked(fetchOgImage).mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{ inlineData: { data: "base64-icon", mimeType: "image/png" } }],
        },
      }],
    });

    const res = await POST(createRequest({ name: "John Doe", style: "flat-minimal" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageBase64).toBe("base64-icon");
    expect(body.mimeType).toBe("image/png");
  });

  it("includes OG image when URL metadata has one", async () => {
    const { authenticateRequest, checkUserRateLimit, validateApiKey } = await import("@/utils/server/api-helpers");
    const { filesToParts, fetchOgImage } = await import("@/utils/server/imageProcessing");

    vi.mocked(authenticateRequest).mockResolvedValue({
      session: { user: { email: "test@example.com" } },
    });
    vi.mocked(checkUserRateLimit).mockReturnValue({ allowed: true });
    vi.mocked(validateApiKey).mockReturnValue({ key: "test-key" });
    mockFetchUrlMetadata.mockResolvedValue({
      title: "Example",
      description: "Test",
      ogImage: "https://example.com/og.jpg",
    });
    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "image data" }] });
    vi.mocked(fetchOgImage).mockResolvedValue({
      base64: "og-image-base64",
      mimeType: "image/jpeg",
    });
    mockGenerateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{ inlineData: { data: "final-icon", mimeType: "image/png" } }],
        },
      }],
    });

    const res = await POST(createRequest({ name: "Test", url: "https://example.com" }));
    expect(res.status).toBe(200);

    expect(mockFetchUrlMetadata).toHaveBeenCalledWith("https://example.com");
    expect(fetchOgImage).toHaveBeenCalledWith("https://example.com/og.jpg");
  });

  it("returns 502 when Gemini returns no image", async () => {
    const { authenticateRequest, checkUserRateLimit, validateApiKey } = await import("@/utils/server/api-helpers");
    const { filesToParts } = await import("@/utils/server/imageProcessing");

    vi.mocked(authenticateRequest).mockResolvedValue({
      session: { user: { email: "test@example.com" } },
    });
    vi.mocked(checkUserRateLimit).mockReturnValue({ allowed: true });
    vi.mocked(validateApiKey).mockReturnValue({ key: "test-key" });
    vi.mocked(filesToParts).mockResolvedValue({ parts: [{ text: "processed" }] });
    mockGenerateContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: "sorry" }] } }],
    });

    const res = await POST(createRequest({ name: "Test" }));
    expect(res.status).toBe(502);
  });
});
