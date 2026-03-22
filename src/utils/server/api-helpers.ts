import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { checkRateLimit } from "@/utils/server/rateLimit";

/**
 * Common API route helpers to reduce code duplication
 */

export interface ApiRouteConfig {
  /** Route name for logging */
  routeName: string;
  /** Maximum number of images allowed (optional) */
  maxImages?: number;
  /** Whether to validate prompt length */
  validatePrompt?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  status?: number;
}

/**
 * Authenticate the request and return session or error response
 */
export async function authenticateRequest(): Promise<
  { session: { user: { email?: string | null } } } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      response: NextResponse.json({ error: "認証が必要です。" }, { status: 401 }),
    };
  }

  return { session: session as { user: { email?: string | null } } };
}

/**
 * Check rate limit for the authenticated user
 */
export function checkUserRateLimit(
  userId: string
): { allowed: true } | { response: NextResponse } {
  const rateLimit = checkRateLimit(userId);

  if (!rateLimit.allowed) {
    return {
      response: NextResponse.json(
        {
          error: `リクエストが多すぎます。${rateLimit.retryAfter ?? 60}秒後にもう一度お試しください。`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfter ?? 60) },
        }
      ),
    };
  }

  return { allowed: true };
}

/**
 * Validate that Gemini API key is configured
 */
export function validateApiKey(): { key: string } | { response: NextResponse } {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      response: NextResponse.json(
        { error: "Gemini API キーが設定されていません。" },
        { status: 500 }
      ),
    };
  }

  return { key: apiKey };
}

/**
 * Validate image file (size, format)
 */
export function validateImageFile(
  file: File,
  resolveMimeType: (file: File) => string | null,
  MAX_FILE_SIZE_BYTES: number,
  MAX_FILE_SIZE_MB: number,
  label?: string
): ValidationResult {
  if (file.size === 0) {
    return {
      valid: false,
      error: label
        ? `${label}が空のファイルでした。別のファイルをお試しください。`
        : "空の画像ファイルは処理できません。",
      status: 400,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: label
        ? `${label}のサイズが大きすぎます。${MAX_FILE_SIZE_MB}MB 以下の画像をご利用ください。`
        : `画像サイズが大きすぎます。${MAX_FILE_SIZE_MB}MB 以下の画像をご利用ください。`,
      status: 413,
    };
  }

  const mimeType = resolveMimeType(file);
  if (!mimeType) {
    return {
      valid: false,
      error: label
        ? `${label}の形式がサポート対象外です。JPG、PNG、WebP形式の画像をご利用ください。`
        : "サポートされていない画像形式です。JPG、PNG、WebP形式の画像をご利用ください。",
      status: 415,
    };
  }

  return { valid: true };
}

/**
 * Standard error handler for API routes
 */
export function handleApiError(
  error: unknown,
  logger: { error: (message: string, error?: unknown, fields?: Record<string, unknown>) => void },
  routeName: string,
  userId: string,
  fallbackMessage: string
): NextResponse {
  logger.error(`${routeName} error`, error, { route: routeName, userId });
  const errorMessage =
    error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: errorMessage }, { status: 500 });
}

/**
 * Check if request was aborted
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}