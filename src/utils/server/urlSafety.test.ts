import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertSafeUrl, fetchWithRedirects, UnsafeUrlError } from "./urlSafety";

const mockLookup = vi.fn();

vi.mock("node:dns/promises", () => ({
  default: { lookup: (...args: unknown[]) => mockLookup(...args) },
  lookup: (...args: unknown[]) => mockLookup(...args),
}));

describe("assertSafeUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLookup.mockReset();
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  it("accepts public http/https URLs", async () => {
    await expect(assertSafeUrl("https://example.com/page")).resolves.toBe(
      "https://example.com/page",
    );
  });

  it("rejects non-http(s) schemes", async () => {
    await expect(assertSafeUrl("ftp://example.com/file")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("javascript:alert(1)")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects URLs with credentials", async () => {
    await expect(assertSafeUrl("https://user:pass@example.com/")).rejects.toThrow(
      UnsafeUrlError,
    );
  });

  it("rejects non-standard ports", async () => {
    await expect(assertSafeUrl("http://example.com:8080/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://example.com:22/")).rejects.toThrow(UnsafeUrlError);
  });

  it("allows default ports 80 and 443", async () => {
    await expect(assertSafeUrl("http://example.com:80/")).resolves.toBe(
      "http://example.com/",
    );
    await expect(assertSafeUrl("https://example.com:443/")).resolves.toBe(
      "https://example.com/",
    );
  });

  it("rejects private IPv4 literals", async () => {
    await expect(assertSafeUrl("http://127.0.0.1/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://10.0.0.1/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://192.168.1.10/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://172.16.0.1/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://169.254.169.254/")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects private IPv6 literals", async () => {
    await expect(assertSafeUrl("http://[::1]/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://[fe80::1]/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://[fc00::1]/")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects private hostnames", async () => {
    await expect(assertSafeUrl("http://localhost/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://foo.localhost/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://printer.local/")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects hostnames resolving to private IPs", async () => {
    mockLookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);
    await expect(assertSafeUrl("http://evil.example.com/")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects hostnames resolving to IPv6 private addresses", async () => {
    mockLookup.mockResolvedValue([{ address: "::1", family: 6 }]);
    await expect(assertSafeUrl("http://evil.example.com/")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects invalid URLs", async () => {
    await expect(assertSafeUrl("not a url")).rejects.toThrow(UnsafeUrlError);
  });
});

describe("fetchWithRedirects", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLookup.mockReset();
    mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  function mockFetchChain(...responses: { status: number; location?: string }[]) {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push({ url, init: init ?? {} });
      const current = responses[Math.min(calls.length - 1, responses.length - 1)];
      const headers = new Headers();
      if (current.location) headers.set("location", current.location);
      return new Response(null, { status: current.status, headers });
    });
    return calls;
  }

  it("returns the response for non-redirect status", async () => {
    const calls = mockFetchChain({ status: 200 });
    const response = await fetchWithRedirects("https://example.com/");

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it("follows redirects up to the limit, re-validating each hop", async () => {
    const calls = mockFetchChain(
      { status: 302, location: "https://example.com/next" },
      { status: 200 },
    );
    const response = await fetchWithRedirects("https://example.com/start");

    expect(response.status).toBe(200);
    expect(calls.map((c) => c.url)).toEqual([
      "https://example.com/start",
      "https://example.com/next",
    ]);
  });

  it("throws when redirect exceeds the limit", async () => {
    const calls = mockFetchChain(
      { status: 302, location: "https://example.com/1" },
      { status: 302, location: "https://example.com/2" },
      { status: 302, location: "https://example.com/3" },
      { status: 302, location: "https://example.com/4" },
    );

    await expect(fetchWithRedirects("https://example.com/start")).rejects.toThrow(
      UnsafeUrlError,
    );
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it("blocks redirects to private addresses", async () => {
    mockFetchChain({ status: 302, location: "http://127.0.0.1/admin" });

    await expect(fetchWithRedirects("https://example.com/start")).rejects.toThrow(
      UnsafeUrlError,
    );
  });
});
