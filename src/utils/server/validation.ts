import { z } from "zod";

/**
 * Zod schemas for API request/response validation
 */

// Image generation response schema
export const ImageGenerationResponseSchema = z.object({
  imageBase64: z.string(),
  mimeType: z.string(),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
});

// Union type for API responses
export const ApiResponseSchema = z.union([
  ImageGenerationResponseSchema,
  ErrorResponseSchema,
]);

// Edit image form data schema
export const EditImageFormSchema = z.object({
  prompt: z.string().min(1, "プロンプトを入力してください").max(2000),
  image: z.instanceof(File, { message: "画像ファイルが必要です" }),
  image_secondary: z.instanceof(File).optional(),
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
  images: z
    .array(z.instanceof(File))
    .max(3, "画像は最大3枚までアップロードできます"),
});

/**
 * Validate form data with Zod schema
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessage = result.error.issues
    .map((issue: z.ZodIssue) => issue.message)
    .join(", ");
  return { success: false, error: errorMessage };
}

/**
 * Validate environment variables
 */
export const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
});

export function validateEnv(): z.infer<typeof EnvSchema> {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }
    console.error(fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return result.data;
}
