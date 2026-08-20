import { NextResponse } from "next/server";

import {
  authenticateRequest,
  checkUserRateLimit,
  validateApiKey,
  handleApiError,
  validateFormData,
} from "@/utils/server/api-helpers";
import { filesToParts } from "@/utils/server/imageProcessing";
import { generateImage } from "@/utils/server/imageGeneration";
import { FreestyleEditFormSchema } from "@/utils/server/validation";
import { fileFingerprint, generateCacheKey, imageGenerationCache } from "@/utils/server/cache";

export const runtime = "nodejs";
// Image generation takes 10-40s; the Vercel hobby default (10s) kills every call.
export const maxDuration = 300;

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
  const prompt = (formData.get("prompt") as string | null) || "";
  const imageEntries = formData.getAll("images");

  const files: File[] = imageEntries.filter((entry): entry is File => entry instanceof File);

  const parsed = validateFormData(FreestyleEditFormSchema, {
    prompt,
    images: files,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error, field: "form" }, { status: 400 });
  }
  const { prompt: trimmedPrompt, images: validatedFiles } = parsed.data;

  const cacheKey = generateCacheKey({
    prompt: trimmedPrompt,
    images: (await Promise.all(validatedFiles.map(fileFingerprint))).sort(),
  });
  const cached = imageGenerationCache.get<{ imageBase64: string; mimeType: string }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const partsResult = await filesToParts(validatedFiles);
    if ("error" in partsResult) {
      return NextResponse.json({ error: partsResult.error }, { status: partsResult.status });
    }
    const parts = partsResult.parts;

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

    const generationResult = await generateImage(
      apiKey,
      parts,
      "画像の生成に失敗しました。",
      AbortSignal.timeout(90_000),
    );
    if ("error" in generationResult) {
      return NextResponse.json(
        { error: generationResult.error },
        { status: generationResult.status },
      );
    }

    imageGenerationCache.set(cacheKey, generationResult);
    return NextResponse.json(generationResult);
  } catch (error) {
    return handleApiError(error, "freestyle-edit", session.user?.email ?? "unknown");
  }
}
