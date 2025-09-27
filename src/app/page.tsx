"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import { PromptPicker } from "@/components/PromptPicker";
import { ProgressDisplay, type ProgressStep } from "@/components/ProgressDisplay";
import { PROGRESS_STEPS, useProgressSimulation } from "@/components/useProgressSimulation";
import { PROMPT_PRESETS, type PromptOption } from "@/promptPresets";

import { resizeImage } from "@/utils/imageOptimization";

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

const isFlipbookResponse = (value: unknown): value is FlipbookApiSuccessResponse => {
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
      typeof (frame as { imageBase64?: unknown }).imageBase64 === "string",
  );
};

const extractErrorMessage = (value: unknown, fallbackMessage: string): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (typeof value === "object" && value !== null && "error" in value) {
    const message = (value as ApiErrorResponse).error;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallbackMessage;
};

type Mode = "simple" | "flipbook";

const MODE_LABELS: Record<Mode, string> = {
  simple: "画像編集モード",
  flipbook: "パラパラ漫画モード",
};

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  simple: "アップロードした画像を Gemini でアレンジするシンプルな編集モードです。",
  flipbook: "1枚の画像から物語を膨らませ、4コマのパラパラ漫画を作成します。",
};

const MODE_OPTIONS: { id: Mode; label: string; description: string }[] = [
  {
    id: "simple",
    label: "画像編集モード",
    description: "アップロードした画像をもとに1枚の仕上がりを作ります。",
  },
  {
    id: "flipbook",
    label: "パラパラ漫画モード",
    description: "写真から4枚の連続した物語カットを生成します。",
  },
];

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

const formatFrameFileName = (index: number, timestamp: number | null) => {
  const safeTimestamp = timestamp ?? Date.now();
  return `hide-nb-flipbook-${safeTimestamp}-frame-${index + 1}.png`;
};

