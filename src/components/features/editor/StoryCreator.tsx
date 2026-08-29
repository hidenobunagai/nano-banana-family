"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { ResultPane } from "@/components/features/editor/ResultPane";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button, cn } from "@/components/ui/Button";
import { ImageUploadGrid } from "@/components/ui/ImageUploadGrid";
import { PromptTextarea } from "@/components/ui/PromptTextarea";
import { Section } from "@/components/ui/Section";
import { useEditorSubmit } from "@/hooks/useEditorSubmit";
import { useProgressSimulation } from "@/hooks/useProgressSimulation";
import { useRecentPrompts } from "@/hooks/useRecentPrompts";
import { useResultHistory } from "@/hooks/useResultHistory";
import { useTextUndoRedo } from "@/hooks/useTextUndoRedo";
import { useUndoRedoShortcuts } from "@/hooks/useUndoRedoShortcuts";
import { useUploadSlots } from "@/hooks/useUploadSlots";
import { saveToGallery } from "@/utils/galleryStorage";
import { useToast } from "@/components/ui/Toast";
import {
  BookOpen,
  Check,
  Compass,
  Copy,
  Heart,
  Laugh,
  Loader2,
  MessageSquare,
  Newspaper,
  Sparkles,
  Sun,
  Wand2,
} from "lucide-react";
import Image from "next/image";
import { type FormEvent, useCallback, useRef, useState } from "react";
import type { ProgressStep } from "@/components/ProgressDisplay";

const STORY_TYPES = [
  {
    id: "picture-book",
    label: "絵本風",
    description: "温かみのあるイラストとナレーション",
    icon: BookOpen,
    colorClass: "bg-amber-500",
  },
  {
    id: "comic",
    label: "4コマ漫画",
    description: "セリフと吹き出し付きのコマ割り漫画",
    icon: MessageSquare,
    colorClass: "bg-sky-500",
  },
  {
    id: "newspaper",
    label: "家族新聞",
    description: "見出し・記事・観察レポート風",
    icon: Newspaper,
    colorClass: "bg-emerald-500",
  },
] as const;

const STORY_TONES = [
  { id: "funny", label: "おもしろ", icon: Laugh },
  { id: "cute", label: "かわいい", icon: Heart },
  { id: "adventure", label: "ぼうけん", icon: Compass },
  { id: "warm", label: "ほのぼの", icon: Sun },
] as const;

const STORY_PRESET_TAGS = [
  "お誕生日のお祝い",
  "公園での大冒険",
  "家族旅行・おでかけ",
  "初めて〇〇ができた日",
  "ドタバタな休日の朝",
  "お料理・お手伝い",
  "お昼寝と夢の世界",
];

const STORY_PROGRESS_STEPS: ProgressStep[] = [
  { id: "analyze", label: "写真の表情と状況を分析中...", estimatedDuration: 1800 },
  { id: "script", label: "ストーリーとセリフを構成中...", estimatedDuration: 2000 },
  { id: "illustrate", label: "Gemini で物語の一コマを生成中...", estimatedDuration: 6200 },
  { id: "layout", label: "イラストとレイアウトを仕上げ中...", estimatedDuration: 1400 },
  { id: "complete", label: "完成！", estimatedDuration: 400 },
];

const MAX_STORY_UPLOADS = 5;
const MAX_HISTORY = 4;
const MAX_RECENT_PROMPTS = 6;

