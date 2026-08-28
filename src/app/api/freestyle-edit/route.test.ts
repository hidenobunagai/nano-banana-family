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
  validateFormData: vi.fn((schema, data) => {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return {
      success: false,
      error: result.error.issues.map((i: any) => i.message).join(", "),
    };
  }),
  handleApiError: vi.fn((e) =>
    new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    ),
  ),
}));

import { POST } from "./route";

function createRequest(prompt: string, images: File[] = []): Request {
  const fd = new FormData();
  fd.set("prompt", prompt);
  for (const img of images) fd.append("images", img);
  return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

describe("POST /api/freestyle-edit", () => {
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
      imageBase64: "base64-data",
      mimeType: "image/png",
    });

    const mockFile = new File(["test"], "test.png", { type: "image/png" });
    const req = createRequest("prompt", [mockFile]);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.imageBase64).toBe("base64-data");
    expect(body.mimeType).toBe("image/png");
  });

  it("returns 502 when Gemini returns no image", async () => {
    mockGenerateImage.mockResolvedValue({
      error: "画像の生成に失敗しました。",
      status: 502,
    });

    const mockFile = new File(["test"], "test.png", { type: "image/png" });
    const req = createRequest("prompt", [mockFile]);
    const res = await POST(req);

    expect(res.status).toBe(502);
  });
});
