import { NextResponse } from "next/server";

import { withApiAuth } from "@/utils/server/withApiAuth";
import { filesToParts } from "@/utils/server/imageProcessing";
import { generateImage, IMAGE_GENERATION_TIMEOUT_MS } from "@/utils/server/imageGeneration";
import { FreestyleEditFormSchema } from "@/utils/server/validation";
import { buildFreestylePrompt } from "@/utils/server/freestylePromptBuilder";
import { handleApiError, validateFormData } from "@/utils/server/api-helpers";
import { readFormData } from "@/utils/server/requestFormData";

export const runtime = "nodejs";
// Image generation takes 10-40s; the Vercel hobby default (10s) kills every call.
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await withApiAuth("freestyle-edit");
  if (!auth.ok) return auth.response;
  const { session, apiKey } = auth;

  const formResult = await readFormData(request);
  if (!formResult.ok) return formResult.response;
  const formData = formResult.formData;
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

  try {
    const partsResult = await filesToParts(validatedFiles);
    if ("error" in partsResult) {
      return NextResponse.json({ error: partsResult.error }, { status: partsResult.status });
    }
    const parts = partsResult.parts;

    parts.push({ text: buildFreestylePrompt({ prompt: trimmedPrompt }) });

    const generationResult = await generateImage(
      apiKey,
      parts,
      "画像の生成に失敗しました。",
      AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS),
    );
    if ("error" in generationResult) {
      return NextResponse.json(
        { error: generationResult.error },
        { status: generationResult.status },
      );
    }

    return NextResponse.json(generationResult);
  } catch (error) {
    return handleApiError(error, "freestyle-edit", session.user?.email ?? "unknown");
  }
}
