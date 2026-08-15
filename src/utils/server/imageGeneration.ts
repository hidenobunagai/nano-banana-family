/**
 * Shared Gemini image generation for API routes.
 * Encapsulates the client setup, content generation call, and
 * image-part extraction so route handlers stay focused on
 * validation, caching, and prompt construction.
 */

import { GoogleGenAI, type Part } from "@google/genai";
import { ImageGenerationResponseSchema } from "@/utils/server/validation";

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-lite-image";

export interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
}

/**
 * Generate one image from the given content parts.
 * Returns the validated image payload, or an error response descriptor
 * when Gemini returns no image (mirrors the `filesToParts` result shape).
 * Unexpected errors (network, API) propagate to the caller's error handling.
 */
export async function generateImage(
  apiKey: string,
  parts: Part[],
  failureMessage: string,
): Promise<GeneratedImage | { error: string; status: number }> {
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: "user", parts }],
  });

  const responseParts = response.candidates?.[0]?.content?.parts ?? [];
  const imageResult = responseParts.find((part) => part.inlineData?.data);
  const base64Data = imageResult?.inlineData?.data;
  const mimeType = imageResult?.inlineData?.mimeType ?? "image/png";

  if (!base64Data) {
    return { error: failureMessage, status: 502 };
  }

  return ImageGenerationResponseSchema.parse({ imageBase64: base64Data, mimeType });
}
