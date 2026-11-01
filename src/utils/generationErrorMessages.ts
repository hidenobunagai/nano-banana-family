/**
 * User-facing messages for image generation failures.
 *
 * Shared by the server routes and the client error display so both sides
 * describe the same failure in the same words. The upstream SDK message is
 * never forwarded to the user: it can contain model names, quota details or
 * internal URLs.
 */

export const GENERATION_ERROR_MESSAGES = {
  /** The service is busy or the usage limit was reached. */
  rateLimited: "画像生成のリクエストが多すぎます。しばらく待ってから、もう一度お試しください。",
  /** The upstream image service is temporarily unavailable. */
  serviceUnavailable:
    "画像生成サービスが混み合っています。しばらくしてから、もう一度お試しください。",
  /** The request itself could not be processed. */
  invalidRequest: "リクエストを処理できませんでした。画像や文言を変更してお試しください。",
  /** The request was stopped by the safety filters. */
  safetyBlocked: "安全上の理由により生成できませんでした。内容や写真を変更してお試しください。",
} as const;
