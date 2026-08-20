import { getRequestErrorMessage } from "@/utils/requestErrorMessage";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseEditorSubmitOptions {
  /** Returns an error message to show, or null when validation passes. */
  validate: () => string | null;
  buildFormData: () => FormData;
  endpoint: string;
  errorFallback: string;
  /** Prefix for the generated download filename. */
  downloadPrefix: string;
  /** Called right before the request starts (e.g. clear undo stacks). */
  onBeforeSubmit?: () => void;
  /** Called with the generated data URL after a successful response. */
  onSuccess: (image: string) => void;
  /** Called with the request duration when the request finishes (not on abort). */
  onFinished?: (elapsedMs: number) => void;
}

export interface UseEditorSubmitReturn {
  submit: () => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
  resultImage: string | null;
  resultFilename: string | null;
  setResultImage: (image: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  setIsSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

const RESULT_SHAPE_ERROR = "画像データを取得できませんでした。もう一度お試しください。";
const GENERIC_ERROR = "生成中にエラーが発生しました。しばらくしてからお試しください。";
const NETWORK_ERROR = "通信に失敗しました。ネットワーク接続を確認してもう一度お試しください。";
const TIMEOUT_ERROR = "生成に時間がかかっています。時間をおいてもう一度お試しください。";
// Wall-clock deadline so isSubmitting can never stick when the server hangs.
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Shared submit flow for the editors: validation, AbortController, fetch,
 * response shape checking, result/error state, and progress reporting.
 */
export function useEditorSubmit({
  validate,
  buildFormData,
  endpoint,
  errorFallback,
  downloadPrefix,
  onBeforeSubmit,
  onSuccess,
  onFinished,
}: UseEditorSubmitOptions): UseEditorSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const submit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);
    onBeforeSubmit?.();

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      scrollTimeoutRef.current = setTimeout(() => {
        if (typeof document !== "undefined") {
          document
            .getElementById("result-pane")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

    const startTime = Date.now();
    let aborted = false;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: buildFormData(),
        signal: AbortSignal.any([controller.signal, timeoutSignal]),
      });
      // Non-JSON bodies (platform error pages, empty 500s) used to throw a raw
      // SyntaxError and make the status-specific messages unreachable.
      const text = await res.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        // keep null; status-based message still applies
      }

      if (!res.ok) {
        throw new Error(
          getRequestErrorMessage({ status: res.status, payload: data, fallback: errorFallback }),
        );
      }

      if (
        !data ||
        typeof data !== "object" ||
        !("imageBase64" in data) ||
        typeof data.imageBase64 !== "string"
      ) {
        throw new Error(RESULT_SHAPE_ERROR);
      }

      const mimeType =
        "mimeType" in data && typeof data.mimeType === "string" ? data.mimeType : "image/png";
      const image = `data:${mimeType};base64,${data.imageBase64}`;
      setResultFilename(`${downloadPrefix}-${Date.now()}.png`);
      onSuccess(image);
      setResultImage(image);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (timeoutSignal.aborted) {
          // Deadline hit, not a user abort: surface it and let progress finish.
          setErrorMessage(TIMEOUT_ERROR);
        } else {
          aborted = true;
        }
      } else if (error instanceof TypeError) {
        setErrorMessage(NETWORK_ERROR);
      } else {
        setErrorMessage(error instanceof Error ? error.message : GENERIC_ERROR);
      }
    } finally {
      if (!aborted) onFinished?.(Date.now() - startTime);
    }
  }, [
    validate,
    buildFormData,
    endpoint,
    errorFallback,
    downloadPrefix,
    onBeforeSubmit,
    onSuccess,
    onFinished,
  ]);

  const reset = useCallback(() => {
    setResultImage(null);
    setResultFilename(null);
    setErrorMessage(null);
  }, []);

  return {
    submit,
    isSubmitting,
    errorMessage,
    resultImage,
    resultFilename,
    setResultImage,
    setErrorMessage,
    setIsSubmitting,
    reset,
  };
}
