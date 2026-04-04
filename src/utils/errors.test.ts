import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  ExternalServiceError,
  isAppError,
  isOperationalError,
  toAppError,
  getUserMessage,
} from "./errors";

describe("AppError", () => {
  it("creates an error with default status 500", () => {
    const error = new AppError("test error");
    expect(error.message).toBe("test error");
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
  });

  it("creates an error with custom status", () => {
    const error = new AppError("bad request", 400, false);
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(false);
  });
});

describe("AuthenticationError", () => {
  it("creates with 401 status", () => {
    const error = new AuthenticationError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("認証が必要です。");
  });

  it("creates with custom message", () => {
    const error = new AuthenticationError("token expired");
    expect(error.message).toBe("token expired");
  });
});

describe("AuthorizationError", () => {
  it("creates with 403 status", () => {
    const error = new AuthorizationError();
    expect(error.statusCode).toBe(403);
  });
});

describe("ValidationError", () => {
  it("creates with 400 status", () => {
    const error = new ValidationError("invalid input");
    expect(error.statusCode).toBe(400);
    expect(error.field).toBeUndefined();
  });

  it("creates with field", () => {
    const error = new ValidationError("required", "email");
    expect(error.field).toBe("email");
  });
});

describe("RateLimitError", () => {
  it("creates with 429 status and default retry", () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(60);
  });

  it("creates with custom retry", () => {
    const error = new RateLimitError(120);
    expect(error.retryAfter).toBe(120);
  });
});

describe("NotFoundError", () => {
  it("creates with 404 status", () => {
    const error = new NotFoundError("user");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("userが見つかりません。");
  });

  it("uses default resource name", () => {
    const error = new NotFoundError();
    expect(error.message).toBe("リソースが見つかりません。");
  });
});

describe("ExternalServiceError", () => {
  it("creates with 502 status", () => {
    const error = new ExternalServiceError("Gemini");
    expect(error.statusCode).toBe(502);
    expect(error.service).toBe("Gemini");
    expect(error.message).toBe("Geminiとの通信中にエラーが発生しました。");
  });

  it("creates with custom message", () => {
    const error = new ExternalServiceError("API", "timeout");
    expect(error.message).toBe("timeout");
  });
});

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    expect(isAppError(new AppError("test"))).toBe(true);
    expect(isAppError(new AuthenticationError())).toBe(true);
    expect(isAppError(new ValidationError("bad"))).toBe(true);
  });

  it("returns false for non-AppError", () => {
    expect(isAppError(new Error("standard"))).toBe(false);
    expect(isAppError("string")).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError({})).toBe(false);
  });
});

describe("isOperationalError", () => {
  it("returns true for operational AppError", () => {
    expect(isOperationalError(new AppError("test"))).toBe(true);
  });

  it("returns false for non-operational AppError", () => {
    const error = new AppError("test", 500, false);
    expect(isOperationalError(error)).toBe(false);
  });

  it("returns false for non-AppError", () => {
    expect(isOperationalError(new Error("standard"))).toBe(false);
  });
});

describe("toAppError", () => {
  it("returns AppError as-is", () => {
    const original = new ValidationError("bad", "field");
    expect(toAppError(original)).toBe(original);
  });

  it("wraps standard Error", () => {
    const error = toAppError(new Error("something broke"));
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("something broke");
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });

  it("wraps unknown values", () => {
    const error = toAppError("string error");
    expect(error).toBeInstanceOf(AppError);
    expect(error.isOperational).toBe(false);
  });

  it("wraps null", () => {
    const error = toAppError(null);
    expect(error).toBeInstanceOf(AppError);
    expect(error.isOperational).toBe(false);
  });
});

describe("getUserMessage", () => {
  it("returns message from AppError", () => {
    const error = new ValidationError("invalid");
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
