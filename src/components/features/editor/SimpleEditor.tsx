"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { ProgressDisplay } from "@/components/ProgressDisplay";
import { PromptPicker } from "@/components/PromptPicker";
import { Button, cn } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { Section } from "@/components/ui/Section";
import {
  PROGRESS_STEPS,
  useProgressSimulation,
} from "@/components/useProgressSimulation";
import { PROMPT_PRESETS, type PromptOption } from "@/promptPresets";
import { resizeImage } from "@/utils/imageOptimization";
import { getRequestErrorMessage } from "@/utils/requestErrorMessage";
import { Download, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MARTIAL_ARCADE_PROMPT_ID = "martial-arcade";

export function SimpleEditor() {
  const [selectedPromptId, setSelectedPromptId] = useState<string>(
    PROMPT_PRESETS[0]?.id ?? "",
  );
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
  const [primaryPreviewUrl, setPrimaryPreviewUrl] = useState<string | null>(null);
  const [secondaryPreviewUrl, setSecondaryPreviewUrl] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizingPrimary, setIsOptimizingPrimary] = useState(false);
  const [isOptimizingSecondary, setIsOptimizingSecondary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleProgressComplete = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const { progress, currentStep, timeRemaining, complete: completeProgress } =
    useProgressSimulation({
      isActive: isSubmitting,
      onComplete: handleProgressComplete,
    });

  useEffect(() => {
    previewUrlsRef.current = [primaryPreviewUrl, secondaryPreviewUrl].filter(
      (value): value is string => Boolean(value),
    );
  }, [primaryPreviewUrl, secondaryPreviewUrl]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      previewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, []);

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

  const requiresDualUpload = selectedPromptId === MARTIAL_ARCADE_PROMPT_ID;

  useEffect(() => {
    if (!requiresDualUpload) {
      setSecondaryFile(null);
      setSecondaryPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setIsOptimizingSecondary(false);
    }
  }, [requiresDualUpload]);

  const isOptimizingAny = isOptimizingPrimary || isOptimizingSecondary;
  const hasRequiredFiles =
    Boolean(primaryFile) && (!requiresDualUpload || Boolean(secondaryFile));
  const canSubmit = hasRequiredFiles && !isSubmitting && !isOptimizingAny;

  const resetEditor = useCallback(() => {
    if (primaryPreviewUrl) {
      URL.revokeObjectURL(primaryPreviewUrl);
    }
    if (secondaryPreviewUrl) {
      URL.revokeObjectURL(secondaryPreviewUrl);
    }

    setPrimaryFile(null);
    setSecondaryFile(null);
    setPrimaryPreviewUrl(null);
    setSecondaryPreviewUrl(null);
    setResultImage(null);
    setErrorMessage(null);
    setDownloadFileName(null);
    setIsOptimizingPrimary(false);
    setIsOptimizingSecondary(false);
  }, [primaryPreviewUrl, secondaryPreviewUrl]);

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    slot: "primary" | "secondary",
  ) => {
    const file = event.target.files?.[0];
    const currentPreview = slot === "primary" ? primaryPreviewUrl : secondaryPreviewUrl;
    const setFile = slot === "primary" ? setPrimaryFile : setSecondaryFile;
    const setPreview =
      slot === "primary" ? setPrimaryPreviewUrl : setSecondaryPreviewUrl;
    const setOptimizing =
      slot === "primary" ? setIsOptimizingPrimary : setIsOptimizingSecondary;

    if (!file) {
      setFile(null);
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }
      setPreview(null);
      return;
    }

    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }

    setErrorMessage(null);
    setResultImage(null);
    setOptimizing(true);

    try {
      const optimized = await resizeImage(file);
      setFile(optimized);
      setPreview(URL.createObjectURL(optimized));
    } catch (error) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "画像の最適化に失敗しました。別の画像でもう一度お試しください。",
      );
    } finally {
      setOptimizing(false);
    }
  };

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

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("prompt", selectedPrompt);
      if (primaryFile) {
        formData.append("image", primaryFile);
      }
      if (requiresDualUpload && secondaryFile) {
        formData.append("image_secondary", secondaryFile);
      }

      const res = await fetch("/api/edit-image", {
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
        "mimeType" in data && typeof data.mimeType === "string"
          ? data.mimeType
          : "image/png";

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
  }, [
    completeProgress,
    hasRequiredFiles,
    primaryFile,
    requiresDualUpload,
    secondaryFile,
    selectedPrompt,
  ]);

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
            <FileInput
              subLabel={requiresDualUpload ? "プレイヤー1 (左)" : undefined}
              previewUrl={primaryPreviewUrl}
              isOptimizing={isOptimizingPrimary}
              onChange={(event) => handleFileChange(event, "primary")}
            />
            {requiresDualUpload && (
              <FileInput
                subLabel="プレイヤー2 (右)"
                previewUrl={secondaryPreviewUrl}
                isOptimizing={isOptimizingSecondary}
                onChange={(event) => handleFileChange(event, "secondary")}
              />
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
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm animate-in fade-in" aria-live="polite">
              <p className="font-medium text-red-500">{errorMessage}</p>
              <p className="mt-1 text-red-500/80">
                内容を確認して、同じ設定でもう一度試すか、画像を入れ替えてください。
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Button type="button" size="sm" onClick={() => void submitEdit()} disabled={!canSubmit}>
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
