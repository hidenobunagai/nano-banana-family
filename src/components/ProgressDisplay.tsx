import { cn } from "@/components/ui/Button";
import { Check, Circle, Loader2 } from "lucide-react";

export interface ProgressStep {
  id: string;
  label: string;
  estimatedDuration: number;
}

export interface ProgressDisplayProps {
  isVisible: boolean;
  currentStep: number;
  progress: number;
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
      className="bg-white border border-[#e5e7eb] rounded-[24px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] space-y-6"
      aria-live="polite"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 text-dns-14">
          <h3 className="font-bold text-[#2563eb]">{title ?? "Gemini が画像を編集中..."}</h3>
          <span className="font-mono text-[#9ca3af] tabular-nums">{Math.round(progress)}%</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-dns-14 text-[#9ca3af]">
          <span>{currentStepInfo?.label ?? "処理を準備中…"}</span>
          {roundedTimeRemaining && (
            <span className="font-mono tabular-nums">残り約 {roundedTimeRemaining} 秒</span>
          )}
        </div>

        <div className="h-2 bg-[#e5e7eb] rounded-[9999px] overflow-hidden">
          <div
            className="h-full bg-[#2563eb] transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-[#e5e7eb] before:z-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "relative z-10 flex items-center gap-4 transition-colors duration-500",
                isPending ? "opacity-40" : "opacity-100",
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-[9999px] flex items-center justify-center border transition-all duration-300 bg-white",
                  isCompleted
                    ? "border-[#2563eb] text-[#2563eb]"
                    : isActive
                      ? "border-[#60a5fa] text-[#2563eb] ring-2 ring-[#2563eb]/20"
                      : "border-[#d1d5db] text-[#d1d5db]",
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
                  "text-oln-14 font-medium transition-colors",
                  isActive ? "text-[#1f2937]" : "text-[#9ca3af]",
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
