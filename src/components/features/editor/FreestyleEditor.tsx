"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { ResultPane } from "@/components/features/editor/ResultPane";
import dynamic from "next/dynamic";

const PromptReferencePicker = dynamic(
  () => import("@/components/PromptReferencePicker").then((mod) => mod.PromptReferencePicker),
  { ssr: false },
);

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { FileInput, FileInputLabel } from "@/components/ui/FileInput";
import { PromptTextarea } from "@/components/ui/PromptTextarea";
import { StarterChips } from "@/components/ui/StarterChips";
import { ToneChips } from "@/components/ui/ToneChips";
import { STARTER_PROMPTS } from "@/utils/starterPrompts";
import { TONE_PROMPTS } from "@/utils/tonePrompts";
import { Section } from "@/components/ui/Section";
import { useEditorSubmit } from "@/hooks/useEditorSubmit";
import { useProgressSimulation } from "@/hooks/useProgressSimulation";
import { useRecentPrompts } from "@/hooks/useRecentPrompts";
import { useResultHistory } from "@/hooks/useResultHistory";
import { useTextUndoRedo } from "@/hooks/useTextUndoRedo";
import { useUndoRedoShortcuts } from "@/hooks/useUndoRedoShortcuts";
import { useUploadSlots } from "@/hooks/useUploadSlots";
import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import { STYLE_SUGGESTIONS } from "@/utils/server/stylePrompts";
import { useToast } from "@/components/ui/Toast";
import { BookOpen, Copy, Download, Loader2, Wand2, X } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { ProgressStep } from "@/components/ProgressDisplay";

const FREESTYLE_PROGRESS_STEPS: ProgressStep[] = [
  { id: "gather", label: "参考画像を読み込み中...", estimatedDuration: 1600 },
  { id: "plan", label: "編集プランを構築中...", estimatedDuration: 1800 },
  { id: "prompt", label: "指示内容を解釈中...", estimatedDuration: 1500 },
  { id: "generate", label: "Gemini で画像を生成中...", estimatedDuration: 6200 },
  { id: "refine", label: "仕上がりを調整中...", estimatedDuration: 1400 },
  { id: "complete", label: "完了", estimatedDuration: 400 },
];

const MAX_FREESTYLE_UPLOADS = 5;
const MAX_HISTORY = 4;
const MAX_RECENT_PROMPTS = 6;

