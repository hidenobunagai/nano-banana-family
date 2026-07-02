"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { ProgressDisplay, type ProgressStep } from "@/components/ProgressDisplay";
import { PromptReferencePicker } from "@/components/PromptReferencePicker";
import { Button } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { Section } from "@/components/ui/Section";
import { useProgressSimulation } from "@/hooks/useProgressSimulation";
import { useUploadSlots } from "@/hooks/useUploadSlots";
import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import { getRequestErrorMessage } from "@/utils/requestErrorMessage";
import { BookOpen, ChevronLeft, ChevronRight, Download, Loader2, RefreshCw, RotateCcw, Wand2, X } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { makeBrighterPrompt, makePopPrompt, makeStampPrompt, makeSepiaPrompt } from "@/utils/server/stylePrompts";

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
const STYLE_SUGGESTIONS = [
  { label: "明るく", prompt: makeBrighterPrompt() },
  { label: "ポップ", prompt: makePopPrompt() },
  { label: "スタンプ風", prompt: makeStampPrompt() },
  { label: "セピア", prompt: makeSepiaPrompt() },
];

export function FreestyleEditor() {
  const [prompt, setPrompt] = useState("");
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReferencePicker, setShowReferencePicker] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestStartTimeRef = useRef<number>(0);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const {
    uploads,
    activeUploads,
    isOptimizingAny,
    optimizingIds,
    addUploadSlot,
    removeUploadSlot,
    handleFileChange,
    resetUploads,
  } = useUploadSlots({
    maxSlots: MAX_FREESTYLE_UPLOADS,
    initialSlots: 1,
    onBeforeChange: () => {
      setErrorMessage(null);
      setResultImage(null);
    },
    onFileError: setErrorMessage,
  });

  const pushRecentPrompt = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRecentPrompts((prev) => {
      const next = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(
        0,
        MAX_RECENT_PROMPTS,
      );
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("freestyle-recent-prompts", JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("freestyle-recent-prompts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentPrompts(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), []);
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
  const isPromptTooLong = prompt.length > MAX_PROMPT_LENGTH;
  const canSubmit =
    prompt.trim().length > 0 &&
    !isPromptTooLong &&
    hasActiveFiles &&
    !isSubmitting &&
    !isOptimizingAny;

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateHistory = useCallback((index: number) => {
    if (index < 0 || index >= history.length) return;
    setHistoryIndex(index);
    setResultImage(history[index]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [history]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    navigateHistory(historyIndex - 1);
  }, [canGoBack, historyIndex, navigateHistory]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    navigateHistory(historyIndex + 1);
  }, [canGoForward, historyIndex, navigateHistory]);

  const resetEditor = useCallback(() => {
    resetUploads();
    setPrompt("");
    setResultImage(null);
    setHistory([]);
    setHistoryIndex(-1);
    setErrorMessage(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [resetUploads]);

  const handleRemoveUploadSlot = useCallback(
    (id: string) => {
      if (uploads.length <= 1) return;
      removeUploadSlot(id);
      setResultImage(null);
      setErrorMessage(null);
    },
    [uploads.length, removeUploadSlot],
  );

  const handlePromptChange = useCallback(
    (value: string) => {
      undoStackRef.current.push(prompt);
      redoStackRef.current = [];
      if (undoStackRef.current.length > 40) undoStackRef.current.shift();
      setPrompt(value);
    },
    [prompt],
  );

  const handleUndo = useCallback(() => {
    if (!undoStackRef.current.length) return;
    const prev = undoStackRef.current.pop();
    if (typeof prev === "string") {
      redoStackRef.current.push(prompt);
      setPrompt(prev);
    }
  }, [prompt]);

  const handleRedo = useCallback(() => {
    if (!redoStackRef.current.length) return;
    const next = redoStackRef.current.pop();
    if (typeof next === "string") {
      undoStackRef.current.push(prompt);
      setPrompt(next);
    }
  }, [prompt]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target && (target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true");

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (isEditing) handleRedo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        if (isEditing) handleUndo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        if (isEditing) handleRedo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleUndo, handleRedo]);

  const handleReferenceSelect = useCallback((referencePrompt: string) => {
    setPrompt((prev) => {
      if (prev.trim()) return `${prev}\n\n${referencePrompt}`;
      return referencePrompt;
    });
    textareaRef.current?.focus();
  }, []);

  const handleRecentSelect = useCallback(
    (recentPrompt: string) => {
      handlePromptChange(recentPrompt);
      textareaRef.current?.focus();
    },
    [handlePromptChange],
  );

  const handleSuggestion = useCallback((nextPrompt: string) => {
    if (prompt.trim()) setPrompt(`${prompt.trim()}\n\n${nextPrompt}`);
    else setPrompt(nextPrompt);
    textareaRef.current?.focus();
  }, [prompt]);

  const submitEdit = useCallback(async () => {
    if (!prompt.trim()) {
      setErrorMessage("仕上がりのイメージを入力してください。");
      return;
    }

    if (!hasActiveFiles) {
      setErrorMessage("少なくとも1枚の参考画像を追加してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);
    undoStackRef.current = [];
    redoStackRef.current = [];

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setTimeout(() => {
        const element = document.getElementById("result-pane");
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      requestStartTimeRef.current = Date.now();
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      activeUploads.forEach((upload) => {
        if (upload.file) formData.append("images", upload.file);
      });

      const res = await fetch("/api/freestyle-edit", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const elapsedMs = Date.now() - requestStartTimeRef.current;
      const data: unknown = await res.json();

      if (!res.ok) {
        throw new Error(
          getRequestErrorMessage({
            status: res.status,
            payload: data,
            fallback: "画像の生成に失敗しました。内容を少し変えてもう一度お試しください。",
          }),
        );
      }

      if (
        !data ||
        typeof data !== "object" ||
        !("imageBase64" in data) ||
        typeof data.imageBase64 !== "string"
      ) {
        throw new Error("画像データを取得できませんでした。もう一度お試しください。");
      }

      const mimeType =
        "mimeType" in data && typeof data.mimeType === "string" ? data.mimeType : "image/png";

      pushRecentPrompt(prompt);

      const nextImage = `data:${mimeType};base64,${data.imageBase64}`;
      const nextHistory = [...history];
      const nextIndex = nextHistory.push(nextImage) - 1;
      const trimmed = nextIndex > MAX_HISTORY ? nextIndex - MAX_HISTORY : 0;
      setHistory(nextHistory.slice(trimmed));
      setHistoryIndex(nextIndex - trimmed);
      setResultImage(nextImage);
      completeProgress(elapsedMs);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "生成中にエラーが発生しました。しばらくしてからお試しください。",
      );
      completeProgress();
    }
  }, [activeUploads, completeProgress, hasActiveFiles, history, prompt, pushRecentPrompt]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitEdit();
  };

  return (
    <EditorLayout
      resultPane={
        <Section title="仕上がり">
          {isSubmitting ? (
            <ProgressDisplay
              isVisible={true}
              currentStep={currentStep}
              progress={progress}
              steps={FREESTYLE_PROGRESS_STEPS}
              timeRemaining={timeRemaining}
            />
          ) : resultImage ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-2">
                {history.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={goBack} disabled={!canGoBack}>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      前の結果
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={goForward} disabled={!canGoForward}>
                      次の結果
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <span className="text-dns-14 text-[var(--color-neutral-400)] tabular-nums">
                      {historyIndex + 1} / {history.length}
                    </span>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    const current = resultImage;
                    if (!current) return;
                    const previous = history[historyIndex - 1] ?? null;
                    setResultImage(previous);
                    setHistoryIndex(Math.max(0, historyIndex - 1));
                  }}
                  className="inline-flex items-center gap-1 text-oln-14 text-[var(--color-neutral-500)] hover:text-[var(--color-primary-600)] rounded-[var(--radius-md)] px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
                  aria-label="結果を比較"
                >
                  <span className="text-dns-14">前の結果と比較</span>
                </button>
              </div>

              <Image
                src={resultImage}
                alt="自由生成の結果画像"
                width={900}
                height={600}
                className="rounded-[var(--radius-lg)] w-full border border-[var(--color-neutral-200)] shadow-[var(--shadow-level-3)]"
                unoptimized
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild className="w-full" size="lg">
                  <a href={resultImage} download={`freestyle-${Date.now()}.png`}>
                    <Download className="w-4 h-4 mr-2" />
                    画像をダウンロード
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => void submitEdit()}
                  disabled={!canSubmit}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  同じ内容でもう一度
                </Button>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={resetEditor}>
                <RotateCcw className="w-4 h-4 mr-2" />
                最初からやり直す
              </Button>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--color-neutral-400)] border-2 border-dashed border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] rounded-[var(--radius-lg)] px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center">
                <Download className="w-6 h-6 text-[var(--color-neutral-300)]" />
              </div>
              <p className="font-medium text-[var(--color-neutral-500)]">
                生成結果がここに表示されます
              </p>
            </div>
          )}
        </Section>
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
                    onClick={() => {
                      if (uploads.length <= 1) return;
                      removeUploadSlot(slot.id);
                      setResultImage(null);
                      setErrorMessage(null);
                    }}
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
                <div className="flex flex-col mb-2 invisible select-none" aria-hidden="true">
                  <span className="text-dns-14">Placeholder</span>
                </div>
                <button
                  type="button"
                  onClick={addUploadSlot}
                  className="h-48 w-full rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-500)] transition-colors hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] flex flex-col items-center justify-center"
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
          <div className="relative">
            <textarea
              ref={textareaRef}
              name="freestylePrompt"
              autoComplete="off"
              spellCheck={false}
              maxLength={MAX_PROMPT_LENGTH}
              className="w-full h-32 rounded-[var(--radius-md)] bg-white border border-[var(--color-neutral-200)] p-4 pr-12 text-[var(--color-neutral-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-500)] transition-shadow resize-y text-std-16"
              placeholder="仕上がりのイメージを自由に記入してください… (Ctrl+Z で元に戻せます)"
              value={prompt}
              onChange={(event) => handlePromptChange(event.target.value)}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleUndo}
                disabled={!undoStackRef.current.length || isSubmitting || isOptimizingAny}
                className="h-8 w-8 p-0"
                aria-label="元に戻す"
              >
                <span className="text-dns-15 font-bold text-[var(--color-neutral-500)]">↶</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRedo}
                disabled={!redoStackRef.current.length || isSubmitting || isOptimizingAny}
                className="h-8 w-8 p-0"
                aria-label="やり直す"
              >
                <span className="text-dns-15 font-bold text-[var(--color-neutral-500)]">↷</span>
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {recentPrompts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-oln-14 text-[var(--color-neutral-500)]">最近:</span>
                {recentPrompts.map((recent) => (
                  <Button
                    key={`${recent}-${Date.now()}`}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full border border-[var(--color-neutral-200)] px-3 text-dns-14"
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
          <p
            className={`mt-2 text-dns-14 ${isPromptTooLong ? "text-[var(--color-error-dark)]" : "text-[var(--color-neutral-400)]"}`}
          >
            {prompt.length} / {MAX_PROMPT_LENGTH}
          </p>
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
          <Button type="button" size="lg" variant="secondary" onClick={resetEditor}>
            入力をクリア
          </Button>
        </div>
        {errorMessage && (
          <div className="dads-banner dads-banner--error text-dns-15" aria-live="polite">
            <p className="font-bold">{errorMessage}</p>
            <p className="mt-1 opacity-80">
              指示文を短くしたり、参考画像を減らしたりすると安定することがあります。
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void submitEdit()}
                disabled={!canSubmit}
              >
                同じ内容で再試行
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={resetEditor}>
                最初からやり直す
              </Button>
            </div>
          </div>
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
