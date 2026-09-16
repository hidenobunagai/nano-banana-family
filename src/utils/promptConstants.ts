/** Maximum character length for user-supplied free-text prompts. */
export const MAX_PROMPT_LENGTH = 1000;

/**
 * Maximum number of reference images accepted by each editor.
 * Shared by the client upload grids and the server-side zod schemas so the
 * two cannot drift apart.
 */
export const MAX_FREESTYLE_UPLOADS = 5;
export const MAX_ICON_UPLOADS = 3;
export const MAX_STORY_UPLOADS = 5;
