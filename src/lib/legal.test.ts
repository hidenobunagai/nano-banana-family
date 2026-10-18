import { afterEach, describe, expect, test, vi } from "vitest";

import { canonicalUrl, LEGAL_ROUTES, legalPageResponse } from "@/lib/legal";

const PAGE = "<!DOCTYPE html><html><body>ok</body></html>";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LEGAL_ROUTES", () => {
  test("maps the three paths Google needs to the three pages", () => {
    expect(LEGAL_ROUTES).toEqual({ about: "home", privacy: "privacy", terms: "terms" });
  });

  test("canonicalUrl points at the source copy of each page", () => {
    expect(canonicalUrl("home")).toBe("https://legal.misato-labs.com/apps/nano-banana-family");
    expect(canonicalUrl("privacy")).toBe(
      "https://legal.misato-labs.com/apps/nano-banana-family/privacy",
    );
    expect(canonicalUrl("terms")).toBe(
      "https://legal.misato-labs.com/apps/nano-banana-family/terms",
    );
  });
});

describe("legalPageResponse", () => {
  test("fetches the app view and serves what the source returns", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo) => {
      calls.push(String(input));
      return new Response(PAGE, { status: 200 });
    });

    const res = await legalPageResponse("privacy");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await res.text()).toBe(PAGE);
    expect(calls[0]).toBe("https://legal.misato-labs.com/apps/nano-banana-family/privacy?view=app");
  });

  test("lets the shared cache hold the page", async () => {
    vi.stubGlobal("fetch", async () => new Response(PAGE, { status: 200 }));

    const res = await legalPageResponse("terms");

    expect(res.headers.get("cache-control")).toContain("s-maxage=");
  });

  test("falls back to a pointer when the source fails", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("network down");
    });

    const res = await legalPageResponse("privacy");

    expect(res.status).toBe(200);
    expect(await res.text()).toContain(
      "https://legal.misato-labs.com/apps/nano-banana-family/privacy",
    );
  });

  test("rejects a body that is not a page rather than serving it", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>truncated", { status: 200 }));

    const body = await (await legalPageResponse("privacy")).text();

    expect(body).toContain("https://legal.misato-labs.com/apps/nano-banana-family/privacy");
    expect(body).not.toContain("truncated");
  });

  test("falls back when the source answers with an error status", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 500 }));

    expect(await (await legalPageResponse("terms")).text()).toContain(
      "https://legal.misato-labs.com/apps/nano-banana-family/terms",
    );
  });

  test("the fallback states nothing about data handling", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 502 }));

    const body = await (await legalPageResponse("privacy")).text();

    // Guessing at the disclosure is exactly what this arrangement avoids.
    expect(body).not.toContain("委託先");
    expect(body).not.toContain("保管");
  });
});
