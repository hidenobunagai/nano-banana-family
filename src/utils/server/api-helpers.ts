import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/utils/server/logger";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  resolveMimeType,
} from "@/utils/server/imageValidation";
import { toAppError, getUserMessage } from "@/utils/errors";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  status?: number;
}

export function validateImageFile(file: File, label?: string): ValidationResult {
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
  const errorMessage = result.error.issues.map((issue: z.ZodIssue) => issue.message).join(", ");
  return { success: false, error: errorMessage };
}

export function handleApiError(error: unknown, routeName: string, userId: string): NextResponse {
  const appError = toAppError(error);
  logger.error(`${routeName} error`, error, {
    route: routeName,
    userId,
    status: appError.statusCode,
  });
  return NextResponse.json({ error: getUserMessage(appError) }, { status: appError.statusCode });
}
