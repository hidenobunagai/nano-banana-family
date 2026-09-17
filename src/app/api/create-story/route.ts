import { NextResponse } from "next/server";

import { withApiAuth } from "@/utils/server/withApiAuth";
import { handleApiError, validateFormData } from "@/utils/server/api-helpers";
import { filesToParts } from "@/utils/server/imageProcessing";
import { generateImage, IMAGE_GENERATION_TIMEOUT_MS } from "@/utils/server/imageGeneration";
import { CreateStoryFormSchema } from "@/utils/server/validation";
import { buildStoryPrompt } from "@/utils/server/storyPromptBuilder";
import { fileFingerprint, generateCacheKey, imageGenerationCache } from "@/utils/server/cache";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await withApiAuth("create-story");
  if (!auth.ok) return auth.response;
  const { session, apiKey } = auth;

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

    parts.push({
      text: buildStoryPrompt({
        storyType: validStoryType,
        tone: validTone,
        language: validLang,
        customPrompt: trimmedCustomPrompt,
      }),
    });

    const generationResult = await generateImage(
      apiKey,
      parts,
      "ストーリー画像の生成に失敗しました。",
      AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS),
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
