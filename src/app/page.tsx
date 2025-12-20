"use client";

import { Shell } from "@/components/layout/Shell";
import { Mode } from "@/components/layout/Sidebar";
import {
  ProgressDisplay,
  type ProgressStep,
} from "@/components/ProgressDisplay";
import { PromptPicker } from "@/components/PromptPicker";
import { Button, cn } from "@/components/ui/Button";
import {
  PROGRESS_STEPS,
  useProgressSimulation,
} from "@/components/useProgressSimulation";
import { PROMPT_PRESETS, type PromptOption } from "@/promptPresets";
import { resizeImage } from "@/utils/imageOptimization";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pause,
  Play,
  Upload,
  X,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// -- API Types (Unchanged) --
type ApiSuccessResponse = {
  imageBase64: string;
  mimeType?: string;
};

type ApiErrorResponse = {
  error?: string;
};

type FlipbookFrameResponse = {
  imageBase64: string;
  mimeType?: string;
};

type FlipbookApiSuccessResponse = {
  frames: FlipbookFrameResponse[];
};

const isApiSuccessResponse = (value: unknown): value is ApiSuccessResponse => {
  return (
    typeof value === "object" &&
    value !== null &&
    "imageBase64" in value &&
    typeof (value as { imageBase64?: unknown }).imageBase64 === "string"
  );
};

const isFlipbookResponse = (
  value: unknown
): value is FlipbookApiSuccessResponse => {
  if (typeof value !== "object" || value === null || !("frames" in value)) {
    return false;
  }
  const { frames } = value as { frames?: unknown };
  if (!Array.isArray(frames)) {
    return false;
  }
  return frames.every(
    (frame) =>
      typeof frame === "object" &&
      frame !== null &&
      "imageBase64" in frame &&
      typeof (frame as { imageBase64?: unknown }).imageBase64 === "string"
  );
};

const extractErrorMessage = (
  value: unknown,
  fallbackMessage: string
): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  if (typeof value === "object" && value !== null && "error" in value) {
    const message = (value as ApiErrorResponse).error;
    if (typeof message === "string" && message.trim().length > 0)
      return message;
  }
  return fallbackMessage;
};

// -- Constants --
const MARTIAL_ARCADE_PROMPT_ID = "martial-arcade";

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

// -- Main Component --
export default function Home() {
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>("simple");

  const handleSignOut = () => void signOut();

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          <p className="text-slate-400 font-medium">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-br from-amber-200 to-orange-500 bg-clip-text text-transparent">
              Hide NB Studio
            </h1>
            <p className="text-slate-400 leading-relaxed">
              家族限定のクリエイティブスタジオです。
              <br />
              Googleアカウントでサインインして始めましょう。
            </p>
          </div>
          <Button onClick={() => signIn("google")} size="lg" className="w-full">
            Let's Start
          </Button>
        </div>
      </main>
    );
  }

  return (
    <Shell currentMode={mode} onModeChange={setMode} onSignOut={handleSignOut}>
      {mode === "simple" ? (
        <SimpleEditor />
      ) : mode === "flipbook" ? (
        <FlipbookCreator />
      ) : mode === "freestyle" ? (
        <FreestyleEditor />
      ) : (
        <PromptOnlyCreator />
      )}
    </Shell>
  );
}

// -- Shared Editor Components --

