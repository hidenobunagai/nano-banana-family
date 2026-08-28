import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateImage = vi.hoisted(() => vi.fn());
const mockWithApiAuth = vi.hoisted(() => vi.fn());

vi.mock("@/utils/server/withApiAuth", () => ({
  withApiAuth: mockWithApiAuth,
}));

vi.mock("@/utils/server/imageProcessing", () => ({
  filesToParts: vi.fn().mockImplementation(async (files: File[]) => {
    console.log("filesToParts called with:", files);
    return { parts: [{ text: "processed image" }] };
  }),
  fetchOgImage: vi.fn(),
}));

vi.mock("@/utils/server/imageGeneration", () => ({
  generateImage: mockGenerateImage,
}));

vi.mock("@/utils/server/cache", () => ({
  fileFingerprint: vi.fn().mockResolvedValue("fingerprint123"),
  generateCacheKey: vi.fn().mockReturnValue("cache-key"),
  imageGenerationCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

vi.mock("@/utils/server/urlMetadata", () => ({
  fetchUrlMetadata: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/utils/server/api-helpers", () => ({
  validateFormData: vi.fn().mockImplementation((schema: unknown, data: unknown) => {
    const result = (schema as { safeParse: (data: unknown) => { success: boolean; data: unknown } }).safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: "Validation error" };
  }),
}));

vi.mock("@/utils/server/iconPromptBuilder", () => ({
  buildIconPrompt: vi.fn().mockReturnValue("Built icon prompt"),
}));

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
    vi.clearAllMocks();
    mockWithApiAuth.mockResolvedValue({
      ok: true,
      session: { user: { email: "test@example.com" } },
      apiKey: "test-key",
    });
  });

  it("returns 200 on successful generation", async () => {
    mockGenerateImage.mockResolvedValue({
      imageBase64: "base64-icon",
      mimeType: "image/png",
    });

    const req = createRequest({ name: "Test User" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.imageBase64).toBe("base64-icon");
    expect(data.mimeType).toBe("image/png");
  });

  it("returns 502 when Gemini returns no image", async () => {
    mockGenerateImage.mockResolvedValue({
      error: "アイコンの生成に失敗しました。",
      status: 502,
    });

    const req = createRequest({ name: "Test User" });
    const res = await POST(req);

    expect(res.status).toBe(502);
  });
});
