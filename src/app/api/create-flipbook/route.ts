import { NextResponse } from "next/server";
import { GoogleGenAI, Part } from "@google/genai";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, resolveMimeType } from "@/utils/server/imageValidation";

export const runtime = "nodejs";

const DEFAULT_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image-preview";

const FRAME_COUNT = 4;

const FRAME_NARRATIVE_GUIDANCE = [
  "オリジナル画像の雰囲気を保ちながら舞台設定とキャラクターを紹介してください。",
  "キャラクターに少し動きをつけて物語の始まりを描写してください。",
  "アクションや感情が高まる場面に発展させてください。",
  "物語のクライマックスから余韻までをまとめ、動きの余韻が分かる構図にしてください。",
];

const buildFramePrompt = (storyIdea: string, frameIndex: number) => {
  const guidance =
    FRAME_NARRATIVE_GUIDANCE[frameIndex] ?? FRAME_NARRATIVE_GUIDANCE[FRAME_NARRATIVE_GUIDANCE.length - 1];
  return [
    "You are generating a single frame of a story-driven flipbook animation.",
    "Respect the uploaded reference image and keep the main character(s), colors, and atmosphere consistent across all frames.",
    "The flipbook must feel like it is expanding upon the reference scene with gentle motion between frames.",
    `This is frame ${frameIndex + 1} of ${FRAME_COUNT}. ${guidance}`,
    "Describe motion by adjusting body pose, facial expression, and environment details slightly so that the next frame flows naturally from this one.",
    "Do not add text, UI, or speech bubbles.",
    `Overall story idea from the user: ${storyIdea}`,
  ].join("\n");
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API キーが設定されていません。" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const storyIdea = formData.get("story");
  const file = formData.get("image");

  if (typeof storyIdea !== "string" || storyIdea.trim().length === 0) {
    return NextResponse.json(
      { error: "ストーリーのアイデアを入力してください。" },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "画像ファイルが添付されていません。" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "空の画像ファイルは処理できません。" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `画像サイズが大きすぎます。${MAX_FILE_SIZE_MB}MB 以下の画像をご利用ください。`,
      },
      { status: 413 },
    );
  }

  const resolvedMimeType = resolveMimeType(file);

  if (!resolvedMimeType) {
    return NextResponse.json(
      {
        error: "サポートされていない画像形式です。JPG、PNG、WebP形式の画像をご利用ください。",
      },
      { status: 415 },
    );
  }

  const referenceBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const client = new GoogleGenAI({ apiKey });

    const referencePart: Part = {
      inlineData: {
        data: referenceBuffer.toString("base64"),
        mimeType: resolvedMimeType,
      },
    };

    const frames: { imageBase64: string; mimeType: string }[] = [];

    for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex++) {
      const prompt = buildFramePrompt(storyIdea, frameIndex);

      const response = await client.models.generateContent({
        model: DEFAULT_IMAGE_MODEL,
        contents: [
          {
            role: "user",
            parts: [referencePart, { text: prompt }],
          },
        ],
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imageResult = parts.find((part) => part.inlineData?.data);
      const base64Data = imageResult?.inlineData?.data;
      const resultMime = imageResult?.inlineData?.mimeType ?? "image/png";

      if (!base64Data) {
        return NextResponse.json(
          { error: `フレーム${frameIndex + 1}の生成に失敗しました。` },
          { status: 502 },
        );
      }

      frames.push({ imageBase64: base64Data, mimeType: resultMime });
    }

    return NextResponse.json({ frames });
  } catch (error) {
    console.error("Gemini flipbook error", error);
    const errorMessage =
      error instanceof Error ? error.message : "パラパラ漫画の作成中に予期しないエラーが発生しました。";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
