"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { ResultPane } from "@/components/features/editor/ResultPane";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button, cn } from "@/components/ui/Button";
import { ImageUploadGrid } from "@/components/ui/ImageUploadGrid";
import { PromptTextarea } from "@/components/ui/PromptTextarea";
import { StarterChips } from "@/components/ui/StarterChips";
import { ToneChips } from "@/components/ui/ToneChips";
import { STARTER_PROMPTS } from "@/utils/starterPrompts";
import { TONE_PROMPTS } from "@/utils/tonePrompts";
import { Section } from "@/components/ui/Section";
import { useEditorController } from "@/hooks/useEditorController";
import { ICON_STYLES } from "@/utils/iconStyles";
import { MAX_ICON_UPLOADS, MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import { useToast } from "@/components/ui/Toast";
import { Check, Globe, Loader2, Sparkles, User, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ProgressStep } from "@/components/ProgressDisplay";

const FAMILY_CONTACT_PRESETS = [
  "小学校",
  "学童クラブ",
  "保育園・幼稚園",
  "習い事",
  "じいじ・ばあば",
  "クリニック・病院",
  "連絡網",
  "お友達",
];

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

export function IconCreator() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("auto");
  const customPromptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    recentPrompts,
    prompt: customPrompt,
    handlePromptChange,
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
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
    resetSubmit,
    uploads,
    isOptimizingAny,
    optimizingIds,
    addUploadSlot,
    removeUploadSlot,
    handleFileChange,
    progress,
    currentStep,
    timeRemaining,
    handleSubmit,
    resetEditor,
  } = useEditorController({
    recentStorageKey: "icon-recent-prompts",
    progressSteps: ICON_PROGRESS_STEPS,
    maxUploads: MAX_ICON_UPLOADS,
    pasteToUpload: true,
    endpoint: "/api/icon-generate",
    errorFallback: "アイコンの生成に失敗しました。情報を少し減らしてもう一度お試しください。",
    downloadPrefix: "icon",
    validate: () => (name.trim() ? null : "連絡先名を入力してください。"),
    buildFormData: (ctx) => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("style", selectedStyle);
      if (url.trim()) formData.append("url", url.trim());
      if (ctx.prompt.trim()) formData.append("customPrompt", ctx.prompt.trim());
      ctx.activeUploads.forEach((upload) => {
        if (upload.file) formData.append("images", upload.file);
      });
      return formData;
    },
    recentPrompt: (ctx) => ctx.prompt.trim() || null,
    galleryEntry: (ctx) => ({
      mode: "icon",
      title: name.trim() || "アイコン",
      prompt: ctx.prompt.trim(),
    }),
    onNavigate: () => {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    },
    resetFields: () => {
      setName("");
      setUrl("");
      setSelectedStyle("auto");
    },
    scrollToTopOnReset: true,
  });

  const starterPrompts = STARTER_PROMPTS.filter((p) => p.modes.includes("icon"));
  const tonePrompts = TONE_PROMPTS.filter((p) => p.modes.includes("icon"));
  const applyTone = (suffix: string) => {
    handlePromptChange(customPrompt.trim() ? `${customPrompt.trim()}、${suffix}` : suffix);
  };

  const canSubmit =
    name.trim().length > 0 &&
    customPrompt.length <= MAX_PROMPT_LENGTH &&
    !isSubmitting &&
    !isOptimizingAny;
  const selectedStyleOption = useMemo(
    () => ICON_STYLES.find((styleOption) => styleOption.id === selectedStyle) ?? ICON_STYLES[0],
    [selectedStyle],
  );

  const handleRemoveUploadSlot = useCallback(
    (id: string) => {
      removeUploadSlot(id);
      resetSubmit();
    },
    [removeUploadSlot, resetSubmit],
  );

  const handleRecentSelect = useCallback(
    (recentPrompt: string) => {
      handlePromptChange(recentPrompt);
      customPromptTextareaRef.current?.focus();
    },
    [handlePromptChange],
  );

  return (
    <EditorLayout
      title="アイコン作成"
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
                <div className="w-48 h-48 rounded-[var(--radius-full)] overflow-hidden border-4 border-[var(--color-neutral-300)] shadow-[var(--shadow-level-3)]">
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
                <p className="text-dns-14 text-[var(--color-neutral-500)] mt-1">
                  {selectedStyleOption.preview}
                </p>
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-neutral-300)] shadow-[var(--shadow-level-3)]">
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
            aria-label="連絡先名"
            className="w-full rounded-[var(--radius-md)] bg-white border border-[var(--color-neutral-300)] px-4 py-3 text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-500)] transition-shadow text-std-20"
            placeholder="例: 桜小学校児童クラブ"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-dns-14 text-[var(--color-neutral-500)] mr-1">よく使う例:</span>
            {FAMILY_CONTACT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setName(preset);
                  toast.info(`「${preset}」を入力しました`);
                }}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-dns-14 bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] hover:border-[var(--color-primary-300)] border border-[var(--color-neutral-200)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
              >
                + {preset}
              </button>
            ))}
          </div>
        </Section>

        <Section title="2. 参考URL（任意）">
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-neutral-500)]" />
            <input
              name="referenceUrl"
              autoComplete="off"
              spellCheck={false}
              type="url"
              aria-label="参考 URL"
              className="w-full rounded-[var(--radius-md)] bg-white border border-[var(--color-neutral-300)] pl-12 pr-4 py-3 text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-500)] transition-shadow text-std-16"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
        </Section>

        <Section title="3. 参考画像（任意）">
          <ImageUploadGrid
            uploads={uploads}
            maxUploads={MAX_ICON_UPLOADS}
            optimizingIds={optimizingIds}
            onFileChange={handleFileChange}
            onRemoveSlot={handleRemoveUploadSlot}
            onAddSlot={addUploadSlot}
            gridClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
            addButtonHeight="compact"
          />
        </Section>

        <Section title="4. スタイル">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ICON_STYLES.map((styleOption) => (
              <button
                key={styleOption.id}
                type="button"
                onClick={() => setSelectedStyle(styleOption.id)}
                aria-pressed={selectedStyle === styleOption.id}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-[var(--radius-md)] border-2 p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]",
                  selectedStyle === styleOption.id
                    ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] shadow-[var(--shadow-level-1)] ring-1 ring-[var(--color-primary-600)]"
                    : "border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] hover:border-[var(--color-neutral-400)] hover:bg-[var(--color-neutral-100)]",
                )}
              >
                {selectedStyle === styleOption.id && (
                  <span className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary-600)] text-white shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
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
                    <span className="block text-dns-14 text-[var(--color-neutral-500)]">
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
            ariaLabel="追加の指示"
            textareaRef={customPromptTextareaRef}
            textareaClassName="h-24 resize-none"
            counterAlign="right"
          />
          <StarterChips
            prompts={starterPrompts}
            disabled={isSubmitting}
            onPick={handlePromptChange}
          />
          <ToneChips tones={tonePrompts} disabled={isSubmitting} onPick={applyTone} />
          {recentPrompts.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-oln-14 text-[var(--color-neutral-500)]">最近:</span>
              {recentPrompts.map((recent) => (
                <Button
                  key={recent}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-full border border-[var(--color-neutral-300)] px-2 text-dns-14"
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
