import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchUrlMetadata } from "./urlMetadata";

const mockLookup = vi.fn();

vi.mock("node:dns/promises", () => ({
  default: { lookup: (...args: unknown[]) => mockLookup(...args) },
  lookup: (...args: unknown[]) => mockLookup(...args),
}));

const htmlTemplate = ({
  title = "Test Page",
  description = "A test page description",
  ogImage = "https://example.com/og.jpg",
} = {}) => `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:image" content="${ogImage}">
</head>
<body></body>
</html>
`;

function mockFetch(response: { ok?: boolean; contentType?: string; body?: string }): void {
  const { ok = true, contentType = "text/html; charset=utf-8", body = "" } = response;
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, {
      status: ok ? 200 : 404,
      headers: { "content-type": contentType },
    }),
  );
}

/** Mimics a server that sends headers, then stops sending body bytes. */
function stalledResponse(signal?: AbortSignal | null): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("<html><head><title>Stalled</title>"));
      signal?.addEventListener("abort", () => controller.error(signal.reason));
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

/** Shortens the request timeout so stalled-body cases stay fast. */
function useFastTimeout(): void {
  vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error("timeout")), 10);
    return controller.signal;
  });
}

describe("fetchUrlMetadata", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLookup.mockReset();
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  it("extracts title, description, and og:image from HTML", async () => {
    mockFetch({ body: htmlTemplate() });

    const result = await fetchUrlMetadata("https://example.com");

    expect(result).toEqual({
      title: "Test Page",
      description: "A test page description",
      ogImage: "https://example.com/og.jpg",
    });
  });

  it("decodes HTML entities in extracted text", async () => {
    mockFetch({
      body: htmlTemplate({
        title: "Foo &amp; Bar &lt;3",
        description: "Cost: &pound;5",
      }),
    });

    const result = await fetchUrlMetadata("https://example.com");

    expect(result?.title).toBe("Foo & Bar <3");
  });

  it("returns null for non-OK response", async () => {
    mockFetch({ ok: false, body: "" });

    const result = await fetchUrlMetadata("https://example.com/404");

    expect(result).toBeNull();
  });

  it("returns null for non-HTML content type", async () => {
    mockFetch({ contentType: "application/json", body: "{}" });

    const result = await fetchUrlMetadata("https://example.com/data");

    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));

    const result = await fetchUrlMetadata("https://example.com");

    expect(result).toBeNull();
  });

  it("handles missing og:image", async () => {
    mockFetch({
      body: "<html><head><title>No OG</title><meta name='description' content='desc'></head></html>",
    });

    const result = await fetchUrlMetadata("https://example.com");

    expect(result?.title).toBe("No OG");
    expect(result?.ogImage).toBeNull();
  });

  it("handles reversed meta attribute order", async () => {
    mockFetch({
      body: `<html><head><meta content="reversed desc" name="description"></head></html>`,
    });

    const result = await fetchUrlMetadata("https://example.com");

    expect(result?.description).toBe("reversed desc");
  });

  it("returns null without reading the body when content-length exceeds the limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(htmlTemplate(), {
        status: 200,
        headers: {
          "content-type": "text/html",
          "content-length": String(3 * 1024 * 1024),
        },
      }),
    );

    const result = await fetchUrlMetadata("https://example.com");

    expect(result).toBeNull();
  });

  it("returns null when the body exceeds the size limit", async () => {
    mockFetch({ body: `${htmlTemplate()}${"x".repeat(2 * 1024 * 1024)}` });

    const result = await fetchUrlMetadata("https://example.com");

    expect(result).toBeNull();
  });

  it("returns null when the body stalls after the headers", async () => {
    useFastTimeout();
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) =>
      Promise.resolve(stalledResponse(init?.signal)),
    );

    const result = await fetchUrlMetadata("https://example.com");

    expect(result).toBeNull();
  });
});
