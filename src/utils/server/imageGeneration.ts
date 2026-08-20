/**
 * Shared Gemini image generation for API routes.
 * Encapsulates the client setup, content generation call, and
 * image-part extraction so route handlers stay focused on
 * validation, caching, and prompt construction.
 */

import { GoogleGenAI, type Part } from "@google/genai";
import { ImageGenerationResponseSchema } from "@/utils/server/validation";

const FALLBACK_MODEL = "gemini-3.1-flash-lite-image";
function getDefaultModel(): string {
  return process.env.GEMINI_IMAGE_MODEL ?? FALLBACK_MODEL;
}

export interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
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
): Promise<GeneratedImage | { error: string; status: number }> {
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models
    .generateContent({
      model: getDefaultModel(),
      contents: [{ role: "user", parts }],
      config: abortSignal ? { abortSignal } : undefined,
    })
    .catch((error: unknown) => {
      if (abortSignal?.aborted) {
        return null;
      }
      throw error;
    });

  if (!response) {
    return { error: "生成がタイムアウトしました。時間をおいて再度お試しください。", status: 504 };
  }

  const responseParts = response.candidates?.[0]?.content?.parts ?? [];
  const imageResult = responseParts.find((part) => part.inlineData?.data);
  const base64Data = imageResult?.inlineData?.data;
  const mimeType = imageResult?.inlineData?.mimeType ?? "image/png";

  if (!base64Data) {
    return { error: failureMessage, status: 502 };
  }

  return ImageGenerationResponseSchema.parse({ imageBase64: base64Data, mimeType });
}
