"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { ResultPane } from "@/components/features/editor/ResultPane";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button, cn } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { PromptTextarea } from "@/components/ui/PromptTextarea";
import { Section } from "@/components/ui/Section";
import { useEditorSubmit } from "@/hooks/useEditorSubmit";
import { useProgressSimulation } from "@/hooks/useProgressSimulation";
import { useRecentPrompts } from "@/hooks/useRecentPrompts";
import { useResultHistory } from "@/hooks/useResultHistory";
import { useTextUndoRedo } from "@/hooks/useTextUndoRedo";
import { useUndoRedoShortcuts } from "@/hooks/useUndoRedoShortcuts";
import { useUploadSlots } from "@/hooks/useUploadSlots";
import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import { Globe, Loader2, Sparkles, User, X } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";
import type { ProgressStep } from "@/components/ProgressDisplay";

const ICON_PROGRESS_STEPS: ProgressStep[] = [
  { id: "analyze", label: "連絡先情報を分析中...", estimatedDuration: 1200 },
  { id: "fetch-url", label: "URLから情報を取得中...", estimatedDuration: 1800 },
  { id: "build-prompt", label: "デザインプランを構築中...", estimatedDuration: 1200 },
  {
    id: "generate",
    label: "Gemini でアイコンを生成中...",
    estimatedDuration: 6000,
  },
  { id: "polish", label: "仕上げ中...", estimatedDuration: 1000 },
  { id: "complete", label: "完了", estimatedDuration: 400 },
];

const MAX_ICON_UPLOADS = 3;
const MAX_HISTORY = 4;
const MAX_RECENT_PROMPTS = 6;

interface IconStyleOption {
  id: string;
  label: string;
  description: string;
  preview: string;
  colorClass: string;
}

const ICON_STYLE_OPTIONS: IconStyleOption[] = [
  {
    id: "auto",
    label: "おまかせ",
    description: "情報から最適スタイルを自動選択",
    preview: "学校・教室・家族連絡先におすすめ",
    colorClass: "bg-[var(--color-primary-600)]",
  },
  {
    id: "flat-minimal",
    label: "フラット・ミニマル",
    description: "シンプルな色面とシンボル",
    preview: "見やすさ重視・通知アイコン向け",
    colorClass: "bg-[var(--color-neutral-700)]",
  },
  {
    id: "gradient-modern",
    label: "グラデーション",
    description: "鮮やかなグラデーション",
    preview: "明るく親しみやすい雰囲気",
    colorClass: "bg-[var(--color-secondary-600)]",
  },
  {
    id: "illustrated",
    label: "イラスト風",
    description: "手描き感のある温かいスタイル",
    preview: "子ども向け・やわらかい印象に最適",
    colorClass: "bg-[var(--color-neutral-500)]",
  },
  {
    id: "photo-circle",
    label: "写真加工",
    description: "写真ベースの丸型アイコン",
    preview: "人物やロゴを活かしたいときに便利",
    colorClass: "bg-[var(--color-primary-700)]",
  },
];