export default function Home() {
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>("simple");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) {
        return;
      }
      if (menuButtonRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleModeSelect = (nextMode: Mode) => {
    setMode(nextMode);
    setIsMenuOpen(false);
  };

  const handleSignIn = () => signIn("google");
  const handleSignOut = () => {
    setIsMenuOpen(false);
    void signOut();
  };

  if (status === "loading") {
    return (
      <main className={styles.centered}>
        <div className={styles.fadeIn}>
          <div className={styles.loadingSpinner}></div>
          <p style={{ marginTop: "1rem" }}>読み込み中...</p>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className={styles.centered}>
        <div className={`${styles.card} ${styles.fadeIn}`}>
          <h1 className={styles.title}>Hide NB Studio</h1>
          <p className={styles.description}>
            家族限定のページです。Googleアカウントでサインインしてください。
          </p>
          <button type="button" className={styles.primaryButton} onClick={handleSignIn}>
            Googleでサインイン
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`${styles.layout} ${styles.fadeIn}`}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitleRow}>
            <button
              ref={menuButtonRef}
              type="button"
              className={styles.menuButton}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              aria-label="メニュー"
              onClick={() => setIsMenuOpen((previous) => !previous)}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                <span className={styles.menuIconBar} />
                <span className={styles.menuIconBar} />
                <span className={styles.menuIconBar} />
              </span>
            </button>
            <div className={styles.titleGroup}>
              <h1 className={styles.title}>Hide NB Studio</h1>
              <div className={styles.modeBadge}>{MODE_LABELS[mode]}</div>
            </div>
          </div>
          <p className={styles.modeDescription}>{MODE_DESCRIPTIONS[mode]}</p>
        </div>
        {isMenuOpen ? (
          <>
            <div className={`${styles.menuOverlay} ${styles.fadeIn}`} aria-hidden="true" />
            <div className={`${styles.modeMenu} ${styles.fadeIn}`} ref={menuRef} role="menu">
              <p className={styles.modeMenuTitle}>モードを選択</p>
              <div className={styles.modeMenuList}>
                {MODE_OPTIONS.map((option) => {
                  const isActive = option.id === mode;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles.modeMenuItem} ${isActive ? styles.modeMenuItemActive : ""}`.trim()}
                      onClick={() => handleModeSelect(option.id)}
                      role="menuitemradio"
                      aria-checked={isActive}
                    >
                      <div className={styles.modeMenuItemHeader}>
                        <span className={styles.modeMenuItemLabel}>{option.label}</span>
                        {isActive ? <span className={styles.modeMenuCheck}>✓</span> : null}
                      </div>
                      <span className={styles.modeMenuItemDescription}>{option.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className={styles.modeMenuFooter}>
                <button
                  type="button"
                  className={styles.menuActionButton}
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  サインアウト
                </button>
              </div>
            </div>
          </>
        ) : null}
      </header>

      <section className={styles.content}>
        {mode === "simple" ? <SimpleEditor /> : <FlipbookCreator />}
      </section>
    </main>
  );
}

function SimpleEditor() {
  const [selectedPromptId, setSelectedPromptId] = useState<string>(PROMPT_PRESETS[0]?.id ?? "");
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

  const handleProgressComplete = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const { progress, currentStep, complete: completeProgress } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
  });

  useEffect(() => {
    return () => {
      if (primaryPreviewUrl) {
        URL.revokeObjectURL(primaryPreviewUrl);
      }
      if (secondaryPreviewUrl) {
        URL.revokeObjectURL(secondaryPreviewUrl);
      }
    };
  }, [primaryPreviewUrl, secondaryPreviewUrl]);

  useEffect(() => {
    if (resultImage) {
      const timestamp = Date.now();
      setDownloadFileName(`hide-nb-edit-${timestamp}.png`);
    } else {
      setDownloadFileName(null);
    }
  }, [resultImage]);

  const selectedPrompt = useMemo(
    () => PROMPT_PRESETS.find((option) => option.id === selectedPromptId)?.prompt ?? "",
    [selectedPromptId],
  );

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
      setSecondaryPreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
      setIsOptimizingSecondary(false);
    }
  }, [requiresDualUpload]);

  const isOptimizingAny = isOptimizingPrimary || isOptimizingSecondary;
  const hasRequiredFiles = Boolean(primaryFile) && (!requiresDualUpload || Boolean(secondaryFile));

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    slot: "primary" | "secondary",
  ) => {
    const file = event.target.files?.[0];
    const setFile = slot === "primary" ? setPrimaryFile : setSecondaryFile;
    const currentPreviewUrl = slot === "primary" ? primaryPreviewUrl : secondaryPreviewUrl;
    const setPreviewUrl = slot === "primary" ? setPrimaryPreviewUrl : setSecondaryPreviewUrl;
    const setIsOptimizingSlot = slot === "primary" ? setIsOptimizingPrimary : setIsOptimizingSecondary;

    if (!file) {
      setFile(null);
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
      setPreviewUrl(null);
      return;
    }

    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
    }

    setErrorMessage(null);
    setResultImage(null);
    setIsOptimizingSlot(true);

    try {
      const optimizedFile = await resizeImage(file);
      setFile(optimizedFile);
      setPreviewUrl(URL.createObjectURL(optimizedFile));
    } catch (error) {
      console.error("Image optimization error:", error);
      setErrorMessage(error instanceof Error ? error.message : "画像の最適化に失敗しました。");
      setFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } finally {
      setIsOptimizingSlot(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPrompt) {
      setErrorMessage("プロンプトを選択してください。");
      return;
    }

    if (!primaryFile || (requiresDualUpload && !secondaryFile)) {
      setErrorMessage(
        requiresDualUpload
          ? "対戦シーンでは2枚の画像をアップロードしてください。"
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
      formData.append("image", primaryFile);
      if (requiresDualUpload && secondaryFile) {
        formData.append("image_secondary", secondaryFile);
      }

      const response = await fetch("/api/edit-image", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") ?? "";
      const isJsonResponse = contentType.includes("application/json");
      const rawBody = await response.text();
      let parsedBody: unknown = rawBody;

      if (isJsonResponse && rawBody) {
        try {
          parsedBody = JSON.parse(rawBody) as unknown;
        } catch {
          if (response.ok) {
            throw new Error("サーバーの応答を読み取れませんでした。時間をおいて再度お試しください。");
          }
        }
      }

      if (!response.ok) {
        const fallbackMessage =
          response.status >= 500
            ? "サーバーでエラーが発生しました。時間をおいて再度お試しください。"
            : "画像編集に失敗しました。入力内容をご確認のうえ、再度お試しください。";

        throw new Error(extractErrorMessage(parsedBody, fallbackMessage));
      }

      if (!isJsonResponse || !isApiSuccessResponse(parsedBody)) {
        throw new Error("サーバーからの画像データを取得できませんでした。時間をおいて再度お試しください。");
      }

      const mimeType = parsedBody.mimeType?.trim() ? parsedBody.mimeType : "image/png";
      const imageUrl = `data:${mimeType};base64,${parsedBody.imageBase64}`;
      setResultImage(imageUrl);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("予期しないエラーが発生しました。");
      }
    } finally {
      completeProgress();
    }
  };

  return (
    <>
      <form className={styles.editor} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <PromptPicker groups={groupedPrompts} selectedPromptId={selectedPromptId} onSelect={setSelectedPromptId} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>
            {requiresDualUpload ? "2. 2枚の画像をアップロード" : "2. 画像をアップロード"}
          </span>

          {requiresDualUpload ? (
            <>
              <p className={styles.helper}>
                ファイターごとに1人ずつ写った写真を選んでください。1枚目が左側、2枚目が右側のキャラクターになります。
              </p>
              <div className={styles.dualUploadGroup}>
                <div className={styles.dualUploadField}>
                  <span className={styles.subLabel}>プレイヤー1（左側）の画像</span>
                  <input
                    className={styles.fileInput}
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileChange(event, "primary")}
                  />
                  {primaryPreviewUrl ? (
                    <div className={`${styles.preview} ${styles.fadeInUp}`}>
                      <span className={styles.helper}>プレイヤー1の元画像</span>
                      <Image
                        src={primaryPreviewUrl}
                        alt="アップロードした画像"
                        className={`${styles.previewImage} ${styles.fadeIn}`}
                        width={900}
                        height={600}
                        unoptimized
                      />
                    </div>
                  ) : isOptimizingPrimary ? (
                    <p className={styles.helper}>画像を最適化中...</p>
                  ) : (
                    <p className={styles.helper}>JPG または PNG 画像を選択してください。</p>
                  )}
                </div>
                <div className={styles.dualUploadField}>
                  <span className={styles.subLabel}>プレイヤー2（右側）の画像</span>
                  <input
                    className={styles.fileInput}
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileChange(event, "secondary")}
                  />
                  {secondaryPreviewUrl ? (
                    <div className={`${styles.preview} ${styles.fadeInUp}`}>
                      <span className={styles.helper}>プレイヤー2の元画像</span>
                      <Image
                        src={secondaryPreviewUrl}
                        alt="アップロードした画像"
                        className={`${styles.previewImage} ${styles.fadeIn}`}
                        width={900}
                        height={600}
                        unoptimized
                      />
                    </div>
                  ) : isOptimizingSecondary ? (
                    <p className={styles.helper}>画像を最適化中...</p>
                  ) : (
                    <p className={styles.helper}>JPG または PNG 画像を選択してください。</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <input
                className={styles.fileInput}
                type="file"
                accept="image/*"
                onChange={(event) => handleFileChange(event, "primary")}
              />
              {primaryPreviewUrl ? (
                <div className={`${styles.preview} ${styles.fadeInUp}`}>
                  <span className={styles.label}>元画像プレビュー</span>
                  <Image
                    src={primaryPreviewUrl}
                    alt="アップロードした画像"
                    className={`${styles.previewImage} ${styles.fadeIn}`}
                    width={900}
                    height={600}
                    unoptimized
                  />
                </div>
              ) : isOptimizingPrimary ? (
                <p className={styles.helper}>画像を最適化中...</p>
              ) : (
                <p className={styles.helper}>JPG または PNG 画像を選択してください。</p>
              )}
            </>
          )}
        </div>

        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting || !hasRequiredFiles || isOptimizingAny}
        >
          {isSubmitting ? (
            <>
              <div className={styles.spinner}></div>
              編集中...
            </>
          ) : (
            "Gemini にお任せ"
          )}
        </button>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </form>

      <aside className={styles.resultPane}>
        <h2 className={styles.label}>仕上がり</h2>
        {isSubmitting ? (
          <div className={styles.fadeInUp}>
            <ProgressDisplay
              isVisible={true}
              currentStep={currentStep}
              progress={progress}
              steps={PROGRESS_STEPS}
            />
          </div>
        ) : resultImage ? (
          <div className={`${styles.resultCard} ${styles.fadeInUp}`}>
            <Image
              src={resultImage}
              alt="編集後の画像"
              className={`${styles.resultImage} ${styles.fadeIn}`}
              width={900}
              height={600}
              unoptimized
            />
            <a href={resultImage} download={downloadFileName ?? undefined} className={styles.primaryButton}>
              画像をダウンロード
            </a>
          </div>
        ) : (
          <p className={styles.helper}>編集結果がここに表示されます。</p>
        )}
      </aside>
    </>
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
  const [generationTimestamp, setGenerationTimestamp] = useState<number | null>(null);

  const handleProgressComplete = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const { progress, currentStep, complete: completeProgress } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
    steps: FLIPBOOK_PROGRESS_STEPS,
  });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (frames.length === 0) {
      setIsPlaying(false);
      setCurrentFrame(0);
      return;
    }
    setCurrentFrame(0);
    setIsPlaying(true);
  }, [frames]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentFrame((previous) => (previous + 1) % frames.length);
    }, Math.max(120, playbackDelay));

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, frames, playbackDelay]);

  const resetPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetPreview();
      setErrorMessage(null);
      setFrames([]);
      setGenerationTimestamp(null);
      setIsOptimizing(true);

      try {
        const optimizedFile = await resizeImage(file);
        setSelectedFile(optimizedFile);
        setPreviewUrl(URL.createObjectURL(optimizedFile));
      } catch (error) {
        console.error("Image optimization error:", error);
        setErrorMessage(error instanceof Error ? error.message : "画像の最適化に失敗しました。");
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } finally {
        setIsOptimizing(false);
      }
    } else {
      setSelectedFile(null);
      resetPreview();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (storyIdea.trim().length === 0) {
      setErrorMessage("ストーリーのアイデアを入力してください。");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("基準となる画像をアップロードしてください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFrames([]);
    setGenerationTimestamp(null);
    setIsPlaying(false);

    try {
      const formData = new FormData();
      formData.append("story", storyIdea);
      formData.append("image", selectedFile);

      const response = await fetch("/api/create-flipbook", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") ?? "";
      const isJsonResponse = contentType.includes("application/json");
      const rawBody = await response.text();
      let parsedBody: unknown = rawBody;

      if (isJsonResponse && rawBody) {
        try {
          parsedBody = JSON.parse(rawBody) as unknown;
        } catch {
          if (response.ok) {
            throw new Error("サーバーの応答を読み取れませんでした。時間をおいて再度お試しください。");
          }
        }
      }

      if (!response.ok) {
        const fallbackMessage =
          response.status >= 500
            ? "サーバーでエラーが発生しました。時間をおいて再度お試しください。"
            : "パラパラ漫画の作成に失敗しました。入力内容をご確認のうえ、再度お試しください。";

        throw new Error(extractErrorMessage(parsedBody, fallbackMessage));
      }

      if (!isJsonResponse || !isFlipbookResponse(parsedBody)) {
        throw new Error("サーバーからのフレーム情報を取得できませんでした。時間をおいて再度お試しください。");
      }

      const frameUrls = parsedBody.frames.map((frame) => {
        const mimeType = frame.mimeType?.trim() ? frame.mimeType : "image/png";
        return `data:${mimeType};base64,${frame.imageBase64}`;
      });

      setGenerationTimestamp(Date.now());
      setFrames(frameUrls);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("予期しないエラーが発生しました。");
      }
    } finally {
      completeProgress();
    }
  };

  const handleTogglePlay = () => {
    if (frames.length === 0) {
      return;
    }
    setIsPlaying((previous) => !previous);
  };

  const handleSelectFrame = (index: number) => {
    setCurrentFrame(index);
    setIsPlaying(false);
  };

  const handlePrevFrame = () => {
    if (frames.length === 0) {
      return;
    }
    setCurrentFrame((previous) => (previous - 1 + frames.length) % frames.length);
    setIsPlaying(false);
  };

  const handleNextFrame = () => {
    if (frames.length === 0) {
      return;
    }
    setCurrentFrame((previous) => (previous + 1) % frames.length);
    setIsPlaying(false);
  };

  const framesPerSecond = Math.round((1000 / Math.max(1, playbackDelay)) * 10) / 10;

  return (
    <>
      <form className={styles.editor} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="flipbook-story">
            1. ストーリーのアイデア
          </label>
          <textarea
            id="flipbook-story"
            className={styles.textArea}
            rows={4}
            placeholder="例: 夕暮れの公園で遊ぶ子供が、ふと空を見上げて流れ星を見つける物語"
            value={storyIdea}
            onChange={(event) => setStoryIdea(event.target.value)}
          />
          <div className={styles.flipbookGuidance}>
            <p className={styles.helper}>Gemini は次の 4 コマ構成で物語をふくらませます:</p>
            <ol className={styles.flipbookGuideList}>
              {FLIPBOOK_GUIDANCE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>2. 主役の画像をアップロード</span>
          <input className={styles.fileInput} type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        {previewUrl ? (
          <div className={`${styles.preview} ${styles.fadeInUp}`}>
            <span className={styles.label}>元画像プレビュー</span>
            <Image
              src={previewUrl}
              alt="アップロードした画像"
              className={`${styles.previewImage} ${styles.fadeIn}`}
              width={900}
              height={600}
              unoptimized
            />
          </div>
        ) : isOptimizing ? (
          <p className={styles.helper}>画像を最適化中...</p>
        ) : (
          <p className={styles.helper}>JPG / PNG / WebP 形式の画像を選択してください。</p>
        )}

        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting || !selectedFile || isOptimizing || storyIdea.trim().length === 0}
        >
          {isSubmitting ? (
            <>
              <div className={styles.spinner}></div>
              作成中...
            </>
          ) : (
            "Gemini にお任せ"
          )}
        </button>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </form>

      <aside className={styles.resultPane}>
        <h2 className={styles.label}>パラパラ漫画プレビュー</h2>
        {isSubmitting ? (
          <div className={styles.fadeInUp}>
            <ProgressDisplay
              isVisible={true}
              currentStep={currentStep}
              progress={progress}
              steps={FLIPBOOK_PROGRESS_STEPS}
              title="Gemini がパラパラ漫画を作成中..."
            />
          </div>
        ) : frames.length > 0 ? (
          <div className={`${styles.flipbookPlayerCard} ${styles.fadeInUp}`}>
            <div className={styles.flipbookFrameInfo}>
              フレーム {currentFrame + 1} / {frames.length}
            </div>
            <div className={styles.flipbookMainFrame}>
              <Image
                src={frames[currentFrame]}
                alt={`フレーム ${currentFrame + 1}`}
                className={styles.flipbookFrameImage}
                width={900}
                height={600}
                unoptimized
              />
            </div>
            <div className={styles.flipbookControls}>
              <button
                type="button"
                className={`${styles.primaryButton} ${styles.flipbookControlButton}`}
                onClick={handleTogglePlay}
              >
                {isPlaying ? "一時停止" : "再生"}
              </button>
              <button
                type="button"
                className={`${styles.secondaryButton} ${styles.flipbookControlButton}`}
                onClick={handlePrevFrame}
                disabled={frames.length === 0}
              >
                前へ
              </button>
              <button
                type="button"
                className={`${styles.secondaryButton} ${styles.flipbookControlButton}`}
                onClick={handleNextFrame}
                disabled={frames.length === 0}
              >
                次へ
              </button>
            </div>
            <div className={styles.flipbookSpeedControl}>
              <label className={styles.flipbookSpeedLabel} htmlFor="flipbook-speed">
                再生スピード
              </label>
              <input
                id="flipbook-speed"
                className={styles.flipbookSpeedSlider}
                type="range"
                min={180}
                max={1200}
                step={60}
                value={playbackDelay}
                onChange={(event) => setPlaybackDelay(Number(event.target.value))}
                disabled={frames.length === 0}
              />
              <span className={styles.flipbookSpeedValue}>{framesPerSecond.toFixed(1)} コマ/秒</span>
            </div>
            <div className={styles.flipbookFramesGrid}>
              {frames.map((frame, index) => {
                const isActive = index === currentFrame;
                const downloadName = formatFrameFileName(index, generationTimestamp);
                return (
                  <div
                    key={index}
                    className={`${styles.flipbookFrameItem} ${isActive ? styles.flipbookFrameItemActive : ""}`.trim()}
                  >
                    <button
                      type="button"
                      className={styles.flipbookFrameSelect}
                      onClick={() => handleSelectFrame(index)}
                    >
                      <Image
                        src={frame}
                        alt={`フレーム ${index + 1}`}
                        className={styles.flipbookFrameThumbnail}
                        width={220}
                        height={150}
                        unoptimized
                      />
                    </button>
                    <div className={styles.flipbookFrameMeta}>
                      <span>フレーム {index + 1}</span>
                      <a
                        href={frame}
                        download={downloadName}
                        className={`${styles.secondaryButton} ${styles.flipbookFrameDownload}`}
                      >
                        保存
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className={styles.helper}>パラパラ漫画を作成すると、ここでプレビューできます。</p>
        )}
      </aside>
    </>
  );
}
