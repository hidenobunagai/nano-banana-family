"use client";

import { ProgressDisplay, type ProgressStep } from "@/components/ProgressDisplay";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { ChevronLeft, ChevronRight, Download, RefreshCw, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

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
                  <Button type="button" size="sm" variant="ghost" onClick={onBack} disabled={!history.canBack}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    前の結果
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={onForward} disabled={!history.canForward}>
                    次の結果
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <span className="text-dns-14 text-[var(--color-neutral-400)] tabular-nums">
                    {history.index + 1} / {history.total}
                  </span>
                </div>
              ) : null}
              {actions}
            </div>
          )}
          {children}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild className="w-full" size="lg">
              <a href={resultImage} download={downloadFilename ?? undefined}>
                <Download className="w-4 h-4 mr-2" />
                {downloadLabel}
              </a>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={onRetry}
              disabled={!canRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryLabel}
            </Button>
          </div>
          <Button type="button" variant="ghost" className="w-full" onClick={onReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            最初からやり直す
          </Button>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--color-neutral-400)] border-2 border-dashed border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] rounded-[var(--radius-lg)] px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center">
            {emptyIcon}
          </div>
          <p className="font-medium text-[var(--color-neutral-500)]">{emptyText}</p>
        </div>
      )}
    </Section>
  );
}
