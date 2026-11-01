import { NextResponse } from "next/server";

import { buildIconPrompt } from "@/utils/server/iconPromptBuilder";
import type { IconStyleId } from "@/utils/iconStyles";
import { withApiAuth } from "@/utils/server/withApiAuth";
import { handleApiError, validateFormData } from "@/utils/server/api-helpers";
import { filesToParts, fetchOgImage } from "@/utils/server/imageProcessing";
import { generateImage, IMAGE_GENERATION_TIMEOUT_MS } from "@/utils/server/imageGeneration";
import { fetchUrlMetadata } from "@/utils/server/urlMetadata";
import { IconGenerateFormSchema } from "@/utils/server/validation";
import { readFormData } from "@/utils/server/requestFormData";

export const runtime = "nodejs";
// Image generation takes 10-40s; the Vercel hobby default (10s) kills every call.
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await withApiAuth("icon-generate");
  if (!auth.ok) return auth.response;
  const { session, apiKey } = auth;

  const formResult = await readFormData(request);
  if (!formResult.ok) return formResult.response;
  const formData = formResult.formData;
  const name = (formData.get("name") as string | null) || "";
  const url = (formData.get("url") as string | null) || undefined;
  const style = (formData.get("style") as IconStyleId | null) || undefined;
  const customPrompt = (formData.get("customPrompt") as string | null) || undefined;
  const imageEntries = formData.getAll("images");

  const files: File[] = imageEntries.filter((entry): entry is File => entry instanceof File);

  const parsed = validateFormData(IconGenerateFormSchema, {
    name,
    url,
    style,
    customPrompt,
    images: files,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error, field: "form" }, { status: 400 });
  }
  const {
    name: trimmedName,
    url: trimmedUrl,
    style: validatedStyle,
    customPrompt: trimmedCustomPrompt,
    images: validatedFiles,
  } = parsed.data;

  const resolvedStyle = typeof validatedStyle === "string" ? validatedStyle : "auto";

  try {
    const [urlMeta, partsResult] = await Promise.all([
      trimmedUrl ? fetchUrlMetadata(trimmedUrl) : Promise.resolve(null),
      filesToParts(validatedFiles),
    ]);

    const prompt = buildIconPrompt({
      name: trimmedName,
      style: resolvedStyle as IconStyleId,
      urlMeta,
      customPrompt: trimmedCustomPrompt,
    });

    if ("error" in partsResult) {
      return NextResponse.json({ error: partsResult.error }, { status: partsResult.status });
    }
    const parts = partsResult.parts;

    if (urlMeta?.ogImage) {
      try {
        const ogImageData = await fetchOgImage(urlMeta.ogImage, trimmedUrl);
        if (ogImageData) {
          parts.push({
            inlineData: {
              data: ogImageData.base64,
              mimeType: ogImageData.mimeType,
            },
          });
        }
      } catch {
        // OG image fetch failure is non-critical, continue without it
      }
    }

    parts.push({ text: prompt });

    const generationResult = await generateImage(
      apiKey,
      parts,
      "アイコンの生成に失敗しました。",
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
    return handleApiError(error, "icon-generate", session.user?.email ?? "unknown");
  }
}
