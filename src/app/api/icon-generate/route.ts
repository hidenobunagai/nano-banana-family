import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import {
  buildIconPrompt,
  type IconStyleId,
} from "@/utils/server/iconPromptBuilder";
import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import {
  authenticateRequest,
  checkUserRateLimit,
  validateApiKey,
  handleApiError,
  validateFormData,
} from "@/utils/server/api-helpers";
import { filesToParts, fetchOgImage } from "@/utils/server/imageProcessing";
import { logger } from "@/utils/server/logger";
import { fetchUrlMetadata } from "@/utils/server/urlMetadata";
import {
  IconGenerateFormSchema,
  ImageGenerationResponseSchema,
} from "@/utils/server/validation";
import { generateCacheKey, imageGenerationCache } from "@/utils/server/cache";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-lite-image";
const MAX_IMAGE_COUNT = 3;

export async function POST(request: Request) {
  const authResult = await authenticateRequest();
  if ("response" in authResult) return authResult.response;
  const { session } = authResult;

  const rateLimitResult = checkUserRateLimit(session.user?.email ?? "anonymous");
  if ("response" in rateLimitResult) return rateLimitResult.response;

  const apiKeyResult = validateApiKey();
  if ("response" in apiKeyResult) return apiKeyResult.response;
  const apiKey = apiKeyResult.key;

  const formData = await request.formData();
  const name = (formData.get("name") as string | null) || "";
  const url = (formData.get("url") as string | null) || undefined;
  const style = (formData.get("style") as IconStyleId | null) || undefined;
  const customPrompt = (formData.get("customPrompt") as string | null) || undefined;
  const imageEntries = formData.getAll("images");

  const files: File[] = imageEntries.filter((entry): entry is File => entry instanceof File);

  const parsed = validateFormData(IconGenerateFormSchema, {
    name,
    url,
    style,
    customPrompt,
    images: files,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error, field: "form" },
      { status: 400 },
    );
  }
  const {
    name: trimmedName,
    url: trimmedUrl,
    style: validatedStyle,
    customPrompt: trimmedCustomPrompt,
    images: validatedFiles,
  } = parsed.data;

  const resolvedStyle = typeof validatedStyle === "string" ? validatedStyle : "auto";

  const cacheKey = generateCacheKey({
    name: trimmedName,
    url: trimmedUrl ?? "",
    style: resolvedStyle,
    customPrompt: trimmedCustomPrompt ?? "",
    images: validatedFiles.map((f) => `${f.name}:${f.size}:${f.type}`).sort(),
  });
  const cached = imageGenerationCache.get<{ imageBase64: string; mimeType: string }>(
    cacheKey,
  );
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const urlMeta = trimmedUrl ? await fetchUrlMetadata(trimmedUrl) : null;

    const prompt = buildIconPrompt({
      name: trimmedName,
      style: resolvedStyle as import("@/utils/server/iconPromptBuilder").IconStyleId,
      urlMeta,
      customPrompt: trimmedCustomPrompt,
    });

    const partsResult = await filesToParts(validatedFiles);
    if ("error" in partsResult) {
      return NextResponse.json({ error: partsResult.error }, { status: partsResult.status });
    }
    const parts = partsResult.parts;

    if (urlMeta?.ogImage) {
      try {
        const ogImageData = await fetchOgImage(urlMeta.ogImage, 5000, trimmedUrl);
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
    parts.push({ text: prompt });

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: "user", parts }],
    });

    const responseParts = response.candidates?.[0]?.content?.parts ?? [];
    const imageResult = responseParts.find((part) => part.inlineData?.data);
    const base64Data = imageResult?.inlineData?.data;
    const resultMime = imageResult?.inlineData?.mimeType ?? "image/png";

    if (!base64Data) {
      return NextResponse.json({ error: "アイコンの生成に失敗しました。" }, { status: 502 });
    }

    const result = { imageBase64: base64Data, mimeType: resultMime };
    const validated = ImageGenerationResponseSchema.parse(result);
    imageGenerationCache.set(cacheKey, validated);

    return NextResponse.json(validated);
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
