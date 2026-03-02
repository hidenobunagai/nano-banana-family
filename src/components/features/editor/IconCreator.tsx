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
import {
  Download,
  Globe,
  Loader2,
  Sparkles,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useState,
} from "react";

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
  emoji: string;
  gradient: string;
}

const ICON_STYLE_OPTIONS: IconStyleOption[] = [
  {
    id: "auto",
    label: "おまかせ",
    description: "情報から最適スタイルを自動選択",
    emoji: "✨",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "flat-minimal",
    label: "フラット・ミニマル",
    description: "シンプルな色面とシンボル",
    emoji: "◻️",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    id: "gradient-modern",
    label: "グラデーション",
    description: "鮮やかなグラデーション",
    emoji: "🌈",
    gradient: "from-orange-500 to-pink-500",
  },
  {
    id: "illustrated",
    label: "イラスト風",
    description: "手描き感のある温かいスタイル",
    emoji: "🎨",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: "photo-circle",
    label: "写真加工",
    description: "写真ベースの丸型アイコン",
    emoji: "📷",
    gradient: "from-amber-500 to-yellow-500",
  },
];

export function IconCreator() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("auto");
  const [customPrompt, setCustomPrompt] = useState("");
  const [uploads, setUploads] = useState<
    { id: string; file: File | null; previewUrl: string | null }[]
  >([]);
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
    steps: ICON_PROGRESS_STEPS,
  });

  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
    id: string,
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
              : u,
          ),
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const addUploadSlot = () => {
    if (uploads.length < MAX_ICON_UPLOADS) {
      setUploads((prev) => [
        ...prev,
        { id: Math.random().toString(), file: null, previewUrl: null },
      ]);
    }
  };

  const removeUploadSlot = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);

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

      const activeFiles = uploads
        .filter((u) => u.file)
        .map((u) => u.file as File);
      activeFiles.forEach((f) => formData.append("images", f));

      const res = await fetch("/api/icon-generate", {
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

  const canSubmit = name.trim().length > 0 && !isSubmitting;

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
            />
          ) : resultImage ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              {/* Circular preview */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-stone-200 shadow-2xl shadow-amber-500/10">
                    <Image
                      src={resultImage}
                      alt="Generated icon"
                      width={512}
                      height={512}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-stone-600 text-sm font-medium">
                  {name}
                </p>
              </div>

              {/* Square preview */}
              <div className="rounded-xl overflow-hidden border border-stone-200 shadow-xl">
                <Image
                  src={resultImage}
                  alt="Generated icon (square)"
                  width={512}
                  height={512}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>

              <Button asChild className="w-full" size="lg">
                <a href={resultImage} download={`icon-${Date.now()}.png`}>
                  <Download className="w-5 h-5 mr-2" />
                  ダウンロード
                </a>
              </Button>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-200 bg-stone-50 rounded-xl gap-3">
              <User className="w-12 h-12 text-stone-300" />
              <p className="text-sm">生成されたアイコンがここに表示されます</p>
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Contact Name */}
        <Section title="1. 連絡先名" delay={0}>
          <input
            type="text"
            className="w-full rounded-xl bg-white border border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow text-lg"
            placeholder="例: 桜小学校児童クラブ"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Section>

        {/* 2. Reference URL */}
        <Section title="2. 参考URL（任意）" delay={0.05}>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="url"
              className="w-full rounded-xl bg-white border border-stone-200 pl-12 pr-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <p className="text-xs text-stone-400 mt-2">
            URLのタイトル・説明・OGP画像を自動取得してアイコンに反映します
          </p>
        </Section>

        {/* 3. Reference Images */}
        <Section title="3. 参考画像（任意）" delay={0.1}>
          {uploads.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {uploads.map((slot, idx) => (
                <div key={slot.id} className="relative group">
                  <FileInput
                    subLabel={`参考画像 ${idx + 1}`}
                    previewUrl={slot.previewUrl}
                    isOptimizing={false}
                    onChange={(e) => handleFileChange(e, slot.id)}
                  />
                  <button
                    type="button"
                    onClick={() => removeUploadSlot(slot.id)}
                    className="absolute top-8 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="w-full h-20 rounded-xl border-2 border-dashed border-stone-200 hover:border-amber-500/50 hover:bg-amber-50 transition-all flex items-center justify-center text-stone-400 hover:text-amber-600 group cursor-pointer"
            >
              <span className="text-2xl mr-2 group-hover:scale-110 transition-transform">
                +
              </span>
              <span className="text-sm font-medium">
                ロゴや写真を追加
              </span>
            </button>
          )}
        </Section>

        {/* 4. Style Selection */}
        <Section title="4. スタイル" delay={0.15}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ICON_STYLE_OPTIONS.map((styleOpt) => (
              <button
                key={styleOpt.id}
                type="button"
                onClick={() => setSelectedStyle(styleOpt.id)}
                className={cn(
                  "relative flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left cursor-pointer group",
                  selectedStyle === styleOpt.id
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                    : "border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100",
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-sm shadow-md",
                      styleOpt.gradient,
                    )}
                  >
                    {styleOpt.emoji}
                  </div>
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      selectedStyle === styleOpt.id
                        ? "text-amber-600"
                        : "text-slate-200",
                    )}
                  >
                    {styleOpt.label}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  {styleOpt.description}
                </p>

                {selectedStyle === styleOpt.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* 5. Custom Prompt */}
        <Section title="5. 追加の指示（任意）" delay={0.2}>
          <textarea
            className="w-full h-20 rounded-xl bg-white border border-stone-200 p-4 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow resize-none"
            placeholder="例: 桜の花びらをモチーフにして、ピンク系の暖かい色合いで..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </Section>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 bg-amber-500 hover:bg-amber-400 border-0 shadow-lg shadow-amber-500/20"
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              アイコンを生成
            </>
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
