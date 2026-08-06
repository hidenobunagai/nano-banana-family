"use client";

import { Button } from "@/components/ui/Button";

interface ErrorBannerProps {
  message: string;
  hint: string;
  retryLabel: string;
  onRetry: () => void;
  canRetry: boolean;
  onReset: () => void;
}

export function ErrorBanner({
  message,
  hint,
  retryLabel,
  onRetry,
  canRetry,
  onReset,
}: ErrorBannerProps) {
  return (
    <div className="dads-banner dads-banner--error text-dns-15" aria-live="polite">
      <p className="font-bold">{message}</p>
      <p className="mt-1 opacity-80">{hint}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Button type="button" size="sm" onClick={onRetry} disabled={!canRetry}>
          {retryLabel}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onReset}>
          最初からやり直す
        </Button>
      </div>
    </div>
  );
}
