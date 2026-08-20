/**
 * Application error with an HTTP status code.
 */

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // 500-level internal messages (SDK errors, model names, URLs) must not
    // reach the client; getUserMessage would otherwise pass them through.
    const message =
      process.env.NODE_ENV === "production"
        ? "予期しないエラーが発生しました。"
        : error.message;
    return new AppError(message, 500);
  }

  return new AppError("予期しないエラーが発生しました。", 500);
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Don't expose internal error messages in production
    if (process.env.NODE_ENV === "production") {
      return "エラーが発生しました。しばらくしてからもう一度お試しください。";
    }
    return error.message;
  }

  return "エラーが発生しました。しばらくしてからもう一度お試しください。";
}
