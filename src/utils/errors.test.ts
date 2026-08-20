import { AppError, toAppError, getUserMessage } from "./errors";

describe("AppError", () => {
  it("creates an error with default status 500", () => {
    const error = new AppError("test error");
    expect(error.message).toBe("test error");
    expect(error.statusCode).toBe(500);
  });

  it("creates an error with custom status", () => {
    const error = new AppError("bad request", 400);
    expect(error.statusCode).toBe(400);
  });
});

describe("toAppError", () => {
  it("returns AppError as-is", () => {
    const original = new AppError("bad", 400);
    expect(toAppError(original)).toBe(original);
  });

  it("wraps standard Error", () => {
    const error = toAppError(new Error("something broke"));
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("something broke");
    expect(error.statusCode).toBe(500);
  });

  it("sanitizes internal messages in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = toAppError(new Error("model gemini-x internal detail"));
    expect(error.message).toBe("予期しないエラーが発生しました。");
    vi.unstubAllEnvs();
  });

  it("wraps unknown values", () => {
    const error = toAppError("string error");
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(500);
  });

  it("wraps null", () => {
    const error = toAppError(null);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(500);
  });
});

describe("getUserMessage", () => {
  it("returns message from AppError", () => {
    const error = new AppError("invalid");
    expect(getUserMessage(error)).toBe("invalid");
  });

  it("returns message from Error in non-production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getUserMessage(new Error("internal error"))).toBe("internal error");
    vi.unstubAllEnvs();
  });

  it("returns generic message for Error in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getUserMessage(new Error("internal error"))).toBe(
      "エラーが発生しました。しばらくしてからもう一度お試しください。",
    );
    vi.unstubAllEnvs();
  });

  it("returns generic message for unknown values", () => {
    expect(getUserMessage(null)).toBe(
      "エラーが発生しました。しばらくしてからもう一度お試しください。",
    );
  });
});
