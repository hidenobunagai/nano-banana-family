import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchUrlMetadata } from "./urlMetadata";

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

function mockFetch(response: {
  ok?: boolean;
  contentType?: string;
  body?: string;
}): void {
  const { ok = true, contentType = "text/html; charset=utf-8", body = "" } = response;
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, {
      status: ok ? 200 : 404,
      headers: { "content-type": contentType },
    }),
  );
}

describe("fetchUrlMetadata", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
