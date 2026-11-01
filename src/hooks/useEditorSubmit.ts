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
 * True for the error a fetch rejects with when its signal is aborted.
 * AbortSignal.timeout() rejects with a DOMException named "TimeoutError"
 * instead, which is why the deadline is detected through the signal itself.
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

interface RequestAbortPlan {
  /** Signal handed to fetch. */
  signal: AbortSignal;
  /** True when the deadline (not the user) ended the request. */
  timedOut: () => boolean;
  /** Releases the fallback timer and listeners. */
  dispose: () => void;
}

/**
 * Build the signal used for one request.
 *
 * AbortSignal.timeout() and AbortSignal.any() are missing on older browsers and
 * in some embedded webviews, and touching them there throws before the request
 * even starts. The fallback keeps the deadline with a plain AbortController
 * plus a timer, and keeps a timeout distinguishable from a user abort.
 */
function createAbortPlan(userSignal: AbortSignal, timeoutMs: number): RequestAbortPlan {
  const hasTimeout =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function";
  const hasAny = typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function";

  if (hasTimeout && hasAny) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    return {
      signal: AbortSignal.any([userSignal, timeoutSignal]),
      timedOut: () => timeoutSignal.aborted,
      dispose: () => {},
    };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    if (controller.signal.aborted) return;
    timedOut = true;
    controller.abort(new DOMException("The request timed out.", "TimeoutError"));
  }, timeoutMs);

  const forwardUserAbort = () => controller.abort(userSignal.reason);
  if (userSignal.aborted) {
    controller.abort(userSignal.reason);
  } else {
    userSignal.addEventListener("abort", forwardUserAbort, { once: true });
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      userSignal.removeEventListener("abort", forwardUserAbort);
    },
  };
}

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
    onBeforeSubmit?.();

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Drop a pending scroll from an earlier submit: it would fire later and
      // scroll away from whatever the user is looking at by then.
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
        if (typeof document !== "undefined") {
          document.getElementById("result-pane")?.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start",
          });
        }
      }, 50);
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = Date.now();
    let aborted = false;
    let abortPlan: RequestAbortPlan | null = null;
    try {
      // The signal is built inside the try: a browser without the AbortSignal
      // statics would otherwise throw before the request starts and leave the
      // editor stuck in the submitting state.
      abortPlan = createAbortPlan(controller.signal, REQUEST_TIMEOUT_MS);
      const res = await fetch(endpoint, {
        method: "POST",
        body: buildFormData(),
        signal: abortPlan.signal,
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
      setResultFilename(
        `${downloadPrefix}-${Date.now()}.${mimeType.replace("image/", "") || "png"}`,
      );
      onSuccess(image);
      setResultImage(image);
    } catch (error) {
      if (abortPlan?.timedOut()) {
        // Deadline hit, not a user abort: surface it and let progress finish.
        // Checked first because the timeout rejects with a DOMException named
        // "TimeoutError", so the error name alone cannot tell the two apart.
        setErrorMessage(TIMEOUT_ERROR);
      } else if (controller.signal.aborted || isAbortError(error)) {
        // The user aborted the request: stay silent and skip the completion.
        aborted = true;
      } else if (error instanceof TypeError) {
        setErrorMessage(NETWORK_ERROR);
      } else {
        setErrorMessage(error instanceof Error ? error.message : GENERIC_ERROR);
      }
    } finally {
      abortPlan?.dispose();
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
