"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import {
  ProgressDisplay,
  type ProgressStep,
} from "@/components/ProgressDisplay";
import { Button } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { Section } from "@/components/ui/Section";
import { useProgressSimulation } from "@/components/useProgressSimulation";
import { resizeImage } from "@/utils/imageOptimization";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, type FormEvent, useCallback, useState } from "react";

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
  const [uploads, setUploads] = useState<
    { id: string; file: File | null; previewUrl: string | null }[]
  >([{ id: "1", file: null, previewUrl: null }]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), []);
  const {
    progress,
    currentStep,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
    steps: FREESTYLE_PROGRESS_STEPS,
  });

  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
    id: string
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimized = await resizeImage(file);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  file: optimized,
                  previewUrl: URL.createObjectURL(optimized),
                }
              : u
          )
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const addUploadSlot = () => {
    if (uploads.length < MAX_FREESTYLE_UPLOADS) {
      setUploads((prev) => [
        ...prev,
        { id: Math.random().toString(), file: null, previewUrl: null },
      ]);
    }
  };

  const removeUploadSlot = (id: string) => {
    if (uploads.length > 1) {
      setUploads((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const activeFiles = uploads
      .filter((u) => u.file)
      .map((u) => u.file as File);
    if (!prompt.trim() || activeFiles.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      activeFiles.forEach((f) => formData.append("images", f));
      const res = await fetch("/api/freestyle-edit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失敗");
      const mime = data.mimeType || "image/png";
      setResultImage(`data:${mime};base64,${data.imageBase64}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error");
    } finally {
      completeProgress();
    }
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
            />
          ) : resultImage ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Image
                src={resultImage}
                alt=""
                width={900}
                height={600}
                className="rounded-xl w-full border border-white/20 shadow-xl"
                unoptimized
              />
              <Button asChild className="w-full" size="lg">
                <a href={resultImage} download={`fs-${Date.now()}.png`}>
                  ダウンロート
                </a>
              </Button>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 bg-slate-900/30 rounded-xl">
              結果エリア
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <Section title="1. 参考にしたい画像をアップロード">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uploads.map((slot, idx) => (
              <div key={slot.id} className="relative group">
                <FileInput
                  subLabel={`参考画像 ${idx + 1}`}
                  previewUrl={slot.previewUrl}
                  isOptimizing={false}
                  onChange={(e) => handleFileChange(e, slot.id)}
                />
                {uploads.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUploadSlot(slot.id)}
                    className="absolute top-8 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="h-48 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-slate-900/50 transition-all flex flex-col items-center justify-center text-slate-500 hover:text-amber-500 group"
              >
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  +
                </span>
                <span className="text-sm font-medium">画像を追加</span>
              </button>
            )}
          </div>
        </Section>
        <Section title="2. どんな仕上がりにしたいか自由に記入">
          <textarea
            className="w-full h-24 rounded-xl bg-slate-900/50 border border-white/10 p-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow"
            placeholder="例: 子どもたちが描いたドラゴンのスケッチをもとに..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </Section>
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-0 shadow-lg shadow-amber-500/20"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 生成中...
            </>
          ) : (
            "Gemini に生成を依頼"
          )}
        </Button>
        {errorMessage && (
          <div className="text-red-400 text-center text-sm bg-red-500/10 p-2 rounded-lg border border-red-500/20">
            {errorMessage}
          </div>
        )}
      </form>
    </EditorLayout>
  );
}
