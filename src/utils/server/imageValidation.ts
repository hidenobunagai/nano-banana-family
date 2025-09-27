const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MIME_TYPE_NORMALIZATION: Record<string, string> = {
  "image/jpg": "image/jpeg",
};

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const MAX_FILE_SIZE_MB = 8;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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