export function IconCreator() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("auto");
  const customPromptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { recentPrompts, pushRecent } = useRecentPrompts("icon-recent-prompts", MAX_RECENT_PROMPTS);
  const {
    value: customPrompt,
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
    validate: () => (name.trim() ? null : "連絡先名を入力してください。"),
    buildFormData: () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("style", selectedStyle);
      if (url.trim()) formData.append("url", url.trim());
      if (customPrompt.trim()) formData.append("customPrompt", customPrompt.trim());
      activeUploads.forEach((upload) => {
        if (upload.file) formData.append("images", upload.file);
      });
      return formData;
    },
    endpoint: "/api/icon-generate",
    errorFallback: "アイコンの生成に失敗しました。情報を少し減らしてもう一度お試しください。",
    downloadPrefix: "icon",
    onBeforeSubmit: clearStacks,
    onSuccess: (image) => {
      if (customPrompt.trim()) pushRecent(customPrompt);
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
    removeUploadSlot,
    handleFileChange,
    resetUploads,
  } = useUploadSlots({
    maxSlots: MAX_ICON_UPLOADS,
    onBeforeChange: () => reset(),
    onFileError: setErrorMessage,
  });

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), [setIsSubmitting]);
  const {
    progress,
    currentStep,
    timeRemaining,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
    steps: ICON_PROGRESS_STEPS,
  });

  const canSubmit =
    name.trim().length > 0 &&
    customPrompt.length <= MAX_PROMPT_LENGTH &&
    !isSubmitting &&
    !isOptimizingAny;
  const selectedStyleOption = useMemo(
    () =>
      ICON_STYLE_OPTIONS.find((styleOption) => styleOption.id === selectedStyle) ??
      ICON_STYLE_OPTIONS[0],
    [selectedStyle],
  );

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateHistory = useCallback(
    (index: number) => {
      if (index < 0 || index >= history.length) return;
      navigateTo(index);
      setResultImage(history[index]);
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  const resetEditor = useCallback(() => {
    setName("");
    setUrl("");
    setSelectedStyle("auto");
    resetText();
    resetHistory();
    resetUploads();
    reset();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [resetText, resetHistory, resetUploads, reset]);

  const handleRemoveUploadSlot = useCallback(
    (id: string) => {
      removeUploadSlot(id);
      reset();
    },
    [removeUploadSlot, reset],
  );

  const handleRecentSelect = useCallback(
    (recentPrompt: string) => {
      handlePromptChange(recentPrompt);
      customPromptTextareaRef.current?.focus();
    },
    [handlePromptChange],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <EditorLayout
      resultPane={
        <ResultPane
          isSubmitting={isSubmitting}
          steps={ICON_PROGRESS_STEPS}
          currentStep={currentStep}
          progress={progress}
          timeRemaining={timeRemaining}
          resultImage={resultImage}
          emptyIcon={<User className="w-6 h-6 text-[var(--color-neutral-300)]" />}
          emptyText="アイコンがここに表示されます"
          history={{
            index: historyIndex,
            total: history.length,
            canBack: canGoBack,
            canForward: canGoForward,
          }}
          onBack={goBack}
          onForward={goForward}
          downloadFilename={resultFilename}
          downloadLabel="ダウンロード"
          onRetry={() => void submit()}
          retryLabel="同じ条件でもう一度"
          canRetry={canSubmit}
          onReset={resetEditor}
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-48 h-48 rounded-[var(--radius-full)] overflow-hidden border-4 border-[var(--color-neutral-200)] shadow-[var(--shadow-level-3)]">
                  <Image
                    src={resultImage!}
                    alt={`${name} の生成アイコン`}
                    width={512}
                    height={512}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[var(--color-primary-600)] rounded-[var(--radius-full)] flex items-center justify-center shadow-[var(--shadow-level-2)]">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-std-16 font-medium text-[var(--color-neutral-700)]">{name}</p>
                <p className="text-dns-14 text-[var(--color-neutral-400)] mt-1">
                  {selectedStyleOption.preview}
                </p>
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-neutral-200)] shadow-[var(--shadow-level-3)]">
              <Image
                src={resultImage!}
                alt={`${name} の四角いプレビュー`}
                width={512}
                height={512}
                className="w-full h-auto"
                unoptimized
              />
            </div>
          </div>
        </ResultPane>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="1. 連絡先名">
          <input
            name="contactName"
            autoComplete="off"
            type="text"
            className="w-full rounded-[var(--radius-md)] bg-white border border-[var(--color-neutral-200)] px-4 py-3 text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-500)] transition-shadow text-std-20"
            placeholder="例: 桜小学校児童クラブ"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Section>

        <Section title="2. 参考URL（任意）">
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-neutral-400)]" />
            <input
              name="referenceUrl"
              autoComplete="off"
              spellCheck={false}
              type="url"
              className="w-full rounded-[var(--radius-md)] bg-white border border-[var(--color-neutral-200)] pl-12 pr-4 py-3 text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-500)] transition-shadow text-std-16"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
        </Section>

        <Section title="3. 参考画像（任意）">
          {uploads.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {uploads.map((slot, index) => (
                <div key={slot.id} className="relative">
                  <FileInput
                    subLabel={`参考画像 ${index + 1}`}
                    previewUrl={slot.previewUrl}
                    isOptimizing={optimizingIds.includes(slot.id)}
                    onChange={(event) => handleFileChange(event, slot.id)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveUploadSlot(slot.id)}
                    aria-label={`参考画像 ${index + 1} を削除`}
                    className="absolute top-2 right-2 rounded-[var(--radius-full)] bg-[var(--color-error-dark)]/90 p-1.5 text-white shadow-[var(--shadow-level-1)] transition-colors hover:bg-[var(--color-error-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error-dark)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploads.length < MAX_ICON_UPLOADS && (
            <button
              type="button"
              onClick={addUploadSlot}
              className="w-full h-20 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-neutral-200)] hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] transition-colors flex items-center justify-center text-[var(--color-neutral-500)] hover:text-[var(--color-primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
            >
              <span className="text-2xl mr-2">+</span>
              <span className="text-oln-14 font-medium">
                画像を追加（あと {MAX_ICON_UPLOADS - uploads.length} 枚）
              </span>
            </button>
          )}
        </Section>

        <Section title="4. スタイル">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ICON_STYLE_OPTIONS.map((styleOption) => (
              <button
                key={styleOption.id}
                type="button"
                onClick={() => setSelectedStyle(styleOption.id)}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-[var(--radius-md)] border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]",
                  selectedStyle === styleOption.id
                    ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] shadow-[var(--shadow-level-1)]"
                    : "border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] hover:border-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-100)]",
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-sm shadow-[var(--shadow-level-1)]",
                      styleOption.colorClass,
                    )}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span
                      className={cn(
                        "block text-oln-14 font-bold",
                        selectedStyle === styleOption.id
                          ? "text-[var(--color-primary-700)]"
                          : "text-[var(--color-neutral-700)]",
                      )}
                    >
                      {styleOption.label}
                    </span>
                    <span className="block text-dns-14 text-[var(--color-neutral-400)]">
                      {styleOption.preview}
                    </span>
                  </div>
                </div>
                <p className="text-dns-14 leading-relaxed text-[var(--color-neutral-500)]">
                  {styleOption.description}
                </p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="5. 追加の指示（任意）">
          <PromptTextarea
            name="customPrompt"
            value={customPrompt}
            onValueChange={handlePromptChange}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            disabled={isSubmitting || isOptimizingAny}
            placeholder="追加したい雰囲気があれば入力 (Ctrl+Z で元に戻せます)"
            textareaRef={customPromptTextareaRef}
            textareaClassName="h-24 resize-none"
            counterAlign="right"
          />
          {recentPrompts.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-oln-14 text-[var(--color-neutral-500)]">最近:</span>
              {recentPrompts.map((recent) => (
                <Button
                  key={recent}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-full border border-[var(--color-neutral-200)] px-2 text-dns-14"
                  onClick={() => handleRecentSelect(recent)}
                  disabled={isSubmitting || isOptimizingAny}
                >
                  {recent.length > 18 ? `${recent.slice(0, 18)}…` : recent}
                </Button>
              ))}
            </div>
          )}
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
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                アイコンを生成
              </>
            )}
          </Button>
          <Button type="button" size="lg" variant="secondary" onClick={resetEditor}>
            入力をクリア
          </Button>
        </div>

        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            hint="URLや追加指示を短くすると改善することがあります。必要な情報だけ残して再試行してください。"
            retryLabel="同じ条件で再試行"
            onRetry={() => void submit()}
            canRetry={canSubmit}
            onReset={resetEditor}
          />
        )}
      </form>
    </EditorLayout>
  );
}
