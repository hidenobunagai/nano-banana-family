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
import { CreateStoryFormSchema } from "@/utils/server/validation";
import { fileFingerprint, generateCacheKey, imageGenerationCache } from "@/utils/server/cache";

export const runtime = "nodejs";
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
  const storyType = (formData.get("storyType") as string | null) || "picture-book";
  const tone = (formData.get("tone") as string | null) || "funny";
  const language = (formData.get("language") as string | null) || "ja";
  const customPrompt = (formData.get("customPrompt") as string | null) || undefined;
  const imageEntries = formData.getAll("images");

  const files: File[] = imageEntries.filter((entry): entry is File => entry instanceof File);

  const parsed = validateFormData(CreateStoryFormSchema, {
    storyType,
    tone,
    language,
    customPrompt,
    images: files,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error, field: "form" }, { status: 400 });
  }

  const {
    storyType: validStoryType,
    tone: validTone,
    language: validLang,
    customPrompt: trimmedCustomPrompt,
    images: validatedFiles,
  } = parsed.data;

  const cacheKey = generateCacheKey({
    storyType: validStoryType,
    tone: validTone,
    language: validLang,
    customPrompt: trimmedCustomPrompt ?? "",
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

    const typeDescription =
      validStoryType === "picture-book"
        ? "温かみのある絵本風のイラストと物語（ページレイアウト）"
        : validStoryType === "comic"
          ? "面白おかしい4コマ漫画・アメコミ風のコマ割りイラスト（吹き出しとセリフ付き）"
          : "ユーモアあふれる家族新聞・観察レポート風のレイアウト（見出し、記事、写真解説）";

    const toneDescription =
      validTone === "funny"
        ? "くすっと笑えるユーモアとツッコミ満載の面白いトーン"
        : validTone === "cute"
          ? "とっても可愛らしく愛らしいトーン"
          : validTone === "adventure"
            ? "ワクワクする大冒険・ファンタジートーン"
            : "心温まる家族の絆を感じるほのぼのトーン";

    const langInstruction = validLang === "en" ? "英語（簡単な子供向け英語）" : "自然な日本語";

    parts.push({
      text: [
        "あなたは家族専用アプリ「Hide NB Studio」の専属ストーリー作家・イラストレーターです。",
        "【最重要指示】アップロードされた写真の人物の顔の特徴、表情、アイデンティティを正確に保持し、写真に写っている家族メンバーが主人公となる作品を作成してください。",
        `【制作形式】: ${typeDescription}`,
        `【トーン】: ${toneDescription}`,
        `【言語】: ${langInstruction}`,
        trimmedCustomPrompt ? `【追加の要望】: ${trimmedCustomPrompt}` : "",
        "写真の状況を読み取り、見る人を笑顔にする素晴らしい1枚の完成作品画像を生成してください。",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const generationResult = await generateImage(
      apiKey,
      parts,
      "ストーリー画像の生成に失敗しました。",
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
    return handleApiError(error, "create-story", session.user?.email ?? "unknown");
  }
}