export function FreestyleEditor() {
  const toast = useToast();
  const [isComparing, setIsComparing] = useState(false);
  const [showReferencePicker, setShowReferencePicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { recentPrompts, pushRecent } = useRecentPrompts(
    "freestyle-recent-prompts",
    MAX_RECENT_PROMPTS,
  );
  const starterPrompts = STARTER_PROMPTS.filter((p) => p.modes.includes("freestyle"));
  const tonePrompts = TONE_PROMPTS.filter((p) => p.modes.includes("freestyle"));
  const applyTone = (suffix: string) => {
    handlePromptChange(prompt.trim() ? `${prompt.trim()}、${suffix}` : suffix);
  };
  const {
    value: prompt,
    handleChange: handlePromptChange,
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    clearStacks,
    reset: resetText,
  } = useTextUndoRedo("");
  useUndoRedoShortcuts(handleUndo, handleRedo);
  const {
    history,
    historyIndex,
    pushResult,
    navigateTo,
    reset: resetHistory,
  } = useResultHistory(MAX_HISTORY);

  const {
    submit,
    isSubmitting,
    errorMessage,
    resultImage,
    resultFilename,
    setResultImage,
    setErrorMessage,
    setIsSubmitting,
    reset,
  } = useEditorSubmit({
    validate: () => {
      if (!prompt.trim()) return "仕上がりのイメージを入力してください。";
      if (!hasActiveFiles) return "少なくとも1枚の参考画像を追加してください。";
      return null;
    },
    buildFormData: () => {
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      activeUploads.forEach((upload) => {
        if (upload.file) formData.append("images", upload.file);
      });
      return formData;
    },
    endpoint: "/api/freestyle-edit",
    errorFallback: "画像の生成に失敗しました。内容を少し変えてもう一度お試しください。",
    downloadPrefix: "freestyle",
    onBeforeSubmit: () => {
      clearStacks();
      setIsComparing(false);
    },
    onSuccess: (image) => {
      pushRecent(prompt);
      pushResult(image);
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
    maxSlots: MAX_FREESTYLE_UPLOADS,
    initialSlots: 1,
    onBeforeChange: () => reset(),
    onFileError: setErrorMessage,
  });

  // Global paste support for screenshots
  useEffect(() => {
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
  }, [addFile, toast]);

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), [setIsSubmitting]);
  const {
    progress,
    currentStep,
    timeRemaining,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
    steps: FREESTYLE_PROGRESS_STEPS,
  });

  const hasActiveFiles = activeUploads.length > 0;
  const canSubmit =
    prompt.trim().length > 0 &&
    prompt.length <= MAX_PROMPT_LENGTH &&
    hasActiveFiles &&
    !isSubmitting &&
    !isOptimizingAny;

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateHistory = useCallback(
    (index: number) => {
      if (index < 0 || index >= history.length) return;
      navigateTo(index);
      setResultImage(history[index]);
      setIsComparing(false);
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    },
    [history, navigateTo, setResultImage],
  );

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    navigateHistory(historyIndex - 1);
  }, [canGoBack, historyIndex, navigateHistory]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    navigateHistory(historyIndex + 1);
  }, [canGoForward, historyIndex, navigateHistory]);

  const toggleCompare = useCallback(() => {
    const next = !isComparing;
    setIsComparing(next);
    const previous = history[historyIndex - 1] ?? null;
    const currentImage = history[historyIndex] ?? resultImage;
    setResultImage(next ? previous : currentImage);
  }, [history, historyIndex, resultImage, isComparing, setResultImage]);

  const resetEditor = useCallback(() => {
    resetUploads();
    resetText();
    resetHistory();
    reset();
    setIsComparing(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [resetUploads, resetText, resetHistory, reset]);

  const handleRemoveUploadSlot = useCallback(
    (id: string) => {
      if (uploads.length <= 1) return;
      removeUploadSlot(id);
      reset();
    },
    [uploads.length, removeUploadSlot, reset],
  );

  const handleReferenceSelect = useCallback(
    (referencePrompt: string) => {
      handlePromptChange(prompt.trim() ? `${prompt}\n\n${referencePrompt}` : referencePrompt);
      textareaRef.current?.focus();
      toast.info("プロンプト例を挿入しました");
    },
    [handlePromptChange, prompt, toast],
  );

  const handleRecentSelect = useCallback(
    (recentPrompt: string) => {
      handlePromptChange(recentPrompt);
      textareaRef.current?.focus();
    },
    [handlePromptChange],
  );

  const handleSuggestion = useCallback(
    (nextPrompt: string) => {
      handlePromptChange(prompt.trim() ? `${prompt.trim()}\n\n${nextPrompt}` : nextPrompt);
      textareaRef.current?.focus();
      toast.info("スタイルキーワードを追加しました");
    },
    [handlePromptChange, prompt, toast],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <EditorLayout
      title="自由生成"
      resultPane={
        <ResultPane
          isSubmitting={isSubmitting}
          steps={FREESTYLE_PROGRESS_STEPS}
          currentStep={currentStep}
          progress={progress}
          timeRemaining={timeRemaining}
          resultImage={resultImage}
          emptyIcon={<Download className="w-6 h-6 text-[var(--color-neutral-300)]" />}
          emptyText="生成結果がここに表示されます"
          history={{
            index: historyIndex,
            total: history.length,
            canBack: canGoBack,
            canForward: canGoForward,
          }}
          onBack={goBack}
          onForward={goForward}
          downloadFilename={resultFilename}
          downloadLabel="画像をダウンロード"
          onRetry={() => void submit()}
          retryLabel="同じ内容でもう一度"
          canRetry={canSubmit}
          onReset={resetEditor}
          actions={
            history.length > 1 ? (
              <button
                type="button"
                onClick={toggleCompare}
                disabled={!canGoBack}
                aria-pressed={isComparing}
                className="inline-flex items-center gap-1 text-oln-14 text-[var(--color-neutral-500)] hover:text-[var(--color-primary-600)] rounded-[var(--radius-md)] px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] disabled:opacity-40 disabled:pointer-events-none"
                aria-label={isComparing ? "最新の結果に戻る" : "前の結果と比較"}
              >
                <span className="text-dns-14">
                  {isComparing ? "最新の結果に戻る" : "前の結果と比較"}
                </span>
              </button>
            ) : undefined
          }
        >
          <Image
            src={resultImage!}
            alt="自由生成の結果画像"
            width={900}
            height={600}
            className="rounded-[var(--radius-lg)] w-full border border-[var(--color-neutral-300)] shadow-[var(--shadow-level-3)]"
            unoptimized
          />
        </ResultPane>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="1. 参考にしたい画像をアップロード">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uploads.map((slot, index) => (
              <div key={slot.id} className="relative group">
                <FileInput
                  subLabel={`参考画像 ${index + 1}`}
                  previewUrl={slot.previewUrl}
                  isOptimizing={optimizingIds.includes(slot.id)}
                  onChange={(event) => handleFileChange(event, slot.id)}
                />
                {uploads.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUploadSlot(slot.id)}
                    aria-label={`参考画像 ${index + 1} を削除`}
                    className="absolute top-2 right-2 rounded-[var(--radius-full)] bg-[var(--color-error-dark)]/90 p-1.5 text-white shadow-[var(--shadow-level-1)] transition-colors hover:bg-[var(--color-error-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error-dark)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {uploads.length < MAX_FREESTYLE_UPLOADS && (
              <div className="flex flex-col">
                <div aria-hidden="true" className="invisible select-none">
                  <FileInputLabel subLabel={`参考画像 ${uploads.length + 1}`} />
                </div>
                <button
                  type="button"
                  onClick={addUploadSlot}
                  className="h-48 w-full rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-500)] transition-colors hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] flex flex-col items-center justify-center"
                >
                  <span className="block text-3xl">+</span>
                  <span className="mt-2 block text-oln-14 font-medium">
                    画像を追加（あと {MAX_FREESTYLE_UPLOADS - uploads.length} 枚）
                  </span>
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section title="2. 仕上がりのイメージを記入">
          <PromptTextarea
            name="freestylePrompt"
            value={prompt}
            onValueChange={handlePromptChange}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            disabled={isSubmitting || isOptimizingAny}
            placeholder="仕上がりのイメージを自由に記入してください… (Ctrl+Z で元に戻せます)"
            ariaLabel="仕上がりのイメージ"
            textareaRef={textareaRef}
            textareaClassName="h-32 resize-y"
          />

          {prompt.trim() && (
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(prompt);
                  toast.success("プロンプトをコピーしました！");
                }}
                className="inline-flex items-center gap-1 text-dns-14 text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-800)] px-2 py-0.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
              >
                <Copy className="w-3.5 h-3.5" />
                プロンプトをコピー
              </button>
            </div>
          )}

          <div className="mt-3 space-y-2">
            <StarterChips
              prompts={starterPrompts}
              disabled={isSubmitting}
              onPick={handlePromptChange}
            />
            <ToneChips tones={tonePrompts} disabled={isSubmitting} onPick={applyTone} />
            {recentPrompts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-oln-14 text-[var(--color-neutral-500)]">最近:</span>
                {recentPrompts.map((recent) => (
                  <Button
                    key={recent}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full border border-[var(--color-neutral-300)] px-3 text-dns-14"
                    onClick={() => handleRecentSelect(recent)}
                  >
                    {recent.length > 24 ? `${recent.slice(0, 24)}…` : recent}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {STYLE_SUGGESTIONS.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSuggestion(item.prompt)}
                  disabled={isSubmitting || isOptimizingAny}
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1" />
                  {item.label}
                </Button>
              ))}
              <button
                type="button"
                onClick={() => setShowReferencePicker(true)}
                className="inline-flex items-center gap-1.5 text-oln-14 text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
              >
                <BookOpen className="w-4 h-4" />
                もっと見る
              </button>
            </div>
          </div>
        </Section>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] border-0"
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 生成中…
              </>
            ) : (
              "Gemini に生成を依頼"
            )}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={resetEditor}
            disabled={isSubmitting}
          >
            入力をクリア
          </Button>
        </div>
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            hint="指示文を短くしたり、参考画像を減らしたりすると安定することがあります。"
            retryLabel="同じ内容で再試行"
            onRetry={() => void submit()}
            canRetry={canSubmit}
            onReset={resetEditor}
          />
        )}
      </form>

      {showReferencePicker && (
        <PromptReferencePicker
          onSelect={handleReferenceSelect}
          onClose={() => setShowReferencePicker(false)}
        />
      )}
    </EditorLayout>
  );
}
