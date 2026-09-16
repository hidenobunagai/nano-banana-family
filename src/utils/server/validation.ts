import { z } from "zod";

import {
  MAX_FREESTYLE_UPLOADS,
  MAX_ICON_UPLOADS,
  MAX_PROMPT_LENGTH,
  MAX_STORY_UPLOADS,
} from "@/utils/promptConstants";

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
  prompt: z.string().min(1, "編集内容を入力してください").max(MAX_PROMPT_LENGTH),
  images: z
    .array(z.instanceof(File))
    .min(1, "画像を1枚以上アップロードしてください")
    .max(MAX_FREESTYLE_UPLOADS, `画像は最大${MAX_FREESTYLE_UPLOADS}枚までアップロードできます`),
});

// Icon generate form data schema
export const IconGenerateFormSchema = z.object({
  name: z.string().min(1, "連絡先名を入力してください"),
  url: z.string().url().optional().or(z.literal("")),
  style: z.string().optional(),
  customPrompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  images: z
    .array(z.instanceof(File))
    .max(MAX_ICON_UPLOADS, `画像は最大${MAX_ICON_UPLOADS}枚までアップロードできます`),
});

// Create story form data schema
export const CreateStoryFormSchema = z.object({
  storyType: z.enum(["picture-book", "comic", "newspaper"]).default("picture-book"),
  tone: z.enum(["funny", "cute", "adventure", "warm"]).default("funny"),
  language: z.enum(["ja", "en"]).default("ja"),
  customPrompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  images: z
    .array(z.instanceof(File))
    .min(1, "写真を1枚以上アップロードしてください")
    .max(MAX_STORY_UPLOADS, `写真は最大${MAX_STORY_UPLOADS}枚までアップロードできます`),
});
