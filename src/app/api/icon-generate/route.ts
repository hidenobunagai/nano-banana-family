import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { buildIconPrompt, type IconStyleId } from "@/utils/server/iconPromptBuilder";
import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import {
  authenticateRequest,
  checkUserRateLimit,
  validateApiKey,
  handleApiError,
} from "@/utils/server/api-helpers";
import { filesToParts, fetchOgImage } from "@/utils/server/imageProcessing";
import { logger } from "@/utils/server/logger";
import { fetchUrlMetadata } from "@/utils/server/urlMetadata";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview";
const MAX_IMAGE_COUNT = 3;

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

  if (typeof customPrompt === "string" && customPrompt.trim().length > MAX_PROMPT_LENGTH) {
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

    const partsResult = await filesToParts(files);
    if ("error" in partsResult) {
      return NextResponse.json({ error: partsResult.error }, { status: partsResult.status });
    }
    const parts = partsResult.parts;

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

    const client = new GoogleGenAI({ apiKey });

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
      "アイコン生成中に予期しないエラーが発生しました。",
    );
  }
}


