import { GoogleGenAI, type Part } from "@google/genai";
import { NextResponse } from "next/server";

import { buildIconPrompt, type IconStyleId } from "@/utils/server/iconPromptBuilder";
import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  resolveMimeType,
} from "@/utils/server/imageValidation";
import {
  authenticateRequest,
  checkUserRateLimit,
  validateApiKey,
  validateImageFile,
  handleApiError,
} from "@/utils/server/api-helpers";
import { logger } from "@/utils/server/logger";
import { fetchUrlMetadata } from "@/utils/server/urlMetadata";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview";
const MAX_IMAGE_COUNT = 3;
const OG_IMAGE_FETCH_TIMEOUT_MS = 5000;

export async function POST(request: Request) {
  // Authentication
  const authResult = await authenticateRequest();
  if ("response" in authResult) {
    return authResult.response;
  }
  const { session } = authResult;

  // Rate limiting
  const rateLimitResult = checkUserRateLimit(session.user?.email ?? "anonymous");
  if ("response" in rateLimitResult) {
    return rateLimitResult.response;
  }

  // API key validation
  const apiKeyResult = validateApiKey();
  if ("response" in apiKeyResult) {
    return apiKeyResult.response;
  }
  const apiKey = apiKeyResult.key;

  const formData = await request.formData();
  const name = formData.get("name");
  const url = formData.get("url");
  const style = (formData.get("style") as IconStyleId | null) ?? "auto";
  const customPrompt = formData.get("customPrompt");
  const imageEntries = formData.getAll("images");

  const files: File[] = imageEntries.filter((entry): entry is File => entry instanceof File);

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "連絡先名を入力してください。" }, { status: 400 });
  }

  if (
    typeof customPrompt === "string" &&
    customPrompt.trim().length > MAX_PROMPT_LENGTH
  ) {
    return NextResponse.json(
      { error: `追加の指示は${MAX_PROMPT_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    );
  }

  if (files.length > MAX_IMAGE_COUNT) {
    return NextResponse.json(
      { error: `画像は最大${MAX_IMAGE_COUNT}枚までアップロードできます。` },
      { status: 400 },
    );
  }

  const trimmedName = name.trim();
  const trimmedUrl = typeof url === "string" && url.trim().length > 0 ? url.trim() : null;
  const trimmedCustomPrompt =
    typeof customPrompt === "string" && customPrompt.trim().length > 0
      ? customPrompt.trim()
      : undefined;

  try {
    // Fetch URL metadata if URL is provided
    const urlMeta = trimmedUrl ? await fetchUrlMetadata(trimmedUrl) : null;

    // Build the prompt
    const prompt = buildIconPrompt({
      name: trimmedName,
      style,
      urlMeta,
      customPrompt: trimmedCustomPrompt,
    });

    const client = new GoogleGenAI({ apiKey });

    const parts: Part[] = [];

    // Add uploaded images
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const label = `画像${index + 1}`;

      const validation = validateImageFile(
        file,
        resolveMimeType,
        MAX_FILE_SIZE_BYTES,
        MAX_FILE_SIZE_MB,
        label
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: validation.status }
        );
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

    // If URL metadata has an OG image, fetch and include it as a reference image
    if (urlMeta?.ogImage) {
      try {
        const ogImageData = await fetchOgImage(urlMeta.ogImage);
        if (ogImageData) {
          parts.push({
            inlineData: {
              data: ogImageData.base64,
              mimeType: ogImageData.mimeType,
            },
          });
        }
      } catch {
        // OG image fetch failure is non-critical, continue without it
      }
    }

    // Add the prompt text
    parts.push({ text: prompt });

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    });

    const responseParts = response.candidates?.[0]?.content?.parts ?? [];
    const imageResult = responseParts.find((part) => part.inlineData?.data);
    const base64Data = imageResult?.inlineData?.data;
    const resultMime = imageResult?.inlineData?.mimeType ?? "image/png";

    if (!base64Data) {
      return NextResponse.json({ error: "アイコンの生成に失敗しました。" }, { status: 502 });
    }

    return NextResponse.json({ imageBase64: base64Data, mimeType: resultMime });
  } catch (error) {
    return handleApiError(
      error,
      logger,
      "icon-generate",
      session.user?.email ?? "unknown",
      "アイコン生成中に予期しないエラーが発生しました。"
    );
  }
}

/**
 * Fetch an OG image and return its base64 data plus mime type.
 */
async function fetchOgImage(
  imageUrl: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OG_IMAGE_FETCH_TIMEOUT_MS);

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

    // Limit to 4MB to avoid memory issues
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
