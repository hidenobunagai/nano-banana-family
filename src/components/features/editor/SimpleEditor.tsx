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
import { Download, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const MARTIAL_ARCADE_PROMPT_ID = "martial-arcade";

export function SimpleEditor() {
  const [selectedPromptId, setSelectedPromptId] = useState<string>(
    PROMPT_PRESETS[0]?.id ?? ""
  );
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
  const [primaryPreviewUrl, setPrimaryPreviewUrl] = useState<string | null>(
    null
  );
  const [secondaryPreviewUrl, setSecondaryPreviewUrl] = useState<string | null>(
    null
  );
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizingPrimary, setIsOptimizingPrimary] = useState(false);
  const [isOptimizingSecondary, setIsOptimizingSecondary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null);

  const handleProgressComplete = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const {
    progress,
    currentStep,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
  });

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (primaryPreviewUrl) URL.revokeObjectURL(primaryPreviewUrl);
      if (secondaryPreviewUrl) URL.revokeObjectURL(secondaryPreviewUrl);
    };
  }, [primaryPreviewUrl, secondaryPreviewUrl]);

  useEffect(() => {
    setDownloadFileName(resultImage ? `hide-nb-edit-${Date.now()}.png` : null);
  }, [resultImage]);

  const selectedPrompt = useMemo(
    () =>
      PROMPT_PRESETS.find((option) => option.id === selectedPromptId)?.prompt ??
      "",
    [selectedPromptId]
  );

  const groupedPrompts = useMemo(() => {
    const groups: Record<string, PromptOption[]> = {};
    PROMPT_PRESETS.forEach((prompt) => {
      if (!groups[prompt.category]) groups[prompt.category] = [];
      groups[prompt.category].push(prompt);
    });
    return groups;
  }, []);

  const requiresDualUpload = selectedPromptId === MARTIAL_ARCADE_PROMPT_ID;

  useEffect(() => {
    if (!requiresDualUpload) {
      setSecondaryFile(null);
      setSecondaryPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setIsOptimizingSecondary(false);
    }
  }, [requiresDualUpload]);

  const isOptimizingAny = isOptimizingPrimary || isOptimizingSecondary;
  const hasRequiredFiles =
    Boolean(primaryFile) && (!requiresDualUpload || Boolean(secondaryFile));

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    slot: "primary" | "secondary"
  ) => {
    const file = event.target.files?.[0];
    const setFile = slot === "primary" ? setPrimaryFile : setSecondaryFile;
    const currentPreview =
      slot === "primary" ? primaryPreviewUrl : secondaryPreviewUrl;
    const setPreview =
      slot === "primary" ? setPrimaryPreviewUrl : setSecondaryPreviewUrl;
    const setOptimizing =
      slot === "primary" ? setIsOptimizingPrimary : setIsOptimizingSecondary;

    if (!file) {
      setFile(null);
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      setPreview(null);
      return;
    }

    if (currentPreview) URL.revokeObjectURL(currentPreview);
    setErrorMessage(null);
    setResultImage(null);
    setOptimizing(true);

    try {
      const optimized = await resizeImage(file);
      setFile(optimized);
      setPreview(URL.createObjectURL(optimized));
    } catch (error) {
      console.error(error);
      setErrorMessage("画像の最適化に失敗しました。");
      setFile(file);
      setPreview(URL.createObjectURL(file));
    } finally {
      setOptimizing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPrompt)
      return setErrorMessage("プロンプトを選択してください。");
    if (!hasRequiredFiles)
      return setErrorMessage("画像をアップロードしてください。");

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append("prompt", selectedPrompt);
      if (primaryFile) formData.append("image", primaryFile);
      if (requiresDualUpload && secondaryFile)
        formData.append("image_secondary", secondaryFile);

      const res = await fetch("/api/edit-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "画像編集に失敗しました。");
      if (!data.imageBase64)
        throw new Error("画像データを取得できませんでした。");

      const mime = data.mimeType || "image/png";
      setResultImage(`data:${mime};base64,${data.imageBase64}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "予期しないエラーが発生しました。"
      );
    } finally {
      completeProgress();
    }
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
            />
          ) : resultImage ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="rounded-xl overflow-hidden border border-white/20 shadow-2xl">
                <Image
                  src={resultImage}
                  alt="Result"
                  width={900}
                  height={600}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
              <Button asChild className="w-full" size="lg">
                <a
                  href={resultImage}
                  download={downloadFileName ?? "image.png"}
                >
                  <Download className="w-4 h-4 mr-2" /> 画像をダウンロード
                </a>
              </Button>
            </div>
          ) : (
            <div className="h-64 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 flex items-center justify-center text-slate-500">
              ここに結果が表示されます
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <Section
          title={
            requiresDualUpload
              ? "1. 2枚の画像をアップロード"
              : "1. 画像をアップロード"
          }
        >
          {requiresDualUpload && (
            <p className="text-sm text-slate-400 mb-4">
              左側（プレイヤー1）と右側（プレイヤー2）の画像をそれぞれ選んでください。
            </p>
          )}
          <div
            className={cn("grid gap-6", requiresDualUpload && "md:grid-cols-2")}
          >
            <FileInput
              subLabel={requiresDualUpload ? "プレイヤー1 (左)" : undefined}
              previewUrl={primaryPreviewUrl}
              isOptimizing={isOptimizingPrimary}
              onChange={(e) => handleFileChange(e, "primary")}
            />
            {requiresDualUpload && (
              <FileInput
                subLabel="プレイヤー2 (右)"
                previewUrl={secondaryPreviewUrl}
                isOptimizing={isOptimizingSecondary}
                onChange={(e) => handleFileChange(e, "secondary")}
              />
            )}
          </div>
        </Section>

        <Section title="2. プロンプトを選ぶ" delay={0.1}>
          <PromptPicker
            groups={groupedPrompts}
            selectedPromptId={selectedPromptId}
            onSelect={setSelectedPromptId}
          />
        </Section>

        <div className="flex flex-col gap-4">
          <Button
            type="submit"
            size="lg"
            className="w-full text-lg h-14 bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 border-0"
            disabled={isSubmitting || !hasRequiredFiles || isOptimizingAny}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gemini が編集中...
              </>
            ) : (
              "Gemini にお任せ"
            )}
          </Button>
          {errorMessage && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center animate-in fade-in">
              {errorMessage}
            </div>
          )}
        </div>
      </form>
    </EditorLayout>
  );
}
