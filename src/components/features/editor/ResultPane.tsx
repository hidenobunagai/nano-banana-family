"use client";

import { ProgressDisplay, type ProgressStep } from "@/components/ProgressDisplay";
import { Button, cn } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/Toast";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getCanShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";
const getServerCanShare = () => false;

interface ResultPaneProps {
  isSubmitting: boolean;
  steps: ProgressStep[];
  currentStep: number;
  progress: number;
  timeRemaining: number;
  resultImage: string | null;
  emptyIcon: ReactNode;
  emptyText: string;
  history: { index: number; total: number; canBack: boolean; canForward: boolean };
  onBack: () => void;
  onForward: () => void;
  downloadFilename: string | null;
  downloadLabel: string;
  onRetry: () => void;
  retryLabel: string;
  canRetry: boolean;
  onReset: () => void;
  /** Extra controls shown on the right side of the history row. */
  actions?: ReactNode;
  /** Result image display area, rendered below the history row. */
  children?: ReactNode;
}

export function ResultPane({
  isSubmitting,
  steps,
  currentStep,
  progress,
  timeRemaining,
  resultImage,
  emptyIcon,
  emptyText,
  history,
  onBack,
  onForward,
  downloadFilename,
  downloadLabel,
  onRetry,
  retryLabel,
  canRetry,
  onReset,
  actions,
  children,
}: ResultPaneProps) {
  const toast = useToast();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const canShare = useSyncExternalStore(emptySubscribe, getCanShare, getServerCanShare);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Lock background scroll while the lightbox is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, [isLightboxOpen]);

  const handleCopyImage = async () => {
    if (!resultImage) return;
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      const type = blob.type.startsWith("image/") ? blob.type : "image/png";
      const imageBlob = new Blob([blob], { type });
      await navigator.clipboard.write([
        new ClipboardItem({
          [type]: imageBlob,
        }),
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("画像をクリップボードにコピーしました！");
    } catch {
      try {
        await navigator.clipboard.writeText(resultImage);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.info("画像URLをクリップボードにコピーしました。");
      } catch {
        toast.error("コピーできませんでした。保存をご利用ください。");
      }
    }
  };

  const handleShare = async () => {
    if (!resultImage) return;
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      const file = new File([blob], downloadFilename ?? "studio-image.png", {
        type: blob.type || "image/png",
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Hide NB Studio で作成した画像",
        });
      } else {
        await navigator.share({
          title: "Hide NB Studio で作成した画像",
          url: window.location.href,
        });
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        toast.error("共有に失敗しました。");
      }
    }
  };

  return (
    <Section title="仕上がり">
      {isSubmitting ? (
        <ProgressDisplay
          isVisible={true}
          currentStep={currentStep}
          progress={progress}
          steps={steps}
          timeRemaining={timeRemaining}
        />
      ) : resultImage ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {(history.total > 1 || actions) && (
            <div className="flex items-center justify-between gap-2">
              {history.total > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onBack}
                    disabled={!history.canBack}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    前の結果
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onForward}
                    disabled={!history.canForward}
                  >
                    次の結果
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <span className="text-dns-14 text-[var(--color-neutral-500)] tabular-nums">
                    {history.index + 1} / {history.total}
                  </span>
                </div>
              ) : null}
              {actions}
            </div>
          )}

          <div
            className="group relative cursor-pointer"
            onClick={() => setIsLightboxOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsLightboxOpen(true);
              }
            }}
            aria-label="画像をクリックして拡大"
          >
            {children}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity rounded-[var(--radius-lg)] flex items-center justify-center pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-[var(--color-neutral-900)] text-dns-14 font-medium shadow-md">
                <Maximize2 className="w-3.5 h-3.5" />
                拡大表示
              </span>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button asChild className="w-full h-12" size="default">
              <a href={resultImage} download={downloadFilename ?? undefined}>
                <Download className="w-4 h-4 mr-2" />
                {downloadLabel}
              </a>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="default"
              className="w-full h-12"
              onClick={handleCopyImage}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-[var(--color-success-dark)]" />
                  コピー完了！
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  画像をコピー
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {canShare && (
              <Button
                type="button"
                variant="secondary"
                size="default"
                className="w-full h-11"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                共有する
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="default"
              className={cn("w-full h-11", !canShare && "sm:col-span-2")}
              onClick={() => setIsLightboxOpen(true)}
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              全画面で拡大
            </Button>
          </div>

          <div className="pt-2 border-t border-[var(--color-neutral-200)] space-y-2">
            <Button
              type="button"
              variant="secondary"
              size="default"
              className="w-full h-11"
              onClick={onRetry}
              disabled={!canRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryLabel}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              最初からやり直す
            </Button>
          </div>

          {isLightboxOpen && (
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="生成画像の拡大表示"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setIsLightboxOpen(false)}
            >
              <div
                className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="閉じる"
                >
                  <X className="w-6 h-6" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultImage}
                  alt="拡大表示された生成画像"
                  className="max-h-[75vh] max-w-full rounded-[var(--radius-lg)] object-contain shadow-[var(--shadow-overlay)] border border-white/10"
                />
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    asChild
                    size="sm"
                    className="bg-white text-[var(--color-neutral-900)] hover:bg-neutral-100 border-0"
                  >
                    <a href={resultImage} download={downloadFilename ?? undefined}>
                      <Download className="w-4 h-4 mr-1.5" />
                      {downloadLabel}
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyImage}
                    className="bg-white/20 text-white hover:bg-white/30 border-0"
                  >
                    <Copy className="w-4 h-4 mr-1.5" />
                    コピー
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--color-neutral-500)] border-2 border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] rounded-[var(--radius-lg)] px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center">
            {emptyIcon}
          </div>
          <p className="font-medium text-[var(--color-neutral-500)]">{emptyText}</p>
        </div>
      )}
    </Section>
  );
}
