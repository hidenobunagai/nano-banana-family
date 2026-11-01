/**
 * Server side image validation.
 *
 * The MIME helpers live in the shared module so the client bundle does not
 * have to import a server only file; they are re-exported here to keep the
 * existing imports of the server code working.
 */

export { ALLOWED_IMAGE_MIME_TYPES, resolveMimeType } from "@/utils/imageMime";

export const MAX_FILE_SIZE_MB = 8;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
