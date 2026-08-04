import { z } from "zod";

/**
 * Zod schemas for API request/response validation
 */

// Image generation response schema
export const ImageGenerationResponseSchema = z.object({
  imageBase64: z.string(),
  mimeType: z.string(),
});

// Freestyle edit form data schema
export const FreestyleEditFormSchema = z.object({
  prompt: z.string().min(1, "編集内容を入力してください").max(2000),
  images: z
    .array(z.instanceof(File))
    .min(1, "画像を1枚以上アップロードしてください")
    .max(5, "画像は最大5枚までアップロードできます"),
});

// Icon generate form data schema
export const IconGenerateFormSchema = z.object({
  name: z.string().min(1, "連絡先名を入力してください"),
  url: z.string().url().optional().or(z.literal("")),
  style: z.string().optional(),
  customPrompt: z.string().max(2000).optional(),
  images: z.array(z.instanceof(File)).max(3, "画像は最大3枚までアップロードできます"),
});
