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

type Mode = "simple" | "flipbook" | "freestyle" | "prompt";

type UploadSlot = {
  id: string;
  file: File | null;
  previewUrl: string | null;
  isOptimizing: boolean;
  selectionToken: string | null;
};

const MODE_LABELS: Record<Mode, string> = {
  simple: "画像編集モード",
  flipbook: "パラパラ漫画モード",
  freestyle: "自由編集モード",
  prompt: "プロンプト生成モード",
};

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  simple: "アップロードした画像を Gemini でアレンジするシンプルな編集モードです。",
  flipbook: "1枚の画像から物語を膨らませ、4コマのパラパラ漫画を作成します。",
  freestyle: "複数枚の参考画像と自由入力の指示で、理想の1枚を Gemini に仕上げてもらえます。",
  prompt: "画像をアップロードせず、文章だけで理想の1枚を作成します。",
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
  {
    id: "freestyle",
    label: "自由編集モード",
    description: "複数の画像を参考に、自由なプロンプトで理想の1枚を作成します。",
  },
  {
    id: "prompt",
    label: "プロンプト生成モード",
    description: "文章だけを入力してゼロからイメージを生成します。",
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

const FREESTYLE_PROGRESS_STEPS: ProgressStep[] = [
  { id: "gather", label: "参考画像を読み込み中...", estimatedDuration: 1600 },
  { id: "plan", label: "編集プランを構築中...", estimatedDuration: 1800 },
  { id: "prompt", label: "指示内容を解釈中...", estimatedDuration: 1500 },
  { id: "generate", label: "Gemini で画像を生成中...", estimatedDuration: 6200 },
  { id: "refine", label: "仕上がりを調整中...", estimatedDuration: 1400 },
  { id: "complete", label: "完了", estimatedDuration: 400 },
];

const MAX_FREESTYLE_UPLOADS = 5;

const PROMPT_ONLY_PROGRESS_STEPS: ProgressStep[] = [
  { id: "plan", label: "イメージを構想中...", estimatedDuration: 1400 },
  { id: "prompt", label: "指示内容を読み取り中...", estimatedDuration: 1600 },
  { id: "generate", label: "Gemini で画像を生成中...", estimatedDuration: 6400 },
  { id: "refine", label: "仕上がりを整えています...", estimatedDuration: 1200 },
  { id: "complete", label: "完了", estimatedDuration: 400 },
];

const PROMPT_ONLY_SUGGESTIONS = [
  "黄昏の砂浜で家族が手をつないで散歩しているシネマティックな写真",
  "80年代SFアニメ風の未来都市を飛ぶジェットボードに乗った少年のイラスト",
  "木漏れ日の森で紅葉した葉が舞う中、静かに読書する女性を描いた油彩画",
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
        {mode === "simple" ? (
          <SimpleEditor />
        ) : mode === "flipbook" ? (
          <FlipbookCreator />
        ) : mode === "freestyle" ? (
          <FreestyleEditor />
        ) : (
          <PromptOnlyCreator />
        )}
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
          <span className={styles.label}>
            {requiresDualUpload ? "1. 2枚の画像をアップロード" : "1. 画像をアップロード"}
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

        <div className={styles.field}>
          <PromptPicker
            legend="2. プロンプトを選ぶ"
            groups={groupedPrompts}
            selectedPromptId={selectedPromptId}
            onSelect={setSelectedPromptId}
          />
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

function PromptOnlyCreator() {
  const [prompt, setPrompt] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null);

  const handleProgressComplete = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const { progress, currentStep, complete: completeProgress } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
    steps: PROMPT_ONLY_PROGRESS_STEPS,
  });

  useEffect(() => {
    if (resultImage) {
      const timestamp = Date.now();
      setDownloadFileName(`hide-nb-prompt-${timestamp}.png`);
    } else {
      setDownloadFileName(null);
    }
  }, [resultImage]);

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setResultImage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length === 0) {
      setErrorMessage("プロンプトを入力してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);

    try {
      const response = await fetch("/api/prompt-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt }),
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
            : "画像生成に失敗しました。入力内容をご確認のうえ、再度お試しください。";

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

  const promptIsEmpty = prompt.trim().length === 0;

  return (
    <>
      <form className={styles.editor} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="prompt-only-text">
            1. 作りたいイメージを文章で伝える
          </label>
          <textarea
            id="prompt-only-text"
            className={styles.textArea}
            rows={6}
            placeholder="例: 星空の下でランタンを掲げる少年の幻想的なイラスト"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <p className={styles.helper}>
            想像しているシーンや雰囲気、色合い、時間帯などを具体的に書き込むと精度が上がります。
          </p>
          <div className={styles.promptSuggestionList}>
            {PROMPT_ONLY_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.promptSuggestionButton}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <button className={styles.primaryButton} type="submit" disabled={isSubmitting || promptIsEmpty}>
          {isSubmitting ? (
            <>
              <div className={styles.spinner}></div>
              生成中...
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
              steps={PROMPT_ONLY_PROGRESS_STEPS}
            />
          </div>
        ) : resultImage ? (
          <div className={`${styles.resultCard} ${styles.fadeInUp}`}>
            <Image
              src={resultImage}
              alt="生成した画像"
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
          <p className={styles.helper}>生成した画像がここに表示されます。</p>
        )}
      </aside>
    </>
  );
}

function FreestyleEditor() {
  const slotIdCounterRef = useRef(0);
  const createEmptySlot = useCallback((): UploadSlot => {
    slotIdCounterRef.current += 1;
    return {
      id: `slot-${slotIdCounterRef.current}`,
      file: null,
      previewUrl: null,
      isOptimizing: false,
      selectionToken: null,
    };
  }, [slotIdCounterRef]);

  const [prompt, setPrompt] = useState("");
  const [uploads, setUploads] = useState<UploadSlot[]>(() => [createEmptySlot()]);
  const uploadsRef = useRef<UploadSlot[]>(uploads);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null);

  const handleProgressComplete = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const { progress, currentStep, complete: completeProgress } = useProgressSimulation({
    isActive: isSubmitting,
    onComplete: handleProgressComplete,
    steps: FREESTYLE_PROGRESS_STEPS,
  });

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((slot) => {
        if (slot.previewUrl) {
          URL.revokeObjectURL(slot.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (resultImage) {
      const timestamp = Date.now();
      setDownloadFileName(`hide-nb-freestyle-${timestamp}.png`);
    } else {
      setDownloadFileName(null);
    }
  }, [resultImage]);

  const hasAtLeastOneFile = uploads.some((slot) => Boolean(slot.file));
  const isOptimizingAny = uploads.some((slot) => slot.isOptimizing);
  const canAddMoreUploads = uploads.length < MAX_FREESTYLE_UPLOADS;
  const promptIsEmpty = prompt.trim().length === 0;

  const handleAddSlot = () => {
    if (!canAddMoreUploads) {
      return;
    }
    setUploads((previous) => [...previous, createEmptySlot()]);
    setResultImage(null);
    setErrorMessage(null);
  };

  const handleRemoveSlot = (slotId: string) => {
    setUploads((previous) => {
      if (previous.length <= 1) {
        return previous;
      }

      const target = previous.find((slot) => slot.id === slotId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      const next = previous.filter((slot) => slot.id !== slotId);
      return next.length === 0 ? [createEmptySlot()] : next;
    });
    setResultImage(null);
    setErrorMessage(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, slotId: string) => {
    const input = event.target;
    const file = input.files?.[0] ?? null;
    const selectionToken = file ? `${Date.now()}-${Math.random().toString(36).slice(2)}` : null;

    setUploads((previous) =>
      previous.map((slot) => {
        if (slot.id !== slotId) {
          return slot;
        }

        if (slot.previewUrl) {
          URL.revokeObjectURL(slot.previewUrl);
        }

        return {
          ...slot,
          file: null,
          previewUrl: null,
          isOptimizing: Boolean(file),
          selectionToken,
        };
      }),
    );

    setResultImage(null);
    setErrorMessage(null);

    if (!file) {
      setUploads((previous) =>
        previous.map((slot) =>
          slot.id === slotId
            ? {
                ...slot,
                isOptimizing: false,
                selectionToken: null,
              }
            : slot,
        ),
      );
      input.value = "";
      return;
    }

    try {
      const optimizedFile = await resizeImage(file);
      const previewUrl = URL.createObjectURL(optimizedFile);

      setUploads((previous) =>
        previous.map((slot) => {
          if (slot.id !== slotId) {
            return slot;
          }

          if (slot.selectionToken !== selectionToken) {
            URL.revokeObjectURL(previewUrl);
            return slot;
          }

          return {
            ...slot,
            file: optimizedFile,
            previewUrl,
            isOptimizing: false,
            selectionToken: null,
          };
        }),
      );
    } catch (error) {
      console.error("Image optimization error:", error);
      setErrorMessage(error instanceof Error ? error.message : "画像の最適化に失敗しました。");
      const fallbackUrl = URL.createObjectURL(file);

      setUploads((previous) =>
        previous.map((slot) => {
          if (slot.id !== slotId) {
            return slot;
          }

          if (slot.selectionToken !== selectionToken) {
            URL.revokeObjectURL(fallbackUrl);
            return slot;
          }

          return {
            ...slot,
            file,
            previewUrl: fallbackUrl,
            isOptimizing: false,
            selectionToken: null,
          };
        }),
      );
    } finally {
      setUploads((previous) =>
        previous.map((slot) => {
          if (slot.id !== slotId) {
            return slot;
          }

          if (slot.selectionToken !== selectionToken) {
            return slot;
          }

          return {
            ...slot,
            isOptimizing: false,
            selectionToken: null,
          };
        }),
      );
    }

    input.value = "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    const selectedFiles = uploads
      .map((slot) => slot.file)
      .filter((slotFile): slotFile is File => Boolean(slotFile));

    if (trimmedPrompt.length === 0) {
      setErrorMessage("編集内容を入力してください。");
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage("画像を1枚以上アップロードしてください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append("prompt", trimmedPrompt);
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/freestyle-edit", {
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
            : "画像の生成に失敗しました。入力内容をご確認のうえ、再度お試しください。";

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
          <span className={styles.label}>1. 参考にしたい画像をアップロード</span>
          <p className={styles.helper}>
            {`最大 ${MAX_FREESTYLE_UPLOADS} 枚まで追加できます。アップロードした順番は参考優先度の目安になります。`}
          </p>
          <div className={styles.multiUploadList}>
            {uploads.map((slot, index) => (
              <div key={slot.id} className={`${styles.multiUploadItem} ${styles.fadeInUp}`}>
                <div className={styles.multiUploadHeader}>
                  <span className={styles.subLabel}>参考画像 {index + 1}</span>
                  {uploads.length > 1 ? (
                    <button
                      type="button"
                      className={styles.removeUploadButton}
                      onClick={() => handleRemoveSlot(slot.id)}
                    >
                      削除
                    </button>
                  ) : null}
                </div>
                <input
                  className={styles.fileInput}
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event, slot.id)}
                />
                {slot.previewUrl ? (
                  <div className={`${styles.preview} ${styles.fadeInUp}`}>
                    <span className={styles.helper}>アップロードした画像</span>
                    <Image
                      src={slot.previewUrl}
                      alt="アップロードした画像"
                      className={`${styles.previewImage} ${styles.fadeIn}`}
                      width={900}
                      height={600}
                      unoptimized
                    />
                  </div>
                ) : slot.isOptimizing ? (
                  <p className={styles.helper}>画像を最適化中...</p>
                ) : (
                  <p className={styles.helper}>JPG / PNG / WebP の画像を選択してください。</p>
                )}
                {slot.file ? <p className={styles.fileName}>{slot.file.name}</p> : null}
              </div>
            ))}
          </div>
          <div className={styles.multiUploadActions}>
            <button
              type="button"
              className={styles.addUploadButton}
              onClick={handleAddSlot}
              disabled={!canAddMoreUploads}
            >
              + 参考画像を追加
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>2. どんな仕上がりにしたいか自由に記入</span>
          <textarea
            className={styles.textArea}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="例: 子どもたちが描いたドラゴンのスケッチをもとに、ファンタジー映画のポスター風に仕上げてほしい"
          />
          <p className={styles.helper}>
            アップロードした画像ごとに参考にしてほしいポイントがあれば、詳しく書くとより反映されやすくなります。
          </p>
        </div>

        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting || !hasAtLeastOneFile || isOptimizingAny || promptIsEmpty}
        >
          {isSubmitting ? (
            <>
              <div className={styles.spinner}></div>
              自由編集中...
            </>
          ) : (
            "Gemini に生成を依頼"
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
              steps={FREESTYLE_PROGRESS_STEPS}
              title="Gemini が自由編集しています..."
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
            <a
              href={resultImage}
              download={downloadFileName ?? undefined}
              className={styles.primaryButton}
            >
              画像をダウンロード
            </a>
          </div>
        ) : (
          <p className={styles.helper}>生成結果がここに表示されます。</p>
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
          <label className={styles.label} htmlFor="flipbook-image">
            1. 主役の画像をアップロード
          </label>
          <input
            id="flipbook-image"
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="flipbook-story">
            2. ストーリーのアイデア
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
