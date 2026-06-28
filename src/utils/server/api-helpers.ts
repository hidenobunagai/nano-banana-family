import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/auth";
import { checkRateLimit } from "@/utils/server/rateLimit";
import { logger } from "@/utils/server/logger";
import { AppError, isAppError, toAppError, getUserMessage } from "@/utils/errors";

export interface ApiRouteConfig {
  routeName: string;
  maxImages?: number;
  validatePrompt?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  status?: number;
}

export async function authenticateRequest(): Promise<
  { session: { user: { email?: string | null } } } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new AppError("認証が必要です。", 401);
  }
  return { session: session as { user: { email?: string | null } } };
}

export function checkUserRateLimit(
  userId: string,
): { allowed: true } | { response: NextResponse } {
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    throw new AppError(
      `リクエストが多すぎます。${rateLimit.retryAfter ?? 60}秒後にもう一度お試しください。`,
      429,
    );
  }
  return { allowed: true };
}

export function validateApiKey(): { key: string } | { response: NextResponse } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError("Gemini API キーが設定されていません。", 500);
  }
  return { key: apiKey };
}

export function validateImageFile(
  file: File,
  resolveMimeType: (file: File) => string | null,
  MAX_FILE_SIZE_BYTES: number,
  MAX_FILE_SIZE_MB: number,
  label?: string,
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

export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.issues
    .map((issue: z.ZodIssue) => issue.message)
    .join(", ");
  return { success: false, error: errorMessage };
}

export function handleApiError(
  error: unknown,
  loggerInstance: { error: (message: string, err?: unknown, fields?: Record<string, unknown>) => void },
  routeName: string,
  userId: string,
  fallbackMessage: string,
): NextResponse {
  const appError = toAppError(error);
  loggerInstance.error(`${routeName} error`, error, {
    route: routeName,
    userId,
    status: appError.statusCode,
  });
  return NextResponse.json(
    { error: getUserMessage(appError) },
    { status: appError.statusCode },
  );
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
