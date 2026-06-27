import { type Part } from "@google/genai";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  resolveMimeType,
} from "@/utils/server/imageValidation";
import { validateImageFile } from "@/utils/server/api-helpers";

/**
 * Convert files to Gemini API inline data parts with validation.
 * Returns parts on success or an error response object.
 */
export async function filesToParts(
  files: File[],
  startLabelIndex: number = 1,
): Promise<{ parts: Part[] } | { error: string; status: number }> {
  const parts: Part[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const label = `画像${startLabelIndex + index}`;

    const validation = validateImageFile(
      file,
      resolveMimeType,
      MAX_FILE_SIZE_BYTES,
      MAX_FILE_SIZE_MB,
      label,
    );
    if (!validation.valid) {
      return { error: validation.error!, status: validation.status! };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = resolveMimeType(file)!;

    parts.push({
      inlineData: {
        data: buffer.toString("base64"),
        mimeType,
      },
    });
  }

  return { parts };
}

/**
 * Fetch an OG image and return its base64 data plus mime type.
 */
export async function fetchOgImage(
  imageUrl: string,
  timeoutMs: number = 5000,
): Promise<{ base64: string; mimeType: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        Accept: "image/*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 4 * 1024 * 1024) return null;

    const mimeType = contentType.split(";")[0].trim();
    return {
      base64: buffer.toString("base64"),
      mimeType,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
