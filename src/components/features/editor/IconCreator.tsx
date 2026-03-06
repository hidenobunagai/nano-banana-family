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
import { getRequestErrorMessage } from "@/utils/requestErrorMessage";
import {
  Download,
  Globe,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  User,
  X,
} from "lucide-react";
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

interface UploadSlot {
  id: string;
  file: File | null;
  previewUrl: string | null;
}

interface IconStyleOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
  gradient: string;
  preview: string;
}

const ICON_STYLE_OPTIONS: IconStyleOption[] = [
  {
    id: "auto",
    label: "おまかせ",
    description: "情報から最適スタイルを自動選択",
    emoji: "✨",
    gradient: "from-violet-500 to-fuchsia-500",
    preview: "学校・教室・家族連絡先におすすめ",
  },
  {
    id: "flat-minimal",
    label: "フラット・ミニマル",
    description: "シンプルな色面とシンボル",
    emoji: "◻️",
    gradient: "from-cyan-500 to-blue-500",
    preview: "見やすさ重視・通知アイコン向け",
  },
  {
    id: "gradient-modern",
    label: "グラデーション",
    description: "鮮やかなグラデーション",
    emoji: "🌈",
    gradient: "from-orange-500 to-pink-500",
    preview: "明るく親しみやすい雰囲気",
  },
  {
    id: "illustrated",
    label: "イラスト風",
    description: "手描き感のある温かいスタイル",
    emoji: "🎨",
    gradient: "from-emerald-500 to-teal-500",
    preview: "子ども向け・やわらかい印象に最適",
  },
  {
    id: "photo-circle",
    label: "写真加工",
    description: "写真ベースの丸型アイコン",
    emoji: "📷",
    gradient: "from-amber-500 to-yellow-500",
    preview: "人物やロゴを活かしたいときに便利",
  },
];

function createUploadSlot(): UploadSlot {
  return { id: crypto.randomUUID(), file: null, previewUrl: null };
}

