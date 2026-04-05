/**
 * API response types for type safety
 */

/**
 * Successful image generation response
 */
export interface ImageGenerationSuccessResponse {
  imageBase64: string;
  mimeType: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
}

/**
 * Union type for image generation API responses
 */
export type ImageGenerationResponse = ImageGenerationSuccessResponse | ErrorResponse;

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: ImageGenerationResponse): response is ErrorResponse {
  return "error" in response;
}

/**
 * Type guard to check if response is a success
 */
export function isSuccessResponse(
  response: ImageGenerationResponse,
): response is ImageGenerationSuccessResponse {
  return "imageBase64" in response;
}

/**
 * Form data structure for freestyle-edit API
 */
export interface FreestyleEditFormData {
  prompt: string;
  images: File[];
}

/**
 * Form data structure for icon-generate API
 */
export interface IconGenerateFormData {
  name: string;
  url?: string;
  style?: string;
  customPrompt?: string;
  images: File[];
}
