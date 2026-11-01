/**
 * Shared image MIME helpers.
 *
 * These are pure functions on a File, so the client and the server can both
 * use them without pulling server-only modules into the browser bundle.
 */

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MIME_TYPE_NORMALIZATION: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
};

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Image types the app accepts. */
export const ALLOWED_IMAGE_MIME_TYPES = ALLOWED_MIME_TYPES;

/**
 * Resolve the MIME type of an image file.
 *
 * The declared type wins when it is allowed; otherwise the file extension is
 * used as a fallback. Returns null for anything that is not a supported
 * image.
 */
export const resolveMimeType = (file: File): string | null => {
  const rawType = file.type?.toLowerCase();
  if (rawType) {
    const normalized = MIME_TYPE_NORMALIZATION[rawType] ?? rawType;
    if (ALLOWED_MIME_TYPES.has(normalized)) {
      return normalized;
    }
  }

  const extension = file.name?.split(".").pop()?.toLowerCase();
  if (extension) {
    const mimeFromExtension = EXTENSION_TO_MIME[extension];
    if (mimeFromExtension && ALLOWED_MIME_TYPES.has(mimeFromExtension)) {
      return mimeFromExtension;
    }
  }

  return null;
};
