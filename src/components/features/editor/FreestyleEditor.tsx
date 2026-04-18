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
import { BookOpen, Download, Loader2, RefreshCw, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

const FREESTYLE_PROGRESS_STEPS: ProgressStep[] = [
  { id: "gather", label: "参考画像を読み込み中...", estimatedDuration: 1600 },
  { id: "plan", label: "編集プランを構築中...", estimatedDuration: 1800 },
  { id: "prompt", label: "指示内容を解釈中...", estimatedDuration: 1500 },
  {
    id: "generate",
    label: "Gemini で画像を生成中...",
    estimatedDuration: 6200,
  },
  { id: "refine", label: "仕上がりを調整中...", estimatedDuration: 1400 },
  { id: "complete", label: "完了", estimatedDuration: 400 },
];

const MAX_FREESTYLE_UPLOADS = 5;

export function FreestyleEditor() {
  const [prompt, setPrompt] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReferencePicker, setShowReferencePicker] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const resetEditor = useCallback(() => {
    resetUploads();
    setPrompt("");
    setResultImage(null);
    setErrorMessage(null);
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

  const handleReferenceSelect = useCallback((referencePrompt: string) => {
    setPrompt((prev) => {
      if (prev.trim()) {
        return `${prev}\n\n${referencePrompt}`;
      }
      return referencePrompt;
    });
    textareaRef.current?.focus();
  }, []);

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

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      activeUploads.forEach((upload) => {
        if (upload.file) {
          formData.append("images", upload.file);
        }
      });

      const res = await fetch("/api/freestyle-edit", {
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
  }, [activeUploads, completeProgress, hasActiveFiles, prompt]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitEdit();
  };

  return (
    <EditorLayout
      resultPane={
        <Section title="仕上がり" className="h-full">
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
              <Image
                src={resultImage}
                alt="自由生成の結果画像"
                width={900}
                height={600}
                className="rounded-[24px] w-full border border-[#e5e7eb] shadow-[0_10px_15px_rgba(0,0,0,0.1)]"
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
              <div className="space-y-1">
                <p className="font-medium text-[var(--color-neutral-500)]">生成結果がここに表示されます</p>
                <p className="text-dns-14 leading-relaxed">
                  参考画像と仕上がりイメージを入力して生成を実行してください。
                </p>
              </div>
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <Section title="1. 参考にしたい画像をアップロード">
          <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-dns-15 text-[var(--color-neutral-700)]">
            <p className="font-bold">最大 {MAX_FREESTYLE_UPLOADS} 枚まで追加できます</p>
            <p className="mt-1 text-[var(--color-neutral-600)]">
              複数の参考画像を入れるほど雰囲気を合わせやすくなります。選んだ画像は送信前に自動で最適化されます。
            </p>
          </div>
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
              <button
                type="button"
                onClick={addUploadSlot}
                className="h-48 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-500)] transition-colors hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] flex flex-col items-center justify-center"
              >
                <span className="block text-3xl">+</span>
                <span className="mt-2 block text-oln-14 font-medium">
                  参考画像を追加（あと {MAX_FREESTYLE_UPLOADS - uploads.length} 枚）
                </span>
              </button>
            )}
          </div>
        </Section>

        <Section title="2. 仕上がりのイメージを記入">
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-dns-15 text-[var(--color-neutral-600)]">
            <p>
              例:「やわらかい水彩風にしたい」「兄弟が冒険している映画ポスターのように」など、雰囲気・色・構図を書くと結果が安定します。
            </p>
            <p className="mt-1">
              下のボタンから140種類以上の参考プロンプトを選んでドラフトに入力できます。
            </p>
          </div>

          <textarea
            ref={textareaRef}
            name="freestylePrompt"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_PROMPT_LENGTH}
            className="w-full h-32 rounded-[var(--radius-md)] bg-white border border-[var(--color-neutral-200)] p-4 text-[var(--color-neutral-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-500)] transition-shadow resize-y text-std-16"
            placeholder="仕上がりのイメージを自由に記入してください…"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => setShowReferencePicker(true)}
              className="inline-flex items-center gap-1.5 text-oln-14 text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
            >
              <BookOpen className="w-4 h-4" />
              参考プロンプトから選ぶ
            </button>
            <p className={`text-dns-14 ${isPromptTooLong ? "text-[var(--color-error-dark)]" : "text-[var(--color-neutral-400)]"}`}>
              {prompt.length} / {MAX_PROMPT_LENGTH}
            </p>
          </div>
        </Section>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 bg-[#2563eb] hover:bg-[#1d4ed8] border-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
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
          <div
            className="dads-banner dads-banner--error text-dns-15"
            aria-live="polite"
          >
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
