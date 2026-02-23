import { GoogleGenAI, Part } from "@google/genai";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  resolveMimeType,
} from "@/utils/server/imageValidation";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview";
const MAX_IMAGE_COUNT = 5;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API キーが設定されていません。" }, { status: 500 });
  }

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

      if (file.size === 0) {
        return NextResponse.json(
          { error: `画像${index + 1}が空のファイルでした。別の画像をお試しください。` },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `画像${index + 1}のサイズが大きすぎます。${MAX_FILE_SIZE_MB}MB 以下の画像をご利用ください。`,
          },
          { status: 413 },
        );
      }

      const resolvedMimeType = resolveMimeType(file);

      if (!resolvedMimeType) {
        return NextResponse.json(
          {
            error: `画像${index + 1}の形式がサポート対象外です。JPG、PNG、WebP形式の画像をご利用ください。`,
          },
          { status: 415 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      parts.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: resolvedMimeType,
        },
      });
    }

    parts.push({
      text: [
        "You are a helpful creative image editor for the Hide NB Studio family app.",
        "CRITICAL INSTRUCTION: You MUST preserve the exact facial features, identity, and likeness of the person in the uploaded reference image(s). The generated person MUST look 100% identical to the reference.",
        "Use the uploaded images purely as visual references.",
        "Blend the key elements from each reference in order, keeping the first uploads as the strongest guidance.",
        "Follow the user's instructions precisely and return exactly one polished image.",
        "User instructions:",
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
    console.error("Gemini freestyle edit error", error);
    const errorMessage =
      error instanceof Error ? error.message : "画像生成中に予期しないエラーが発生しました。";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
