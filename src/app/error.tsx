"use client";

import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error.digest ?? error.message, error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-white">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-display">
            エラーが発生しました
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            予期しないエラーが起きました。もう一度お試しください。
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-stone-400 font-mono">
              エラーID: {error.digest}
            </p>
          )}
        </div>
        <Button onClick={reset} size="lg" className="w-full">
          再試行
        </Button>
      </div>
    </div>
  );
}
