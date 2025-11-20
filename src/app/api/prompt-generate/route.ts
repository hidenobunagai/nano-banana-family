import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が正しくありません。" },
      { status: 400 },
    );
  }

  const promptValue = typeof body === "object" && body !== null ? (body as { prompt?: unknown }).prompt : undefined;
  const prompt = typeof promptValue === "string" ? promptValue.trim() : "";

  if (prompt.length === 0) {
    return NextResponse.json(
      { error: "プロンプトを入力してください。" },
      { status: 400 },
    );
  }

  try {
    const client = new GoogleGenAI({ apiKey });

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You are a helpful creative image generator for the Hide NB Studio family app.",
                "Produce exactly one high-quality final image based solely on the user's prompt.",
                "Avoid adding any text, logos, or watermarks unless the user explicitly requests them.",
                "User prompt:",
                prompt,
              ].join("\n"),
            },
          ],
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
    console.error("Gemini prompt-only generation error", error);
    const errorMessage =
      error instanceof Error ? error.message : "画像生成中に予期しないエラーが発生しました。";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
