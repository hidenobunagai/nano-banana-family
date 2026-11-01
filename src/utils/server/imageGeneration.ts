/**
 * Shared Gemini image generation for API routes.
 * Encapsulates the client setup, content generation call, and
 * image-part extraction so route handlers stay focused on
 * validation and prompt construction.
 */

import {
  ApiError,
  BlockedReason,
  FinishReason,
  GoogleGenAI,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";

import { GENERATION_ERROR_MESSAGES } from "@/utils/generationErrorMessages";
import { logger } from "@/utils/server/logger";
import { ImageGenerationResponseSchema } from "@/utils/server/validation";

const FALLBACK_MODEL = "gemini-3.1-flash-lite-image";
function getDefaultModel(): string {
  return process.env.GEMINI_IMAGE_MODEL ?? FALLBACK_MODEL;
}

/**
 * Deadline for one image generation call. Image generation takes 10-40s, so
 * this sits well under `maxDuration` (300s) while still cutting off a stuck
 * request. Route handlers pass it as `AbortSignal.timeout(...)`.
 */
export const IMAGE_GENERATION_TIMEOUT_MS = 90_000;

const TIMEOUT_MESSAGE = "生成がタイムアウトしました。時間をおいて再度お試しください。";

export interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
}

/** A failure the route can return to the client as-is. */
export interface GenerationFailure {
  error: string;
  status: number;
}

/**
 * Finish reasons that mean the model stopped for safety or policy reasons.
 * The values come from the SDK enum, so they cannot drift from it.
 */
const SAFETY_FINISH_REASONS = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
  FinishReason.IMAGE_SAFETY,
  FinishReason.IMAGE_PROHIBITED_CONTENT,
]);

/** Prompt block reasons that mean the request was refused by the filters. */
const SAFETY_BLOCK_REASONS = new Set<string>([
  BlockedReason.SAFETY,
  BlockedReason.BLOCKLIST,
  BlockedReason.PROHIBITED_CONTENT,
  BlockedReason.IMAGE_SAFETY,
]);

/**
 * Translate an SDK failure into a user-facing failure.
 *
 * Only the numeric status is used: the SDK message may name models, quotas or
 * internal URLs, so it never reaches the client. Unmapped statuses keep the
 * generic error path.
 */
function mapGeminiError(error: ApiError): GenerationFailure | null {
  switch (error.status) {
    case 400:
      return { error: GENERATION_ERROR_MESSAGES.invalidRequest, status: 400 };
    case 429:
      return { error: GENERATION_ERROR_MESSAGES.rateLimited, status: 429 };
    case 500:
    case 503:
    case 504:
      return { error: GENERATION_ERROR_MESSAGES.serviceUnavailable, status: 503 };
    default:
      return null;
  }
}

/**
 * Whether the response was stopped by a safety or policy filter.
 * Blocked prompts carry no candidate at all, so the prompt feedback is the
 * only signal; blocked generations still carry a finish reason.
 */
function isSafetyBlock(response: GenerateContentResponse): boolean {
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason && SAFETY_BLOCK_REASONS.has(blockReason)) {
    return true;
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  return Boolean(finishReason && SAFETY_FINISH_REASONS.has(finishReason));
}

/**
 * Generate one image from the given content parts.
 * Returns the validated image payload, or an error response descriptor
 * when Gemini returns no image (mirrors the `filesToParts` result shape).
 * Unexpected errors (network, API) propagate to the caller's error handling.
 * When `abortSignal` fires (caller-side deadline), returns a 504 descriptor
 * instead of letting the request run until the platform timeout.
 */
export async function generateImage(
  apiKey: string,
  parts: Part[],
  failureMessage: string,
  abortSignal?: AbortSignal,
): Promise<GeneratedImage | GenerationFailure> {
  const client = new GoogleGenAI({ apiKey });

  let response: GenerateContentResponse;
  try {
    response = await client.models.generateContent({
      model: getDefaultModel(),
      contents: [{ role: "user", parts }],
      config: abortSignal ? { abortSignal } : undefined,
    });
  } catch (error) {
    if (abortSignal?.aborted) {
      return { error: TIMEOUT_MESSAGE, status: 504 };
    }

    if (error instanceof ApiError) {
      logger.error("gemini image generation failed", error, { status: error.status });
      const failure = mapGeminiError(error);
      if (failure) {
        return failure;
      }
    }

    throw error;
  }

  const responseParts = response.candidates?.[0]?.content?.parts ?? [];
  const imageResult = responseParts.find((part) => part.inlineData?.data);
  const base64Data = imageResult?.inlineData?.data;
  const mimeType = imageResult?.inlineData?.mimeType ?? "image/png";

  if (!base64Data) {
    if (isSafetyBlock(response)) {
      return { error: GENERATION_ERROR_MESSAGES.safetyBlocked, status: 422 };
    }
    return { error: failureMessage, status: 502 };
  }

  return ImageGenerationResponseSchema.parse({ imageBase64: base64Data, mimeType });
}
