"use client";

import type { ProgressStep } from "@/components/ProgressDisplay";
import { useToast } from "@/components/ui/Toast";
import { useEditorSubmit } from "@/hooks/useEditorSubmit";
import { useProgressSimulation } from "@/hooks/useProgressSimulation";
import { useRecentPrompts } from "@/hooks/useRecentPrompts";
import { useResultHistory } from "@/hooks/useResultHistory";
import { useTextUndoRedo } from "@/hooks/useTextUndoRedo";
import { useUndoRedoShortcuts } from "@/hooks/useUndoRedoShortcuts";
import { type UploadSlot, useUploadSlots } from "@/hooks/useUploadSlots";
import { saveToGallery } from "@/utils/galleryStorage";
import { type ChangeEvent, type FormEvent, useCallback, useEffect } from "react";

export interface EditorSubmitContext {
  /** current raw textarea value (NOT trimmed) */
  prompt: string;
  /** activeUploads from useUploadSlots (slots that hold a file) */
  activeUploads: UploadSlot[];
  hasActiveFiles: boolean;
}

export interface EditorGalleryEntry {
  mode: "freestyle" | "icon" | "story";
  title?: string;
  prompt?: string;
}

export interface UseEditorControllerOptions {
  recentStorageKey: string;
  progressSteps: ProgressStep[];
  maxUploads: number;
  initialUploadSlots?: number;
  /** enable the window "paste" listener that adds clipboard screenshots as uploads */
  pasteToUpload?: boolean;
  endpoint: string;
  errorFallback: string;
  downloadPrefix: string;
  validate: (ctx: EditorSubmitContext) => string | null;
  buildFormData: (ctx: EditorSubmitContext) => FormData;
  /** text pushed to recent prompts after success; return null to skip */
  recentPrompt?: (ctx: EditorSubmitContext) => string | null;
  /** gallery entry for the generated data URL; return null to skip saving */
  galleryEntry?: (ctx: EditorSubmitContext) => EditorGalleryEntry | null;
  /** extra work right before POST runs; clearStacks() always runs first */
  onBeforeSubmit?: () => void;
  /** called with the image after history navigation updates resultImage */
  onNavigate?: (image: string) => void;
  /** extra editor-specific form state reset on "入力をクリア"; common resets always run */
  resetFields?: () => void;
  /** scroll window to top when the editor is reset (freestyle + icon only) */
  scrollToTopOnReset?: boolean;
}

