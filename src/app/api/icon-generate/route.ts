import { NextResponse } from "next/server";

import { buildIconPrompt } from "@/utils/server/iconPromptBuilder";
import type { IconStyleId } from "@/utils/iconStyles";
import {
  authenticateRequest,
  checkUserRateLimit,
  validateApiKey,
  handleApiError,
  validateFormData,
} from "@/utils/server/api-helpers";
import { filesToParts, fetchOgImage } from "@/utils/server/imageProcessing";
import { generateImage } from "@/utils/server/imageGeneration";
import { fetchUrlMetadata } from "@/utils/server/urlMetadata";
import { IconGenerateFormSchema } from "@/utils/server/validation";
import { fileFingerprint, generateCacheKey, imageGenerationCache } from "@/utils/server/cache";

export const runtime = "nodejs";
// Image generation takes 10-40s; the Vercel hobby default (10s) kills every call.
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

  const cacheKey = generateCacheKey({
    name: trimmedName,
    url: trimmedUrl ?? "",
    style: resolvedStyle,
    customPrompt: trimmedCustomPrompt ?? "",
    images: (await Promise.all(validatedFiles.map(fileFingerprint))).sort(),
  });
  const cached = imageGenerationCache.get<{ imageBase64: string; mimeType: string }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

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
    return handleApiError(error, "icon-generate", session.user?.email ?? "unknown");
  }
}