function EditorLayout({
  children,
  resultPane,
}: {
  children: React.ReactNode;
  resultPane: React.ReactNode;
}) {
  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
      <div className="w-full xl:flex-1 min-w-0 space-y-8">{children}</div>
      <div className="w-full xl:w-[480px] shrink-0 sticky top-8">
        {resultPane}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FileInput({
  label,
  subLabel,
  previewUrl,
  isOptimizing,
  onChange,
  accept = "image/*",
}: {
  label?: string;
  subLabel?: string;
  previewUrl: string | null;
  isOptimizing: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
}) {
  return (
    <div className="space-y-3">
      {(label || subLabel) && (
        <div className="flex flex-col">
          {label && (
            <span className="font-semibold text-slate-200">{label}</span>
          )}
          {subLabel && (
            <span className="text-sm text-slate-400">{subLabel}</span>
          )}
        </div>
      )}

      {!previewUrl ? (
        <label
          className={cn(
            "flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed transition-all cursor-pointer group",
            "border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 hover:border-amber-500/50"
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400 group-hover:text-amber-500 transition-colors">
            {isOptimizing ? (
              <Loader2 className="w-8 h-8 mb-3 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 mb-3" />
            )}
            <p className="text-sm font-medium">Click to upload image</p>
            <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={onChange}
            disabled={isOptimizing}
          />
        </label>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-white/20 group">
          <Image
            src={previewUrl}
            alt="Preview"
            width={800}
            height={600}
            className="w-full h-auto object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <label className="cursor-pointer px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-white/20 transition-colors font-medium text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Change Image
              <input
                type="file"
                className="hidden"
                accept={accept}
                onChange={onChange}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Sub Components --

function SimpleEditor() {
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
        <Section title="仕上がり">
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
            <div className="h-64 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/30 flex items-center justify-center text-slate-500">
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

        <Section title="2. プロンプトを選ぶ">
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
            className="w-full text-lg h-14"
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

function PromptOnlyCreator() {
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
        <Section title="仕上がり">
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
            <div className="h-64 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/30 flex items-center justify-center text-slate-500">
              ここに結果が表示されます
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <Section title="1. 作りたいイメージを文章で伝える">
          <textarea
            className="w-full h-32 rounded-xl bg-slate-900/50 border border-white/10 p-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
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
          className="w-full h-14 text-lg"
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

function FlipbookCreator() {
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
        <Section title="パラパラ漫画プレビュー">
          {frames.length > 0 ? (
            <div className="space-y-4">
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
                    className="accent-amber-500 h-1 bg-slate-700 rounded-lg appearance-none w-20"
                  />
                </div>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/20 shadow-xl bg-black">
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
                  onClick={() => setCurrentFrame((p) => (p - 1 + 4) % 4)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-32"
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
                      "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      currentFrame === i
                        ? "border-amber-500 scale-105"
                        : "border-transparent opacity-60 hover:opacity-100"
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
            <div className="h-64 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/30 flex items-center justify-center text-slate-500">
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
            className="w-full h-24 rounded-xl bg-slate-900/50 border border-white/10 p-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
          className="w-full h-14"
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
          <div className="text-red-400 text-sm text-center">{errorMessage}</div>
        )}
      </form>
    </EditorLayout>
  );
}

function FreestyleEditor() {
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
        <Section title="仕上がり">
          {isSubmitting ? (
            <ProgressDisplay
              isVisible={true}
              currentStep={currentStep}
              progress={progress}
              steps={FREESTYLE_PROGRESS_STEPS}
            />
          ) : resultImage ? (
            <div className="space-y-4">
              <Image
                src={resultImage}
                alt=""
                width={900}
                height={600}
                className="rounded-xl w-full"
                unoptimized
              />
              <Button asChild className="w-full">
                <a href={resultImage} download={`fs-${Date.now()}.png`}>
                  ダウンロート
                </a>
              </Button>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
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
                    className="absolute top-8 right-2 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="h-48 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-slate-900/50 transition-colors flex flex-col items-center justify-center text-slate-500 hover:text-amber-500"
              >
                <span className="text-2xl">+</span>
                <span className="text-sm">画像を追加</span>
              </button>
            )}
          </div>
        </Section>
        <Section title="2. どんな仕上がりにしたいか自由に記入">
          <textarea
            className="w-full h-24 rounded-xl bg-slate-900/50 border border-white/10 p-4 text-slate-100 focus:ring-2 focus:ring-amber-500/50"
            placeholder="例: 子どもたちが描いたドラゴンのスケッチをもとに..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </Section>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "生成中..." : "Gemini に生成を依頼"}
        </Button>
        {errorMessage && (
          <div className="text-red-400 text-center">{errorMessage}</div>
        )}
      </form>
    </EditorLayout>
  );
}
