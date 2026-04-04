"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { ProgressDisplay } from "@/components/ProgressDisplay";
import { PromptPicker } from "@/components/PromptPicker";
import { Button, cn } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { Section } from "@/components/ui/Section";
import { PROGRESS_STEPS, useProgressSimulation } from "@/hooks/useProgressSimulation";
import { useUploadSlots } from "@/hooks/useUploadSlots";
import { PROMPT_PRESETS, type PromptOption } from "@/promptPresets";
import { getRequestErrorMessage } from "@/utils/requestErrorMessage";
import { Download, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const MARTIAL_ARCADE_PROMPT_ID = "martial-arcade";

export function SimpleEditor() {
  const [selectedPromptId, setSelectedPromptId] = useState<string>(PROMPT_PRESETS[0]?.id ?? "");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null);

  const requiresDualUpload = selectedPromptId === MARTIAL_ARCADE_PROMPT_ID;
  const maxSlots = requiresDualUpload ? 2 : 1;

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
    maxSlots,
    initialSlots: 1,
    onBeforeChange: () => {
      setErrorMessage(null);
      setResultImage(null);
    },
    onFileError: setErrorMessage,
  });

  const handleProgressComplete = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const {
    progress,
    currentStep,
    timeRemaining,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
  });

  useEffect(() => {
    setDownloadFileName(resultImage ? `hide-nb-edit-${Date.now()}.png` : null);
  }, [resultImage]);

  const selectedPromptOption = useMemo(
    () => PROMPT_PRESETS.find((option) => option.id === selectedPromptId),
    [selectedPromptId],
  );

  const selectedPrompt = selectedPromptOption?.prompt ?? "";

  const groupedPrompts = useMemo(() => {
    const groups: Record<string, PromptOption[]> = {};
    PROMPT_PRESETS.forEach((prompt) => {
      if (!groups[prompt.category]) {
        groups[prompt.category] = [];
      }
      groups[prompt.category].push(prompt);
    });
    return groups;
  }, []);

  const hasRequiredFiles = requiresDualUpload
    ? activeUploads.length >= 2
    : activeUploads.length >= 1;
  const canSubmit = hasRequiredFiles && !isSubmitting && !isOptimizingAny;

  const resetEditor = useCallback(() => {
    resetUploads();
    setResultImage(null);
    setErrorMessage(null);
    setDownloadFileName(null);
  }, [resetUploads]);

  const submitEdit = useCallback(async () => {
    if (!selectedPrompt) {
      setErrorMessage("プロンプトを選択してください。");
      return;
    }

    if (!hasRequiredFiles) {
      setErrorMessage(
        requiresDualUpload
          ? "2枚の画像が必要です。左右それぞれの画像を選んでください。"
          : "画像をアップロードしてください。",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append("prompt", selectedPrompt);
      activeUploads.forEach((upload) => {
        if (upload.file) {
          formData.append(
            requiresDualUpload && activeUploads.indexOf(upload) === 1 ? "image_secondary" : "image",
            upload.file,
          );
        }
      });

      const res = await fetch("/api/edit-image", {
        method: "POST",
        body: formData,
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        throw new Error(
          getRequestErrorMessage({
            status: res.status,
            payload: data,
            fallback: "画像編集に失敗しました。時間をおいてもう一度お試しください。",
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
          : "予期しないエラーが発生しました。しばらくしてからもう一度お試しください。",
      );
    } finally {
      completeProgress();
    }
  }, [activeUploads, completeProgress, hasRequiredFiles, requiresDualUpload, selectedPrompt]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitEdit();
  };

  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    setErrorMessage(null);
    setResultImage(null);
  };

  return (
    <EditorLayout
      resultPane={
        <Section title="仕上がり" delay={0.2} className="h-full">
          {isSubmitting ? (
            <ProgressDisplay
              isVisible={true}
              currentStep={currentStep}
              progress={progress}
              steps={PROGRESS_STEPS}
              timeRemaining={timeRemaining}
            />
          ) : resultImage ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="rounded-xl overflow-hidden border border-stone-200 shadow-2xl">
                <Image
                  src={resultImage}
                  alt="変換後の画像"
                  width={900}
                  height={600}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild className="w-full" size="lg">
                  <a href={resultImage} download={downloadFileName ?? "image.png"}>
                    <Download className="w-4 h-4 mr-2" />
                    画像をダウンロード
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => void submitEdit()}
                  disabled={!canSubmit}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  同じ設定でもう一度
                </Button>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={resetEditor}>
                <RotateCcw className="w-4 h-4 mr-2" />
                別の画像でやり直す
              </Button>
            </div>
          ) : (
            <div className="h-64 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 px-6 text-center text-stone-400 flex flex-col items-center justify-center gap-2">
              <p className="font-medium text-stone-500">ここに結果が表示されます</p>
              <p className="text-sm">
                画像を選んで「Gemini に仕上げてもらう」を押すと、右側に結果が表示されます。
              </p>
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 xl:space-y-8">
        <Section
          title={requiresDualUpload ? "1. 2枚の画像をアップロード" : "1. 画像をアップロード"}
        >
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">対応形式: JPG / PNG / WebP</p>
            <p className="mt-1 text-amber-700/90">
              選んだ画像は送信前に自動で最適化されます。
              {requiresDualUpload
                ? ` 現在のプリセット「${selectedPromptOption?.label ?? "対戦シーン"}」では2枚の画像が必要です。`
                : ""}
            </p>
          </div>
          <div className={cn("grid gap-6", requiresDualUpload && "md:grid-cols-2")}>
            {uploads.map((slot, index) => (
              <div key={slot.id} className="relative">
                <FileInput
                  subLabel={
                    requiresDualUpload
                      ? index === 0
                        ? "プレイヤー1 (左)"
                        : "プレイヤー2 (右)"
                      : undefined
                  }
                  previewUrl={slot.previewUrl}
                  isOptimizing={optimizingIds.includes(slot.id)}
                  onChange={(event) => handleFileChange(event, slot.id)}
                />
                {requiresDualUpload && uploads.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUploadSlot(slot.id)}
                    aria-label={`画像 ${index + 1} を削除`}
                    className="absolute top-8 right-2 rounded-full bg-red-500/90 p-1.5 text-white shadow-md transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {requiresDualUpload && uploads.length < 2 && (
              <button
                type="button"
                onClick={addUploadSlot}
                className="h-48 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 text-stone-500 transition-colors hover:border-amber-500/50 hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span className="block text-3xl">+</span>
                <span className="mt-2 block text-sm font-medium">2枚目の画像を追加</span>
              </button>
            )}
          </div>
        </Section>

        <Section title="2. プロンプトを選ぶ" delay={0.1}>
          <div className="mb-4 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-500">
            <p className="font-medium text-stone-700">
              現在の選択: {selectedPromptOption?.label ?? "未選択"}
            </p>
            <p className="mt-1">
              カテゴリ名でも検索できます。迷ったら、まずはプリセット名で探してみてください。
            </p>
          </div>
          <PromptPicker
            groups={groupedPrompts}
            selectedPromptId={selectedPromptId}
            onSelect={handlePromptSelect}
          />
        </Section>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Button
              type="submit"
              size="lg"
              className="w-full text-lg h-14 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 border-0"
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gemini が編集中…
                </>
              ) : (
                "Gemini に仕上げてもらう"
              )}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={resetEditor}>
              入力をクリア
            </Button>
          </div>
          {errorMessage && (
            <div
              className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm animate-in fade-in"
              aria-live="polite"
            >
              <p className="font-medium text-red-500">{errorMessage}</p>
              <p className="mt-1 text-red-500/80">
                内容を確認して、同じ設定でもう一度試すか、画像を入れ替えてください。
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void submitEdit()}
                  disabled={!canSubmit}
                >
                  同じ設定で再試行
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={resetEditor}>
                  入力をクリア
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>
    </EditorLayout>
  );
}