export function StoryCreator() {
  const toast = useToast();
  const [storyType, setStoryType] = useState<"picture-book" | "comic" | "newspaper">("picture-book");
  const [tone, setTone] = useState<"funny" | "cute" | "adventure" | "warm">("funny");
  const [language, setLanguage] = useState<"ja" | "en">("ja");
  const [isComparing, setIsComparing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { recentPrompts, pushRecent } = useRecentPrompts("story-recent-prompts", MAX_RECENT_PROMPTS);
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
    reset: resetSubmit,
  } = useEditorSubmit({
    validate: () => {
      if (!hasActiveFiles) return "少なくとも1枚の写真をアップロードしてください。";
      return null;
    },
    buildFormData: () => {
      const formData = new FormData();
      formData.append("storyType", storyType);
      formData.append("tone", tone);
      formData.append("language", language);
      if (customPrompt.trim()) formData.append("customPrompt", customPrompt.trim());
      activeUploads.forEach((upload) => {
        if (upload.file) formData.append("images", upload.file);
      });
      return formData;
    },
    endpoint: "/api/create-story",
    errorFallback: "ストーリー画像の生成に失敗しました。写真を変えてもう一度お試しください。",
    downloadPrefix: `story-${storyType}`,
    onBeforeSubmit: () => {
      clearStacks();
      setIsComparing(false);
    },
    onSuccess: (image) => {
      if (customPrompt.trim()) pushRecent(customPrompt.trim());
      pushResult(image);
      const commaIndex = image.indexOf(",");
      const mimeMatch = image.match(/^data:([^;]+);base64,/);
      if (commaIndex !== -1) {
        void saveToGallery({
          mode: "story",
          title: `${storyType === "picture-book" ? "絵本" : storyType === "comic" ? "4コマ漫画" : "家族新聞"} (${tone})`,
          prompt: customPrompt.trim(),
          imageBase64: image.slice(commaIndex + 1),
          mimeType: mimeMatch?.[1] || "image/png",
        });
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
    removeUploadSlot,
    handleFileChange,
    resetUploads,
  } = useUploadSlots({
    maxSlots: MAX_STORY_UPLOADS,
    initialSlots: 1,
    onBeforeChange: () => resetSubmit(),
    onFileError: setErrorMessage,
  });

  const hasActiveFiles = activeUploads.length > 0;
  const canSubmit = hasActiveFiles && !isSubmitting && !isOptimizingAny;

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), [setIsSubmitting]);

  const {
    progress,
    currentStep,
    timeRemaining,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    steps: STORY_PROGRESS_STEPS,
    onComplete: handleProgressComplete,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const handleRecentSelect = (selectedPrompt: string) => {
    handlePromptChange(selectedPrompt);
    toast.info("履歴からプロンプトを適用しました");
  };

  const appendTag = (tag: string) => {
    const next = customPrompt.trim() ? `${customPrompt.trim()}、${tag}` : tag;
    handlePromptChange(next);
    toast.info(`「${tag}」を追加しました`);
  };

  const handleRetry = () => {
    if (!canSubmit) return;
    void submit();
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      navigateTo(prevIndex);
      setResultImage(history[prevIndex]);
      setIsComparing(false);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      navigateTo(nextIndex);
      setResultImage(history[nextIndex]);
      setIsComparing(false);
    }
  };

  const resetEditor = () => {
    resetUploads();
    resetText();
    clearStacks();
    resetHistory();
    resetSubmit();
    setIsComparing(false);
  };

  const displayedImage = isComparing && historyIndex > 0 ? history[historyIndex - 1] : resultImage;

  return (
    <EditorLayout
      title="ストーリー作成"
      resultPane={
        <ResultPane
          isSubmitting={isSubmitting}
          steps={STORY_PROGRESS_STEPS}
          currentStep={currentStep}
          progress={progress}
          timeRemaining={timeRemaining}
          resultImage={displayedImage}
          emptyIcon={<BookOpen className="w-12 h-12 text-[var(--color-neutral-400)]" />}
          emptyText="写真を選ぶと、AI が絵本や漫画のストーリー作品を自動生成します"
          history={{
            index: historyIndex,
            total: history.length,
            canBack: historyIndex > 0,
            canForward: historyIndex < history.length - 1,
          }}
          onBack={handleBack}
          onForward={handleForward}
          downloadFilename={resultFilename}
          downloadLabel="ストーリー画像をダウンロード"
          onRetry={handleRetry}
          retryLabel="同じ写真でもう一度生成"
          canRetry={canSubmit}
          onReset={resetEditor}
          actions={
            historyIndex > 0 &&
            resultImage && (
              <Button
                size="sm"
                variant="secondary"
                aria-pressed={isComparing}
                onClick={() => setIsComparing((prev) => !prev)}
                className="text-dns-14 h-8 px-2.5 rounded-full"
              >
                {isComparing ? "最新の結果に戻る" : "前の結果と比較"}
              </Button>
            )
          }
        >
          {displayedImage && (
            <div className="relative aspect-4/3 sm:aspect-square w-full rounded-2xl overflow-hidden border border-[var(--color-neutral-300)] shadow-[var(--shadow-level-2)] bg-black/5">
              <Image
                src={displayedImage}
                alt="ストーリー生成の結果画像"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </ResultPane>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Upload Photos */}
        <Section title="1. 家族の写真をアップロード">
          <p className="text-dns-14 text-[var(--color-neutral-500)] mb-3">
            日常の写真、おでかけの写真を 1〜5 枚選んでください。
          </p>
          <ImageUploadGrid
            uploads={uploads}
            maxUploads={MAX_STORY_UPLOADS}
            optimizingIds={optimizingIds}
            onFileChange={handleFileChange}
            onRemoveSlot={removeUploadSlot}
            onAddSlot={addUploadSlot}
          />
        </Section>

        {/* Step 2: Story Format */}
        <Section title="2. ストーリーの形式">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STORY_TYPES.map((typeOption) => {
              const Icon = typeOption.icon;
              const isSelected = storyType === typeOption.id;
              return (
                <button
                  key={typeOption.id}
                  type="button"
                  onClick={() => setStoryType(typeOption.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]",
                    isSelected
                      ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] shadow-[var(--shadow-level-1)] ring-1 ring-[var(--color-primary-600)]"
                      : "border-[var(--color-neutral-300)] bg-white hover:border-[var(--color-neutral-400)]",
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary-600)] text-white">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs",
                        typeOption.colorClass,
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-std-16 text-[var(--color-neutral-900)]">
                        {typeOption.label}
                      </div>
                      <div className="text-dns-14 text-[var(--color-neutral-500)] line-clamp-1">
                        {typeOption.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Step 3: Tone & Language */}
        <Section title="3. トーンと言語">
          <div className="space-y-4">
            <div>
              <span className="text-oln-14 font-medium text-[var(--color-neutral-700)] block mb-2">
                雰囲気（トーン）
              </span>
              <div className="flex flex-wrap gap-2">
                {STORY_TONES.map((toneOption) => {
                  const Icon = toneOption.icon;
                  const isSelected = tone === toneOption.id;
                  return (
                    <button
                      key={toneOption.id}
                      type="button"
                      onClick={() => setTone(toneOption.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-dns-14 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]",
                        isSelected
                          ? "border-[var(--color-primary-600)] bg-[var(--color-primary-100)] text-[var(--color-primary-800)] font-bold shadow-xs"
                          : "border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {toneOption.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-oln-14 font-medium text-[var(--color-neutral-700)] block mb-2">
                出力言語
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage("ja")}
                  aria-pressed={language === "ja"}
                  className={cn(
                    "px-4 py-1.5 rounded-full border text-dns-14 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]",
                    language === "ja"
                      ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white font-bold"
                      : "border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]",
                  )}
                >
                  日本語
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  aria-pressed={language === "en"}
                  className={cn(
                    "px-4 py-1.5 rounded-full border text-dns-14 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]",
                    language === "en"
                      ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white font-bold"
                      : "border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]",
                  )}
                >
                  英語（子供の英語学習用）
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* Step 4: Optional details */}
        <Section title="4. 追加のストーリー設定（任意）">
          <PromptTextarea
            name="storyCustomPrompt"
            value={customPrompt}
            onValueChange={handlePromptChange}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            disabled={isSubmitting || isOptimizingAny}
            placeholder="例: 「〇〇ちゃんが公園で恐竜を見つけた設定にして」「パパがオチで転ぶ展開にして」など…"
            ariaLabel="追加のストーリー設定"
            textareaRef={textareaRef}
            textareaClassName="h-24 resize-y"
          />

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-dns-14 text-[var(--color-neutral-500)] mr-1">テーマ候補:</span>
            {STORY_PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => appendTag(tag)}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-dns-14 bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)] hover:border-[var(--color-primary-300)] border border-[var(--color-neutral-200)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
              >
                + {tag}
              </button>
            ))}
          </div>
        </Section>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="submit"
            disabled={!canSubmit}
            size="lg"
            className="flex-1 h-14 text-lg font-bold bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] shadow-[0_4px_14px_var(--color-primary-600)/30]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ストーリーを生成中…
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                ストーリーを生成する
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
            hint="写真の枚数を変えたり、設定をシンプルにすると改善する場合があります。"
            retryLabel="同じ内容で再試行"
            onRetry={() => void submit()}
            canRetry={canSubmit}
            onReset={resetEditor}
          />
        )}
      </form>
    </EditorLayout>
  );
}
