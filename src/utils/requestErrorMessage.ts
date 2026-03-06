interface RequestErrorMessageOptions {
  status: number;
  payload: unknown;
  fallback: string;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = payload.error;
  return typeof error === "string" && error.trim().length > 0 ? error.trim() : null;
}

export function getRequestErrorMessage({
  status,
  payload,
  fallback,
}: RequestErrorMessageOptions): string {
  if (status === 401 || status === 403) {
    return "セッションの確認が必要です。もう一度サインインしてからお試しください。";
  }

  if (status === 413) {
    return "画像サイズが大きすぎる可能性があります。別の画像に変えるか、そのままでもう一度お試しください。";
  }

  return extractErrorMessage(payload) ?? fallback;
}
