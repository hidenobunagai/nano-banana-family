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
    return NextResponse.json({ error: "プロンプトを選択してください。" }, { status: 400 });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `プロンプトは${MAX_PROMPT_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "画像ファイルが添付されていません。" }, { status: 400 });
  }

  // Validate primary image
  const primaryValidation = validateImageFile(
    file,
    resolveMimeType,
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB
  );
  if (!primaryValidation.valid) {
    return NextResponse.json(
      { error: primaryValidation.error },
      { status: primaryValidation.status }
    );
  }
  const resolvedMimeType = resolveMimeType(file)!;

  // Validate secondary image if present
  let secondaryMimeType: string | null = null;
  if (secondaryFile) {
    const secondaryValidation = validateImageFile(
      secondaryFile,
      resolveMimeType,
      MAX_FILE_SIZE_BYTES,
      MAX_FILE_SIZE_MB,
      "2枚目の画像"
    );
    if (!secondaryValidation.valid) {
      return NextResponse.json(
        { error: secondaryValidation.error },
        { status: secondaryValidation.status }
      );
    }
    secondaryMimeType = resolveMimeType(secondaryFile)!;
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

    const enhancedPrompt = [
      "CRITICAL INSTRUCTION:",
      "You MUST preserve the exact facial features, identity, and likeness of the person in the uploaded reference image(s).",
      "The generated person MUST look 100% identical to the reference.",
      "Do not alter their face, age, or ethnicity unless explicitly requested.",
      "---",
      "User Prompt:",
      prompt,
    ].join("\n");

    parts.push({ text: enhancedPrompt });

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
      "edit-image",
      session.user?.email ?? "unknown",
      "画像編集中に予期しないエラーが発生しました。"
    );
  }
}
