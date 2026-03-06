import { cn } from "@/components/ui/Button";
import { Check, Circle, Loader2 } from "lucide-react";

export interface ProgressStep {
  id: string;
  label: string;
  estimatedDuration: number; // in milliseconds
}

export interface ProgressDisplayProps {
  isVisible: boolean;
  currentStep: number;
  progress: number; // 0-100
  steps: ProgressStep[];
  title?: string;
  timeRemaining?: number;
}

export function ProgressDisplay({
  isVisible,
  currentStep,
  progress,
  steps,
  title,
  timeRemaining,
}: ProgressDisplayProps) {
  if (!isVisible) {
    return null;
  }

  const currentStepInfo = steps[currentStep];
  const roundedTimeRemaining =
    typeof timeRemaining === "number" ? Math.max(1, Math.ceil(timeRemaining)) : null;

  return (
    <div
      className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6"
      aria-live="polite"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <h3 className="font-semibold text-amber-600">
            {title ?? "Gemini が画像を編集中..."}
          </h3>
          <span className="font-mono text-stone-400 tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
          <span>{currentStepInfo?.label ?? "処理を準備中…"}</span>
          {roundedTimeRemaining && (
            <span className="font-mono tabular-nums">残り約 {roundedTimeRemaining} 秒</span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(245,158,11,0.35)]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-stone-200 before:z-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "relative z-10 flex items-center gap-4 transition-colors duration-500",
                isPending ? "opacity-40" : "opacity-100"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 bg-white",
                  isCompleted
                    ? "border-amber-500 text-amber-500"
                    : isActive
                    ? "border-amber-400 text-amber-500 ring-2 ring-amber-500/20"
                    : "border-stone-300 text-stone-300"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Circle className="w-2 h-2 fill-current" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-stone-800" : "text-stone-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
