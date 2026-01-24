"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import {
  ProgressDisplay,
  type ProgressStep,
} from "@/components/ProgressDisplay";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { useProgressSimulation } from "@/components/useProgressSimulation";
import { Download, Loader2 } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useState } from "react";

const PROMPT_ONLY_PROGRESS_STEPS: ProgressStep[] = [
  { id: "plan", label: "イメージを構想中...", estimatedDuration: 1400 },
  { id: "prompt", label: "指示内容を読み取り中...", estimatedDuration: 1600 },
  {
    id: "generate",
    label: "Gemini で画像を生成中...",
    estimatedDuration: 6400,
  },
  { id: "refine", label: "仕上がりを整えています...", estimatedDuration: 1200 },
  { id: "complete", label: "完了", estimatedDuration: 400 },
];

const PROMPT_ONLY_SUGGESTIONS = [
  "黄昏の砂浜で家族が手をつないで散歩しているシネマティックな写真",
  "80年代SFアニメ風の未来都市を飛ぶジェットボードに乗った少年のイラスト",
  "木漏れ日の森で紅葉した葉が舞う中、静かに読書する女性を描いた油彩画",
];

export function PromptOnlyCreator() {
  const [prompt, setPrompt] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null);

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), []);
  const {
    progress,
    currentStep,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
    steps: PROMPT_ONLY_PROGRESS_STEPS,
  });

  useEffect(() => {
    setDownloadFileName(
      resultImage ? `hide-nb-prompt-${Date.now()}.png` : null
    );
  }, [resultImage]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim())
      return setErrorMessage("プロンプトを入力してください。");

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);

    try {
      const res = await fetch("/api/prompt-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "画像生成に失敗しました。");
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
        <Section title="仕上がり" className="h-full">
          {isSubmitting ? (
            <ProgressDisplay
              isVisible={true}
              currentStep={currentStep}
              progress={progress}
              steps={PROMPT_ONLY_PROGRESS_STEPS}
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
        <Section title="1. 作りたいイメージを文章で伝える">
          <textarea
            className="w-full h-32 rounded-xl bg-slate-900/50 border border-white/10 p-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y transition-shadow"
            placeholder="例: 星空の下でランタンを掲げる少年の幻想的なイラスト"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 mt-4">
            {PROMPT_ONLY_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-white/10"
                onClick={() => setPrompt(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </Section>

        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 border-0"
          disabled={isSubmitting || !prompt.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 生成中...
            </>
          ) : (
            "Gemini にお任せ"
          )}
        </Button>
        {errorMessage && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm center">
            {errorMessage}
          </div>
        )}
      </form>
    </EditorLayout>
  );
}
