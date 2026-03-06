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
import { getRequestErrorMessage } from "@/utils/requestErrorMessage";
import { Download, Loader2, RefreshCw, RotateCcw, X } from "lucide-react";
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

interface UploadSlot {
  id: string;
  file: File | null;
  previewUrl: string | null;
}

function createUploadSlot(): UploadSlot {
  return { id: crypto.randomUUID(), file: null, previewUrl: null };
}

export function FreestyleEditor() {
  const [prompt, setPrompt] = useState("");
  const [uploads, setUploads] = useState<UploadSlot[]>(() => [createUploadSlot()]);
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
      steps: FREESTYLE_PROGRESS_STEPS,
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
  const hasActiveFiles = activeUploads.length > 0;
  const isOptimizingAny = optimizingUploadIds.length > 0;
  const canSubmit =
    prompt.trim().length > 0 && hasActiveFiles && !isSubmitting && !isOptimizingAny;

  const resetEditor = useCallback(() => {
    uploads.forEach((upload) => {
      if (upload.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl);
      }
    });
    setUploads([createUploadSlot()]);
    setPrompt("");
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
    if (uploads.length < MAX_FREESTYLE_UPLOADS) {
      setUploads((prev) => [...prev, createUploadSlot()]);
    }
  };

  const removeUploadSlot = (id: string) => {
    if (uploads.length <= 1) {
      return;
    }

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
                className="rounded-xl w-full border border-stone-200 shadow-xl"
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
                  variant="outline"
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
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-stone-400 border-2 border-dashed border-stone-200 bg-stone-50 rounded-xl px-6 text-center">
              <p className="font-medium text-stone-500">結果エリア</p>
              <p className="text-sm">
                参考画像と仕上がりイメージを入力すると、ここに生成結果が表示されます。
              </p>
            </div>
          )}
        </Section>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <Section title="1. 参考にしたい画像をアップロード">
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">最大 {MAX_FREESTYLE_UPLOADS} 枚まで追加できます</p>
            <p className="mt-1 text-amber-700/90">
              複数の参考画像を入れるほど雰囲気を合わせやすくなります。選んだ画像は送信前に自動で最適化されます。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uploads.map((slot, index) => (
              <div key={slot.id} className="relative">
                <FileInput
                  subLabel={`参考画像 ${index + 1}`}
                  previewUrl={slot.previewUrl}
                  isOptimizing={optimizingUploadIds.includes(slot.id)}
                  onChange={(event) => handleFileChange(event, slot.id)}
                />
                {uploads.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUploadSlot(slot.id)}
                    aria-label={`参考画像 ${index + 1} を削除`}
                    className="absolute top-8 right-2 rounded-full bg-red-500/90 p-1.5 text-white shadow-md transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
                className="h-48 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 text-stone-500 transition-colors hover:border-amber-500/50 hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span className="block text-3xl">+</span>
                <span className="mt-2 block text-sm font-medium">
                  参考画像を追加（あと {MAX_FREESTYLE_UPLOADS - uploads.length} 枚）
                </span>
              </button>
            )}
          </div>
        </Section>
        <Section title="2. どんな仕上がりにしたいか自由に記入">
          <div className="mb-4 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-500">
            例: 「やわらかい水彩風にしたい」「兄弟が冒険している映画ポスターのように」など、雰囲気・色・構図を書くと結果が安定します。
          </div>
          <textarea
            name="freestylePrompt"
            autoComplete="off"
            spellCheck={false}
            className="w-full h-28 rounded-xl bg-white border border-stone-200 p-4 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow"
            placeholder="例: 子どもたちが描いたドラゴンのスケッチをもとに、水彩画のようなやさしい雰囲気で仕上げたい…"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
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
              "Gemini に生成を依頼"
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
              指示文を短くしたり、参考画像を減らしたりすると安定することがあります。
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Button type="button" size="sm" onClick={() => void submitEdit()} disabled={!canSubmit}>
                同じ内容で再試行
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
