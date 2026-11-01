import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateImage = vi.hoisted(() => vi.fn());
const mockWithApiAuth = vi.hoisted(() => vi.fn());

vi.mock("@/utils/server/withApiAuth", () => ({
  withApiAuth: mockWithApiAuth,
}));

vi.mock("@/utils/server/imageProcessing", () => ({
  filesToParts: vi.fn().mockImplementation(async () => {
    return { parts: [{ text: "processed image" }] };
  }),
  fetchOgImage: vi.fn(),
}));

vi.mock("@/utils/server/imageGeneration", () => ({
  generateImage: mockGenerateImage,
  IMAGE_GENERATION_TIMEOUT_MS: 90_000,
}));

vi.mock("@/utils/server/urlMetadata", () => ({
  fetchUrlMetadata: vi.fn().mockResolvedValue(null),
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

function createMalformedRequest(): Request {
  return {
    formData: () => Promise.reject(new TypeError("Could not parse content as FormData")),
  } as unknown as Request;
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

  it("returns 400 when the request body is not a valid form", async () => {
    const res = await POST(createMalformedRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("形式");
  });

  it("returns 400 when the real schema rejects too many images", async () => {
    const images = Array.from(
      { length: 4 },
      (_, index) => new File(["test"], `test-${index}.png`, { type: "image/png" }),
    );

    const res = await POST(createRequest({ name: "Test User", images }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("最大3枚");
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  it("returns 400 when the real schema rejects an empty name", async () => {
    const res = await POST(createRequest({ name: "" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("連絡先名");
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });
});
