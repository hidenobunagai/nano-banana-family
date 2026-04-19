"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { ProgressDisplay, type ProgressStep } from "@/components/ProgressDisplay";
import { Button, cn } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { Section } from "@/components/ui/Section";
import { useProgressSimulation } from "@/hooks/useProgressSimulation";
import { useUploadSlots } from "@/hooks/useUploadSlots";
import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import { getRequestErrorMessage } from "@/utils/requestErrorMessage";
import { Download, Globe, Loader2, RefreshCw, RotateCcw, Sparkles, User, X } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";

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
    colorClass: "bg-[#7c3aed]",
  },
  {
    id: "flat-minimal",
    label: "フラット・ミニマル",
    description: "シンプルな色面とシンボル",
    preview: "見やすさ重視・通知アイコン向け",
    colorClass: "bg-[#2563eb]",
  },
  {
    id: "gradient-modern",
    label: "グラデーション",
    description: "鮮やかなグラデーション",
    preview: "明るく親しみやすい雰囲気",
    colorClass: "bg-[#ea580c]",
  },
  {
    id: "illustrated",
    label: "イラスト風",
    description: "手描き感のある温かいスタイル",
    preview: "子ども向け・やわらかい印象に最適",
    colorClass: "bg-[#059669]",
  },
  {
    id: "photo-circle",
    label: "写真加工",
    description: "写真ベースの丸型アイコン",
    preview: "人物やロゴを活かしたいときに便利",
    colorClass: "bg-[#4f46e5]",
  },
];

