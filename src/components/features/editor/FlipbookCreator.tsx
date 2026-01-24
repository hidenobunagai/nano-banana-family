"use client";

import { EditorLayout } from "@/components/layout/EditorLayout";
import {
  ProgressDisplay,
  type ProgressStep,
} from "@/components/ProgressDisplay";
import { Button, cn } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { Section } from "@/components/ui/Section";
import { useProgressSimulation } from "@/components/useProgressSimulation";
import { resizeImage } from "@/utils/imageOptimization";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

const FLIPBOOK_PROGRESS_STEPS: ProgressStep[] = [
  { id: "plan", label: "ストーリー構成を考え中...", estimatedDuration: 1500 },
  { id: "frame1", label: "フレーム 1/4 を生成中...", estimatedDuration: 3600 },
  { id: "frame2", label: "フレーム 2/4 を生成中...", estimatedDuration: 3200 },
  { id: "frame3", label: "フレーム 3/4 を生成中...", estimatedDuration: 3200 },
  { id: "frame4", label: "フレーム 4/4 を生成中...", estimatedDuration: 3200 },
  { id: "compile", label: "仕上げを整えています...", estimatedDuration: 1200 },
  { id: "complete", label: "完了", estimatedDuration: 400 },
];

const FLIPBOOK_GUIDANCE = [
  "1コマ目: 舞台やキャラクターを紹介し、原画像の雰囲気を大切にします。",
  "2コマ目: キャラクターが動き始める瞬間やきっかけを描写します。",
  "3コマ目: アクションや感情が高まる場面に発展させます。",
  "4コマ目: 物語の余韻が感じられるエンディングを描きます。",
];

export function FlipbookCreator() {
  const [storyIdea, setStoryIdea] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackDelay, setPlaybackDelay] = useState(420);

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), []);
  const {
    progress,
    currentStep,
    complete: completeProgress,
  } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
    steps: FLIPBOOK_PROGRESS_STEPS,
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (frames.length === 0) {
      setIsPlaying(false);
      setCurrentFrame(0);
      return;
    }
    setIsPlaying(true);
  }, [frames]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, Math.max(120, playbackDelay));
    return () => clearInterval(interval);
  }, [isPlaying, frames, playbackDelay]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFrames([]);
      setIsOptimizing(true);
      try {
        const optimized = await resizeImage(file);
        setSelectedFile(optimized);
        setPreviewUrl(URL.createObjectURL(optimized));
      } catch (err) {
        setErrorMessage("画像の最適化に失敗しました。");
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!storyIdea.trim() || !selectedFile) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setFrames([]);
    setIsPlaying(false);

    try {
      const formData = new FormData();
      formData.append("story", storyIdea);
      formData.append("image", selectedFile);
      const res = await fetch("/api/create-flipbook", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "作成に失敗しました");

      const newFrames = (data.frames as any[]).map(
        (f) => `data:${f.mimeType || "image/png"};base64,${f.imageBase64}`
      );
      setFrames(newFrames);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "エラーが発生しました"
      );
    } finally {
      completeProgress();
    }
  };

  return (
    <EditorLayout
      resultPane={
        <Section title="パラパラ漫画プレビュー" className="h-full">
          {frames.length > 0 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center text-sm text-slate-400">
                <span>Frame {currentFrame + 1} / 4</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Speed</span>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    value={playbackDelay}
                    onChange={(e) => setPlaybackDelay(Number(e.target.value))}
                    className="accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none w-20 cursor-pointer"
                  />
                </div>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/20 shadow-xl bg-slate-950">
                <Image
                  src={frames[currentFrame]}
                  alt="Frame"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="glass-button"
                  onClick={() => setCurrentFrame((p) => (p - 1 + 4) % 4)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-32 bg-emerald-500 hover:bg-emerald-400 text-white border-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="glass-button"
                  onClick={() => setCurrentFrame((p) => (p + 1) % 4)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4">
                {frames.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentFrame(i);
                    }}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                      currentFrame === i
                        ? "border-emerald-500 scale-105 shadow-lg shadow-emerald-500/20"
                        : "border-transparent opacity-60 hover:opacity-100 hover:border-white/20"
                    )}
                  >
                    <Image
                      src={f}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : isSubmitting ? (
            <ProgressDisplay
              isVisible={true}
              currentStep={currentStep}
              progress={progress}
              steps={FLIPBOOK_PROGRESS_STEPS}
            />
          ) : (
            <div className="h-64 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 flex items-center justify-center text-slate-500">
              プレビュー待ち
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <Section title="1. 主役の画像をアップロード">
          <FileInput
            previewUrl={previewUrl}
            isOptimizing={isOptimizing}
            onChange={handleFileChange}
          />
        </Section>
        <Section title="2. ストーリーのアイデア">
          <textarea
            className="w-full h-24 rounded-xl bg-slate-900/50 border border-white/10 p-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow"
            placeholder="例: 夕暮れの公園で遊ぶ子供が、ふと空を見上げて流れ星を見つける物語"
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
          />
          <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-2">
            <p className="text-xs font-semibold text-slate-400">
              構成プロセス:
            </p>
            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
              {FLIPBOOK_GUIDANCE.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        </Section>
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 border-0 shadow-lg shadow-emerald-500/20"
          disabled={isSubmitting || !selectedFile || !storyIdea.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 作成中...
            </>
          ) : (
            "Gemini にお任せ"
          )}
        </Button>
        {errorMessage && (
          <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">
            {errorMessage}
          </div>
        )}
      </form>
    </EditorLayout>
  );
}
