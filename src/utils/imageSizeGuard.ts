import { resizeImage } from "@/utils/imageOptimization";

/**
 * Vercel rejects request bodies over 4.5 MB with a platform-level 413 that
 * bypasses the app's own error handling, so the client keeps the combined
 * image size under a budget that leaves room for the multipart overhead and
 * the text fields.
 */
export const REQUEST_BODY_LIMIT_BYTES = Math.floor(4.5 * 1024 * 1024);
export const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024;

export const TOTAL_IMAGE_SIZE_ERROR =
  "画像の合計サイズが大きすぎます。枚数を減らすか、解像度の低い写真でもう一度お試しください。";

const FIT_STEPS: ReadonlyArray<{ maxDimension: number; quality: number }> = [
  { maxDimension: 1600, quality: 0.85 },
  { maxDimension: 1280, quality: 0.82 },
  { maxDimension: 1024, quality: 0.8 },
  { maxDimension: 800, quality: 0.75 },
];

export function totalFileSize(files: readonly File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

/**
 * Shrink a set of images until their combined size fits the budget.
 * Each step re-encodes every image at a smaller maximum dimension; when the
 * budget is already met the files are returned unchanged. Throws
 * TOTAL_IMAGE_SIZE_ERROR when even the smallest step cannot fit them, so
 * the user gets an in-app message instead of a platform 413.
 */
export async function fitImagesWithinTotalSize(
  files: readonly File[],
  maxTotalBytes: number = MAX_TOTAL_IMAGE_BYTES,
): Promise<File[]> {
  if (totalFileSize(files) <= maxTotalBytes) {
    return [...files];
  }

  let current = [...files];
  for (const step of FIT_STEPS) {
    current = await Promise.all(
      current.map((file) =>
        resizeImage(file, {
          maxWidth: step.maxDimension,
          maxHeight: step.maxDimension,
          quality: step.quality,
          // Dimension is the lever here: never bail out early over file size.
          maxFileSizeMB: Number.POSITIVE_INFINITY,
        }),
      ),
    );
    if (totalFileSize(current) <= maxTotalBytes) {
      return current;
    }
  }

  throw new Error(TOTAL_IMAGE_SIZE_ERROR);
}

/**
 * Apply fitImagesWithinTotalSize to the File entries of a FormData.
 * Returns the original FormData unchanged when the images already fit, so
 * callers can run this on every submit without rebuilding the body.
 */
export async function fitFormDataImagesWithinTotalSize(
  formData: FormData,
  maxTotalBytes: number = MAX_TOTAL_IMAGE_BYTES,
): Promise<FormData> {
  const entries = [...formData.entries()];
  const files = entries
    .filter(([, value]) => value instanceof File)
    .map(([, value]) => value as File);

  if (files.length === 0 || totalFileSize(files) <= maxTotalBytes) {
    return formData;
  }

  const fitted = await fitImagesWithinTotalSize(files, maxTotalBytes);
  let index = 0;
  const next = new FormData();
  for (const [key, value] of entries) {
    next.append(key, value instanceof File ? fitted[index++] : value);
  }
  return next;
}
