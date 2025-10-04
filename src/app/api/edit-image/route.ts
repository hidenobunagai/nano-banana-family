import { NextResponse } from "next/server";
import { GoogleGenAI, Part } from "@google/genai";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, resolveMimeType } from "@/utils/server/imageValidation";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "認証が必要です。" },
      { status: 401 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API キーが設定されていません。" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const prompt = formData.get("prompt");
  const file = formData.get("image");
  const secondary = formData.get("image_secondary");
  const secondaryFile = secondary instanceof File ? secondary : null;

  if (secondary !== null && !(secondary instanceof File)) {
    return NextResponse.json(
      { error: "2枚目の画像データを正しく受け取れませんでした。" },
      { status: 400 },
    );
  }

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "プロンプトを選択してください。" },
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

  if (secondaryFile && secondaryFile.size === 0) {
    return NextResponse.json(
      { error: "2枚目の画像ファイルが空でした。別のファイルをお試しください。" },
      { status: 400 },
    );
  }

  if (secondaryFile && secondaryFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `2枚目の画像サイズが大きすぎます。${MAX_FILE_SIZE_MB}MB 以下の画像をご利用ください。`,
      },
      { status: 413 },
    );
  }

  const resolvedMimeType = resolveMimeType(file);

  const secondaryMimeType = secondaryFile ? resolveMimeType(secondaryFile) : null;

  if (!resolvedMimeType) {
    return NextResponse.json(
      {
        error: "サポートされていない画像形式です。JPG、PNG、WebP形式の画像をご利用ください。",
      },
      { status: 415 },
    );
  }

  if (secondaryFile && !secondaryMimeType) {
    return NextResponse.json(
      {
        error: "2枚目の画像形式がサポート対象外です。JPG、PNG、WebP形式の画像をご利用ください。",
      },
      { status: 415 },
    );
  }
  const primaryBuffer = Buffer.from(await file.arrayBuffer());
  const secondaryBuffer = secondaryFile ? Buffer.from(await secondaryFile.arrayBuffer()) : null;

  try {
    const client = new GoogleGenAI({ apiKey });

    const parts: Part[] = [
      {
        inlineData: {
          data: primaryBuffer.toString("base64"),
          mimeType: resolvedMimeType,
        },
      },
    ];

    if (secondaryFile && secondaryMimeType && secondaryBuffer) {
      parts.push({
        inlineData: {
          data: secondaryBuffer.toString("base64"),
          mimeType: secondaryMimeType,
        },
      });
      parts.push({
        text: "First uploaded photo represents Player 1 (left fighter). Second uploaded photo represents Player 2 (right fighter).",
      });
    }

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
      return NextResponse.json(
        { error: "画像の生成に失敗しました。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ imageBase64: base64Data, mimeType: resultMime });
  } catch (error) {
    console.error("Gemini edit error", error);
    const errorMessage = error instanceof Error ? error.message : "画像編集中に予期しないエラーが発生しました。";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