export function IconCreator() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("auto");
  const [customPrompt, setCustomPrompt] = useState("");
  const [uploads, setUploads] = useState<UploadSlot[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimizingUploadIds, setOptimizingUploadIds] = useState<string[]>([]);
  const previewUrlsRef = useRef<string[]>([]);

  const handleProgressComplete = useCallback(() => setIsSubmitting(false), []);
  const { progress, currentStep, timeRemaining, complete: completeProgress } =
    useProgressSimulation({
      isActive: isSubmitting,
      onComplete: handleProgressComplete,
      steps: ICON_PROGRESS_STEPS,
    });

  useEffect(() => {
    previewUrlsRef.current = uploads
      .map((upload) => upload.previewUrl)
      .filter((value): value is string => Boolean(value));
  }, [uploads]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, []);

  const setUploadOptimizing = useCallback((id: string, isOptimizing: boolean) => {
    setOptimizingUploadIds((prev) => {
      if (isOptimizing) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  }, []);

  const activeUploads = useMemo(
    () => uploads.filter((upload) => upload.file),
    [uploads],
  );
  const isOptimizingAny = optimizingUploadIds.length > 0;
  const canSubmit = name.trim().length > 0 && !isSubmitting && !isOptimizingAny;
  const selectedStyleOption = useMemo(
    () =>
      ICON_STYLE_OPTIONS.find((styleOption) => styleOption.id === selectedStyle) ??
      ICON_STYLE_OPTIONS[0],
    [selectedStyle],
  );

  const resetEditor = useCallback(() => {
    uploads.forEach((upload) => {
      if (upload.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl);
      }
    });
    setName("");
    setUrl("");
    setSelectedStyle("auto");
    setCustomPrompt("");
    setUploads([]);
    setResultImage(null);
    setErrorMessage(null);
    setOptimizingUploadIds([]);
  }, [uploads]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, id: string) => {
    const file = event.target.files?.[0];
    const currentSlot = uploads.find((upload) => upload.id === id);

    if (!currentSlot) {
      return;
    }

    if (!file) {
      if (currentSlot.previewUrl) {
        URL.revokeObjectURL(currentSlot.previewUrl);
      }
      setUploads((prev) =>
        prev.map((upload) =>
          upload.id === id ? { ...upload, file: null, previewUrl: null } : upload,
        ),
      );
      return;
    }

    setErrorMessage(null);
    setResultImage(null);
    setUploadOptimizing(id, true);

    try {
      const optimized = await resizeImage(file);
      if (currentSlot.previewUrl) {
        URL.revokeObjectURL(currentSlot.previewUrl);
      }
      setUploads((prev) =>
        prev.map((upload) =>
          upload.id === id
            ? {
                ...upload,
                file: optimized,
                previewUrl: URL.createObjectURL(optimized),
              }
            : upload,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "画像の準備に失敗しました。別の画像でもう一度お試しください。",
      );
    } finally {
      setUploadOptimizing(id, false);
    }
  };

  const addUploadSlot = () => {
    if (uploads.length < MAX_ICON_UPLOADS) {
      setUploads((prev) => [...prev, createUploadSlot()]);
    }
  };

  const removeUploadSlot = (id: string) => {
    const slotToRemove = uploads.find((upload) => upload.id === id);
    if (slotToRemove?.previewUrl) {
      URL.revokeObjectURL(slotToRemove.previewUrl);
    }

    setUploads((prev) => prev.filter((upload) => upload.id !== id));
    setOptimizingUploadIds((prev) => prev.filter((item) => item !== id));
    setResultImage(null);
    setErrorMessage(null);
  };

  const submitEdit = useCallback(async () => {
    if (!name.trim()) {
      setErrorMessage("連絡先名を入力してください。");
      return;
    }

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

      activeUploads.forEach((upload) => {
        if (upload.file) {
          formData.append("images", upload.file);
        }
      });

      const res = await fetch("/api/icon-generate", {
        method: "POST",
        body: formData,
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
        "mimeType" in data && typeof data.mimeType === "string"
          ? data.mimeType
          : "image/png";

      setResultImage(`data:${mimeType};base64,${data.imageBase64}`);
    } catch (error) {
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
                  <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-stone-200 shadow-2xl shadow-amber-500/10">
                    <Image
                      src={resultImage}
                      alt={`${name} の生成アイコン`}
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
                <div className="text-center">
                  <p className="text-stone-700 text-sm font-medium">{name}</p>
                  <p className="text-xs text-stone-400 mt-1">{selectedStyleOption.preview}</p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-stone-200 shadow-xl">
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
                  variant="outline"
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
            <div className="h-64 flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-200 bg-stone-50 rounded-xl gap-3 px-6 text-center">
              <User className="w-12 h-12 text-stone-300" />
              <p className="text-sm">生成されたアイコンがここに表示されます</p>
              <p className="text-xs text-stone-400">
                名前とスタイルを選び、必要ならURLや参考画像も追加してください。
              </p>
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="1. 連絡先名" delay={0}>
          <input
            name="contactName"
            autoComplete="off"
            type="text"
            className="w-full rounded-xl bg-white border border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow text-lg"
            placeholder="例: 桜小学校児童クラブ"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <p className="mt-2 text-xs text-stone-400">
            連絡先の用途や雰囲気が伝わる名前にすると、モチーフを決めやすくなります。
          </p>
        </Section>

        <Section title="2. 参考URL（任意）" delay={0.05}>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              name="referenceUrl"
              autoComplete="off"
              spellCheck={false}
              type="url"
              className="w-full rounded-xl bg-white border border-stone-200 pl-12 pr-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="mt-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-xs text-stone-500" aria-live="polite">
            {url.trim()
              ? "生成時にタイトル・説明・OGP画像の取得を試み、アイコンの方向性に反映します。"
              : "Webサイトの雰囲気も反映したいときだけ入力してください。URLなしでも生成できます。"}
          </div>
        </Section>

        <Section title="3. 参考画像（任意）" delay={0.1}>
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">最大 {MAX_ICON_UPLOADS} 枚まで追加できます</p>
            <p className="mt-1 text-amber-700/90">
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
                    isOptimizing={optimizingUploadIds.includes(slot.id)}
                    onChange={(event) => handleFileChange(event, slot.id)}
                  />
                  <button
                    type="button"
                    onClick={() => removeUploadSlot(slot.id)}
                    aria-label={`参考画像 ${index + 1} を削除`}
                    className="absolute top-8 right-2 rounded-full bg-red-500/90 p-1.5 text-white shadow-md transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
              className="w-full h-20 rounded-xl border-2 border-dashed border-stone-200 hover:border-amber-500/50 hover:bg-amber-50 transition-colors flex items-center justify-center text-stone-500 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span className="text-2xl mr-2">+</span>
              <span className="text-sm font-medium">
                ロゴや写真を追加（あと {MAX_ICON_UPLOADS - uploads.length} 枚）
              </span>
            </button>
          )}
        </Section>

        <Section title="4. スタイル" delay={0.15}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ICON_STYLE_OPTIONS.map((styleOption) => (
              <button
                key={styleOption.id}
                type="button"
                onClick={() => setSelectedStyle(styleOption.id)}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
                  selectedStyle === styleOption.id
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                    : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100",
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-sm shadow-md",
                      styleOption.gradient,
                    )}
                  >
                    {styleOption.emoji}
                  </div>
                  <div className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-semibold",
                        selectedStyle === styleOption.id ? "text-amber-700" : "text-stone-700",
                      )}
                    >
                      {styleOption.label}
                    </span>
                    <span className="block text-xs text-stone-400">{styleOption.preview}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-stone-500">{styleOption.description}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-500">
            <span className="font-medium text-stone-700">選択中のスタイル: {selectedStyleOption.label}</span>
            <p className="mt-1">{selectedStyleOption.preview}</p>
          </div>
        </Section>

        <Section title="5. 追加の指示（任意）" delay={0.2}>
          <textarea
            name="customPrompt"
            autoComplete="off"
            spellCheck={false}
            className="w-full h-24 rounded-xl bg-white border border-stone-200 p-4 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow resize-none"
            placeholder="例: 桜の花びらをモチーフにして、ピンク系の暖かい色合いでやさしくまとめたい…"
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
          />
        </Section>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 bg-amber-500 hover:bg-amber-400 border-0 shadow-lg shadow-amber-500/20"
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
          <Button type="button" size="lg" variant="outline" onClick={resetEditor}>
            入力をクリア
          </Button>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm" aria-live="polite">
            <p className="font-medium text-red-500">{errorMessage}</p>
            <p className="mt-1 text-red-500/80">
              URLや追加指示を短くすると改善することがあります。必要な情報だけ残して再試行してください。
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Button type="button" size="sm" onClick={() => void submitEdit()} disabled={!canSubmit}>
                同じ条件で再試行
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={resetEditor}>
                最初からやり直す
              </Button>
            </div>
          </div>
        )}
      </form>
    </EditorLayout>
  );
}