export function IconCreator() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("auto");
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    onBeforeChange: () => {
      setErrorMessage(null);
      setResultImage(null);
    },
    onFileError: setErrorMessage,
  });

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), []);
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

  const isCustomPromptTooLong = customPrompt.length > MAX_PROMPT_LENGTH;
  const canSubmit =
    name.trim().length > 0 && !isCustomPromptTooLong && !isSubmitting && !isOptimizingAny;
  const selectedStyleOption = useMemo(
    () =>
      ICON_STYLE_OPTIONS.find((styleOption) => styleOption.id === selectedStyle) ??
      ICON_STYLE_OPTIONS[0],
    [selectedStyle],
  );

  const resetEditor = useCallback(() => {
    setName("");
    setUrl("");
    setSelectedStyle("auto");
    setCustomPrompt("");
    resetUploads();
    setResultImage(null);
    setErrorMessage(null);
  }, [resetUploads]);

  const handleRemoveUploadSlot = useCallback(
    (id: string) => {
      removeUploadSlot(id);
      setResultImage(null);
      setErrorMessage(null);
    },
    [removeUploadSlot],
  );

  const submitEdit = useCallback(async () => {
    if (!name.trim()) {
      setErrorMessage("連絡先名を入力してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("style", selectedStyle);

      if (url.trim()) {
        formData.append("url", url.trim());
      }

      if (customPrompt.trim()) {
        formData.append("customPrompt", customPrompt.trim());
      }

      activeUploads.forEach((upload) => {
        if (upload.file) {
          formData.append("images", upload.file);
        }
      });

      const res = await fetch("/api/icon-generate", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        throw new Error(
          getRequestErrorMessage({
            status: res.status,
            payload: data,
            fallback: "アイコンの生成に失敗しました。情報を少し減らしてもう一度お試しください。",
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

      setResultImage(`data:${mimeType};base64,${data.imageBase64}`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "生成中にエラーが発生しました。しばらくしてからお試しください。",
      );
    } finally {
      completeProgress();
    }
  }, [activeUploads, completeProgress, customPrompt, name, selectedStyle, url]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitEdit();
  };

  return (
    <EditorLayout
      resultPane={
        <Section title="生成されたアイコン" className="h-full">
          {isSubmitting ? (
            <ProgressDisplay
              isVisible={true}
              currentStep={currentStep}
              progress={progress}
              steps={ICON_PROGRESS_STEPS}
              timeRemaining={timeRemaining}
            />
          ) : resultImage ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-48 h-48 rounded-[var(--radius-full)] overflow-hidden border-4 border-[var(--color-neutral-200)] shadow-[var(--shadow-level-3)]">
                    <Image
                      src={resultImage}
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
                  src={resultImage}
                  alt={`${name} の四角いプレビュー`}
                  width={512}
                  height={512}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild className="w-full" size="lg">
                  <a href={resultImage} download={`icon-${Date.now()}.png`}>
                    <Download className="w-5 h-5 mr-2" />
                    ダウンロード
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
                  同じ条件でもう一度
                </Button>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={resetEditor}>
                <RotateCcw className="w-4 h-4 mr-2" />
                最初からやり直す
              </Button>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--color-neutral-400)] border-2 border-dashed border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] rounded-[var(--radius-lg)] px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center">
                <User className="w-8 h-8 text-[var(--color-neutral-300)]" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-[var(--color-neutral-500)]">
                  アイコンがここに表示されます
                </p>
                <p className="text-dns-14 leading-relaxed">
                  名前とスタイルを選び、必要ならURLや参考画像も追加してください。
                </p>
              </div>
            </div>
          )}
        </Section>
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
          <p className="mt-2 text-dns-14 text-[#9ca3af]">
            連絡先の用途や雰囲気が伝わる名前にすると、モチーフを決めやすくなります。
          </p>
        </Section>

        <Section title="2. 参考URL（任意）">
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
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
          <div
            className="mt-2 rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-dns-14 text-[var(--color-neutral-500)]"
            aria-live="polite"
          >
            {url.trim()
              ? "生成時にタイトル・説明・OGP画像の取得を試み、アイコンの方向性に反映します。"
              : "Webサイトの雰囲気も反映したいときだけ入力してください。URLなしでも生成できます。"}
          </div>
        </Section>

        <Section title="3. 参考画像（任意）">
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-dns-15 text-[var(--color-neutral-700)]">
            <p className="font-bold">最大 {MAX_ICON_UPLOADS} 枚まで追加できます</p>
            <p className="mt-1 text-[var(--color-neutral-600)]">
              ロゴ・人物写真・配色の参考画像などを入れると、仕上がりの方向性を合わせやすくなります。
            </p>
          </div>
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
                ロゴや写真を追加（あと {MAX_ICON_UPLOADS - uploads.length} 枚）
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
                  "relative flex flex-col items-start gap-2 rounded-[20px] border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]",
                  selectedStyle === styleOption.id
                    ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] shadow-[var(--shadow-level-1)]"
                    : "border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] hover:border-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-100)]",
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[20px] text-sm shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
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
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-dns-15 text-[var(--color-neutral-500)]">
            <span className="font-bold text-[var(--color-neutral-700)]">
              選択中のスタイル: {selectedStyleOption.label}
            </span>
            <p className="mt-1">{selectedStyleOption.preview}</p>
          </div>
        </Section>

        <Section title="5. 追加の指示（任意）">
          <textarea
            name="customPrompt"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_PROMPT_LENGTH}
            className="w-full h-24 rounded-[var(--radius-md)] bg-white border border-[var(--color-neutral-200)] p-4 text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-500)] transition-shadow resize-none text-std-16"
            placeholder="例: 桜の花びらをモチーフにして、ピンク系の暖かい色合いでやさしくまとめたい…"
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
          />
          <p
            className={`mt-1 text-dns-14 text-right ${isCustomPromptTooLong ? "text-[var(--color-error-dark)]" : "text-[var(--color-neutral-400)]"}`}
          >
            {customPrompt.length} / {MAX_PROMPT_LENGTH}
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
          <div className="dads-banner dads-banner--error text-dns-15" aria-live="polite">
            <p className="font-bold">{errorMessage}</p>
            <p className="mt-1 opacity-80">
              URLや追加指示を短くすると改善することがあります。必要な情報だけ残して再試行してください。
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void submitEdit()}
                disabled={!canSubmit}
              >
                同じ条件で再試行
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={resetEditor}>
                最初からやり直す
              </Button>
            </div>
          </div>
        )}
      </form>
    </EditorLayout>
  );
}