export interface UseEditorControllerReturn {
  recentPrompts: readonly string[];
  pushRecent: (text: string) => void;
  prompt: string;
  handlePromptChange: (next: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetText: () => void;
  clearStacks: () => void;
  history: string[];
  historyIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  submit: () => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
  resultImage: string | null;
  resultFilename: string | null;
  setResultImage: (image: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  uploads: UploadSlot[];
  activeUploads: UploadSlot[];
  isOptimizingAny: boolean;
  optimizingIds: string[];
  addUploadSlot: () => void;
  addFile: (file: File) => Promise<boolean>;
  removeUploadSlot: (id: string) => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>, id: string) => Promise<void>;
  resetUploads: () => void;
  hasActiveFiles: boolean;
  progress: number;
  currentStep: number;
  timeRemaining: number;
  handleSubmit: (event: FormEvent) => void;
  resetEditor: () => void;
  resetSubmit: () => void;
  reset: () => void;
}

const MAX_RECENT_PROMPTS = 6;

export function useEditorController(
  options: UseEditorControllerOptions,
): UseEditorControllerReturn {
  const toast = useToast();

  const { recentPrompts, pushRecent } = useRecentPrompts(
    options.recentStorageKey,
    MAX_RECENT_PROMPTS,
  );

  const {
    value: prompt,
    handleChange: handlePromptChange,
    undo,
    redo,
    canUndo,
    canRedo,
    clearStacks,
    reset: resetText,
  } = useTextUndoRedo("");

  useUndoRedoShortcuts(undo, redo);

  const {
    history,
    historyIndex,
    pushResult,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    reset: resetHistory,
  } = useResultHistory({
    onNavigate: (image) => {
      setResultImage(image);
      options.onNavigate?.(image);
    },
  });

  const {
    submit,
    isSubmitting,
    errorMessage,
    resultImage,
    resultFilename,
    setResultImage,
    setErrorMessage,
    setIsSubmitting,
    reset: resetSubmit,
  } = useEditorSubmit({
    validate: () =>
      options.validate({
        prompt,
        activeUploads,
        hasActiveFiles: activeUploads.length > 0,
      }),
    buildFormData: () =>
      options.buildFormData({
        prompt,
        activeUploads,
        hasActiveFiles: activeUploads.length > 0,
      }),
    endpoint: options.endpoint,
    errorFallback: options.errorFallback,
    downloadPrefix: options.downloadPrefix,
    onBeforeSubmit: () => {
      clearStacks();
      options.onBeforeSubmit?.();
    },
    onSuccess: (image) => {
      const ctx: EditorSubmitContext = {
        prompt,
        activeUploads,
        hasActiveFiles: activeUploads.length > 0,
      };
      if (options.recentPrompt) {
        const rp = options.recentPrompt(ctx);
        if (rp !== null) {
          pushRecent(rp);
        }
      }
      pushResult(image);
      if (options.galleryEntry) {
        const entry = options.galleryEntry(ctx);
        if (entry !== null) {
          const commaIndex = image.indexOf(",");
          const mimeMatch = image.match(/^data:([^;]+);base64,/);
          if (commaIndex !== -1) {
            void saveToGallery({
              ...entry,
              imageBase64: image.slice(commaIndex + 1),
              mimeType: mimeMatch?.[1] || "image/png",
            }).then((saved) => {
              if (!saved) toast.error("ギャラリーに保存できませんでした");
            });
          }
        }
      }
    },
    onFinished: (elapsedMs) => completeProgress(elapsedMs),
  });

  const {
    uploads,
    activeUploads,
    isOptimizingAny,
    optimizingIds,
    addUploadSlot,
    addFile,
    removeUploadSlot,
    handleFileChange,
    resetUploads,
  } = useUploadSlots({
    maxSlots: options.maxUploads,
    initialSlots: options.initialUploadSlots,
    onBeforeChange: () => resetSubmit(),
    onFileError: setErrorMessage,
  });

  const { pasteToUpload } = options;
  useEffect(() => {
    if (!pasteToUpload) return;
    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        e.clipboardData?.types.includes("text/plain") &&
        !e.clipboardData?.types.includes("Files")
      ) {
        return;
      }
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const imageFile = Array.from(e.clipboardData.files).find((f) =>
          f.type.startsWith("image/"),
        );
        if (imageFile) {
          e.preventDefault();
          void addFile(imageFile).then((added) => {
            if (added) {
              toast.success("クリップボードの画像を参考画像に追加しました！");
            }
          });
        }
      }
    };
    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [pasteToUpload, addFile, toast]);

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), [setIsSubmitting]);

  const {
    progress,
    currentStep,
    timeRemaining,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    steps: options.progressSteps,
    onComplete: handleProgressComplete,
  });

  const hasActiveFiles = activeUploads.length > 0;

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      void submit();
    },
    [submit],
  );

  const { resetFields, scrollToTopOnReset } = options;
  const resetEditor = useCallback(() => {
    resetUploads();
    resetText();
    clearStacks();
    resetHistory();
    resetSubmit();
    resetFields?.();
    if (scrollToTopOnReset && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [
    resetUploads,
    resetText,
    clearStacks,
    resetHistory,
    resetSubmit,
    resetFields,
    scrollToTopOnReset,
  ]);

  return {
    recentPrompts,
    pushRecent,
    prompt,
    handlePromptChange,
    undo,
    redo,
    canUndo,
    canRedo,
    resetText,
    clearStacks,
    history,
    historyIndex,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    submit,
    isSubmitting,
    errorMessage,
    resultImage,
    resultFilename,
    setResultImage,
    setErrorMessage,
    uploads,
    activeUploads,
    isOptimizingAny,
    optimizingIds,
    addUploadSlot,
    addFile,
    removeUploadSlot,
    handleFileChange,
    resetUploads,
    hasActiveFiles,
    progress,
    currentStep,
    timeRemaining,
    handleSubmit,
    resetEditor,
    resetSubmit,
    reset: resetSubmit,
  };
}
