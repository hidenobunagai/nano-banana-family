import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import {
  authenticateRequest,
  checkUserRateLimit,
  validateApiKey,
  handleApiError,
  validateFormData,
} from "@/utils/server/api-helpers";
import { filesToParts } from "@/utils/server/imageProcessing";
import { logger } from "@/utils/server/logger";
import {
  FreestyleEditFormSchema,
  ImageGenerationResponseSchema,
} from "@/utils/server/validation";
import { generateCacheKey, imageGenerationCache } from "@/utils/server/cache";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-lite-image";
const MAX_IMAGE_COUNT = 5;

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
  const prompt = formData.get("prompt");
  const imageEntries = formData.getAll("images");
  const additionalImage = formData.get("image");

  const files: File[] = imageEntries.filter((entry): entry is File => entry instanceof File);
  if (files.length === 0 && additionalImage instanceof File) {
    files.push(additionalImage);
  }

  const parsed = validateFormData(FreestyleEditFormSchema, {
    prompt,
    images: files,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error, field: "form" },
      { status: 400 },
    );
  }
  const { prompt: trimmedPrompt, images: validatedFiles } = parsed.data;

  const cacheKey = generateCacheKey({
    prompt: trimmedPrompt,
    images: validatedFiles.map((f) => `${f.name}:${f.size}:${f.type}`).sort(),
  });
  const cached = imageGenerationCache.get<{ imageBase64: string; mimeType: string }>(
    cacheKey,
  );
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const partsResult = await filesToParts(validatedFiles);
    if ("error" in partsResult) {
      return NextResponse.json({ error: partsResult.error }, { status: partsResult.status });
    }
    const parts = partsResult.parts;

    const client = new GoogleGenAI({ apiKey });

    parts.push({
      text: [
        "あなたはHide NB Studioファミリーアプリのクリエイティブな画像編集アシスタントです。",
        "重要な指示: アップロードされた参照画像の人物の顔の特徴、アイデンティティ、類似性を正確に保持してください。生成される人物は参照画像と100%同一である必要があります。",
        "アップロードされた画像は純粋に視覚的な参照として使用します。",
        "各参照の主要な要素を順番にブレンドし、最初のアップロードを最も強いガイダンスとして保持してください。",
        "ユーザーの指示に正確に従い、完成した画像を1枚返してください。",
        "ユーザーの指示:",
        trimmedPrompt,
      ].join("\n"),
    });

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: "user", parts }],
    });

    const responseParts = response.candidates?.[0]?.content?.parts ?? [];
    const imageResult = responseParts.find((part) => part.inlineData?.data);
    const base64Data = imageResult?.inlineData?.data;
    const resultMime = imageResult?.inlineData?.mimeType ?? "image/png";

    if (!base64Data) {
      return NextResponse.json({ error: "画像の生成に失敗しました。" }, { status: 502 });
    }

    const result = { imageBase64: base64Data, mimeType: resultMime };
    const validated = ImageGenerationResponseSchema.parse(result);
    imageGenerationCache.set(cacheKey, validated);

    return NextResponse.json(validated);
  } catch (error) {
    return handleApiError(
      error,
      logger,
      "freestyle-edit",
      session.user?.email ?? "unknown",
      "画像生成中に予期しないエラーが発生しました。",
    );
  }
}
