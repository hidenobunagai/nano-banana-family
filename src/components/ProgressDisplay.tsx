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
}

export function ProgressDisplay({
  isVisible,
  currentStep,
  progress,
  steps,
  title,
}: ProgressDisplayProps) {
  if (!isVisible) {
    return null;
  }

  const currentStepInfo = steps[currentStep];

  return (
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 backdrop-blur-md space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
          <h3 className="font-semibold text-emerald-400">
            {title ?? "Gemini が画像を編集中..."}
          </h3>
          <span className="font-mono text-slate-400">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.35)]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-slate-800 before:z-0">
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
                  "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 bg-slate-950",
                  isCompleted
                    ? "border-emerald-500 text-emerald-500"
                    : isActive
                    ? "border-emerald-400 text-emerald-400 ring-2 ring-emerald-500/20"
                    : "border-slate-700 text-slate-700"
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
                  isActive ? "text-slate-100" : "text-slate-400"
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
