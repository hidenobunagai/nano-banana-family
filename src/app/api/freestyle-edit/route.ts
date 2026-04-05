import { GoogleGenAI, Part } from "@google/genai";
import { NextResponse } from "next/server";

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

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview";
const MAX_IMAGE_COUNT = 5;

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
  const prompt = formData.get("prompt");
  const imageEntries = formData.getAll("images");
  const additionalImage = formData.get("image");

  const files: File[] = imageEntries.filter((entry): entry is File => entry instanceof File);

  if (files.length === 0 && additionalImage instanceof File) {
    files.push(additionalImage);
  }

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "編集内容を入力してください。" }, { status: 400 });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `編集内容は${MAX_PROMPT_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    );
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "画像を1枚以上アップロードしてください。" }, { status: 400 });
  }

  if (files.length > MAX_IMAGE_COUNT) {
    return NextResponse.json(
      { error: `画像は最大${MAX_IMAGE_COUNT}枚までアップロードできます。` },
      { status: 400 },
    );
  }

  const trimmedPrompt = prompt.trim();

  try {
    const client = new GoogleGenAI({ apiKey });

    const parts: Part[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const label = `画像${index + 1}`;

      const validation = validateImageFile(
        file,
        resolveMimeType,
        MAX_FILE_SIZE_BYTES,
        MAX_FILE_SIZE_MB,
        label,
      );
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: validation.status });
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
      return NextResponse.json({ error: "画像の生成に失敗しました。" }, { status: 502 });
    }

    return NextResponse.json({ imageBase64: base64Data, mimeType: resultMime });
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
