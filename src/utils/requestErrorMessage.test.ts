import { GENERATION_ERROR_MESSAGES } from "./generationErrorMessages";
import { getRequestErrorMessage } from "./requestErrorMessage";

describe("getRequestErrorMessage", () => {
  it("returns auth message for 401", () => {
    expect(
      getRequestErrorMessage({
        status: 401,
        payload: {},
        fallback: "error",
      }),
    ).toBe("セッションの確認が必要です。もう一度サインインしてからお試しください。");
  });

  it("returns auth message for 403", () => {
    expect(
      getRequestErrorMessage({
        status: 403,
        payload: {},
        fallback: "error",
      }),
    ).toBe("セッションの確認が必要です。もう一度サインインしてからお試しください。");
  });

  it("returns size message for 413", () => {
    expect(
      getRequestErrorMessage({
        status: 413,
        payload: {},
        fallback: "error",
      }),
    ).toBe(
      "画像サイズが大きすぎる可能性があります。別の画像に変えるか、そのままでもう一度お試しください。",
    );
  });

  it("extracts error message from payload", () => {
    expect(
      getRequestErrorMessage({
        status: 500,
        payload: { error: "server error" },
        fallback: "fallback",
      }),
    ).toBe("server error");
  });

  it("falls back when payload has no error", () => {
    expect(
      getRequestErrorMessage({
        status: 500,
        payload: { message: "something" },
        fallback: "fallback",
      }),
    ).toBe("fallback");
  });

  it("falls back when payload is null", () => {
    expect(
      getRequestErrorMessage({
        status: 500,
        payload: null,
        fallback: "fallback",
      }),
    ).toBe("fallback");
  });

  it("ignores empty error strings", () => {
    expect(
      getRequestErrorMessage({
        status: 500,
        payload: { error: "   " },
        fallback: "fallback",
      }),
    ).toBe("fallback");
  });

  it("falls back to the rate limit message for a 429 without an error body", () => {
    expect(
      getRequestErrorMessage({
        status: 429,
        payload: null,
        fallback: "fallback",
      }),
    ).toBe(GENERATION_ERROR_MESSAGES.rateLimited);
  });

  it("falls back to the busy message for a 503 without an error body", () => {
    expect(
      getRequestErrorMessage({
        status: 503,
        payload: { message: "platform error page" },
        fallback: "fallback",
      }),
    ).toBe(GENERATION_ERROR_MESSAGES.serviceUnavailable);
  });

  it("shows the server message for a 429 when the body carries one", () => {
    expect(
      getRequestErrorMessage({
        status: 429,
        payload: { error: "server rate limit message" },
        fallback: "fallback",
      }),
    ).toBe("server rate limit message");
  });

  it("shows the server message for a 503 when the body carries one", () => {
    expect(
      getRequestErrorMessage({
        status: 503,
        payload: { error: "server busy message" },
        fallback: "fallback",
      }),
    ).toBe("server busy message");
  });
});
