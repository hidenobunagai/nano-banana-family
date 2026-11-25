import { describe, it, expect } from "vitest";

import { GET, runtime } from "./route";

describe("GET /api/health", () => {
  it("runs on the Node.js runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("returns 200 with status ok and a current ISO 8601 timestamp", async () => {
    const before = Date.now();

    const response = await GET();
    const body: unknown = await response.json();
    const after = Date.now();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body).toEqual({
      status: "ok",
      timestamp: expect.any(String),
    });

    const timestamp = (body as { timestamp: string }).timestamp;
    // Round-tripping through Date must reproduce the string exactly, which
    // only holds for a well-formed ISO 8601 timestamp.
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
    const parsed = Date.parse(timestamp);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it("returns a fresh timestamp on each call", async () => {
    const first = (await (await GET()).json()) as { timestamp: string };
    const second = (await (await GET()).json()) as { timestamp: string };

    expect(Date.parse(second.timestamp)).toBeGreaterThanOrEqual(Date.parse(first.timestamp));
  });
});
