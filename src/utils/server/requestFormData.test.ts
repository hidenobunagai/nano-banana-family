import { describe, it, expect } from "vitest";

import { INVALID_FORM_DATA_MESSAGE, readFormData } from "./requestFormData";

function requestResolving(formData: FormData): Request {
  return { formData: () => Promise.resolve(formData) } as unknown as Request;
}

function requestRejecting(error: unknown): Request {
  return { formData: () => Promise.reject(error) } as unknown as Request;
}

describe("readFormData", () => {
  it("returns the parsed form data unchanged on success", async () => {
    const formData = new FormData();
    formData.set("prompt", "テスト");
    formData.append("images", new File(["x"], "a.png", { type: "image/png" }));

    const result = await readFormData(requestResolving(formData));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok: true");
    expect(result.formData).toBe(formData);
    expect(result.formData.get("prompt")).toBe("テスト");
    expect(result.formData.getAll("images")).toHaveLength(1);
  });

  it("answers 400 with the shared message when parsing fails with a TypeError", async () => {
    const result = await readFormData(
      requestRejecting(new TypeError("Could not parse content as FormData")),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(400);
    expect(result.response.headers.get("content-type")).toContain("application/json");
    await expect(result.response.json()).resolves.toEqual({
      error: INVALID_FORM_DATA_MESSAGE,
    });
  });

  it("answers 400 for any rejection reason, not only TypeError", async () => {
    // Request.formData() can also fail with DOMException / RangeError style
    // errors depending on the runtime and the malformed body; the helper's
    // contract is that no parse failure escapes as an unhandled exception.
    for (const error of [new RangeError("bad multipart boundary"), new Error("boom"), "nope"]) {
      const result = await readFormData(requestRejecting(error));

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected ok: false");
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: INVALID_FORM_DATA_MESSAGE,
      });
    }
  });

  it("answers 400 for a real Request whose body is not multipart form data", async () => {
    const request = new Request("http://localhost/api/freestyle-edit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "テスト" }),
    });

    const result = await readFormData(request);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected ok: false");
    expect(result.response.status).toBe(400);
  });
});
