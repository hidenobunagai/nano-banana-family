import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorSubmit } from "./useEditorSubmit";

describe("useEditorSubmit", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  function setup(overrides: Partial<Parameters<typeof useEditorSubmit>[0]> = {}) {
    const onSuccess = vi.fn();
    const onFinished = vi.fn();
    const options = {
      validate: () => null,
      buildFormData: () => new FormData(),
      endpoint: "/api/test",
      errorFallback: "fallback error message",
      downloadPrefix: "test",
      onSuccess,
      onFinished,
      ...overrides,
    };
    const { result } = renderHook(() => useEditorSubmit(options));
    return { result, onSuccess, onFinished };
  }

  function mockFetchResponse(response: Partial<Response>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response as Response),
    );
  }

  it("skips the request and reports the validation error", async () => {
    const { result } = setup({ validate: () => "入力してください。" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errorMessage).toBe("入力してください。");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sets the result data URL and calls onSuccess/onFinished on success", async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      json: async () => ({ imageBase64: "QUJD", mimeType: "image/webp" }),
    });
    const { result, onSuccess, onFinished } = setup();

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.resultImage).toBe("data:image/webp;base64,QUJD");
    expect(result.current.resultFilename).toMatch(/^test-\d+\.png$/);
    expect(onSuccess).toHaveBeenCalledWith("data:image/webp;base64,QUJD");
    expect(onFinished).toHaveBeenCalledWith(expect.any(Number));
    expect(result.current.errorMessage).toBeNull();
  });

  it("defaults to image/png mime type when missing", async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      json: async () => ({ imageBase64: "QUJD" }),
    });
    const { result } = setup();

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.resultImage).toBe("data:image/png;base64,QUJD");
  });

  it("reports the payload error message on a failed response", async () => {
    mockFetchResponse({
      ok: false,
      status: 500,
      json: async () => ({ error: "サーバーエラー" }),
    });
    const { result, onSuccess, onFinished } = setup();

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errorMessage).toBe("サーバーエラー");
    expect(result.current.resultImage).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalledWith(expect.any(Number));
  });

  it("falls back to the generic fallback message when the payload has no error", async () => {
    mockFetchResponse({
      ok: false,
      status: 400,
      json: async () => ({}),
    });
    const { result } = setup();

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errorMessage).toBe("fallback error message");
  });

  it("handles a malformed success payload", async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      json: async () => ({ foo: "bar" }),
    });
    const { result, onFinished } = setup();

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errorMessage).toBe("画像データを取得できませんでした。もう一度お試しください。");
    expect(onFinished).toHaveBeenCalled();
  });

  it("stays silent and skips onFinished when the request is aborted", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(abortError)));
    const { result, onFinished } = setup();

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errorMessage).toBeNull();
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("clears result and error state on reset", async () => {
    const { result } = setup();

    act(() => result.current.reset());

    expect(result.current.resultImage).toBeNull();
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.resultFilename).toBeNull();
  });
});
