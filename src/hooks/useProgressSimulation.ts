import { ProgressStep } from "@/components/ProgressDisplay";
import { useCallback, useEffect, useRef, useState } from "react";

export const PROGRESS_STEPS: ProgressStep[] = [
  {
    id: "upload",
    label: "画像をアップロード中...",
    estimatedDuration: 1500,
  },
  {
    id: "analyze",
    label: "画像を解析中...",
    estimatedDuration: 1800,
  },
  {
    id: "prompt",
    label: "プロンプトを処理中...",
    estimatedDuration: 1200,
  },
  {
    id: "generate",
    label: "Gemini で画像を生成中...",
    estimatedDuration: 6500,
  },
  {
    id: "optimize",
    label: "結果を最適化中...",
    estimatedDuration: 1200,
  },
  {
    id: "complete",
    label: "完了",
    estimatedDuration: 400,
  },
];

export interface UseProgressSimulationProps {
  isActive: boolean;
  onComplete?: () => void;
  steps?: ProgressStep[];
  actualElapsedMs?: number;
}

export interface UseProgressSimulationReturn {
  progress: number;
  currentStep: number;
  timeRemaining: number;
  reset: () => void;
  complete: (elapsedMs?: number) => void;
}

interface ProgressState {
  progress: number;
  currentStep: number;
  timeRemaining: number;
}

const INITIAL_STATE: ProgressState = { progress: 0, currentStep: 0, timeRemaining: 0 };

export function useProgressSimulation({
  isActive,
  onComplete,
  steps = PROGRESS_STEPS,
  actualElapsedMs,
}: UseProgressSimulationProps): UseProgressSimulationReturn {
  const [state, setState] = useState<ProgressState>(INITIAL_STATE);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const completionRequestedRef = useRef(false);
  const actualElapsedRef = useRef(actualElapsedMs ?? 0);

  useEffect(() => {
    actualElapsedRef.current = actualElapsedMs ?? 0;
  }, [actualElapsedMs]);

  const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    completionRequestedRef.current = false;
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      completionRequestedRef.current = false;
      const resetTimeout = setTimeout(() => {
        setState(INITIAL_STATE);
      }, 0);
      return () => clearTimeout(resetTimeout);
    }

    const finalPhaseStepCount = Math.min(2, steps.length);
    const finalPhaseStartIndex = Math.max(steps.length - finalPhaseStepCount, 0);
    const finalPhaseDuration = steps
      .slice(finalPhaseStartIndex)
      .reduce((sum, step) => sum + step.estimatedDuration, 0);
    const minimumElapsed = Math.max(0, totalDuration - finalPhaseDuration);

    if (completionRequestedRef.current) {
      const base = minimumElapsed;
      const latest = actualElapsedRef.current;
      startTimeRef.current = Date.now() - (latest >= base ? latest : base);
    } else {
      const latest = actualElapsedRef.current;
      startTimeRef.current = Date.now() - (latest >= minimumElapsed ? latest : 0);
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const completionRequested = completionRequestedRef.current;

      const latestActual = actualElapsedRef.current;
      const effectiveElapsed = completionRequested ? elapsed : Math.max(elapsed, latestActual);
      const progressPercent =
        totalDuration > 0 ? Math.min(100, (effectiveElapsed / totalDuration) * 100) : 0;

      const baseRemaining = Math.max(0, minimumElapsed - effectiveElapsed);
      const remainingDuration = completionRequested
        ? Math.max(0, totalDuration - effectiveElapsed)
        : baseRemaining + finalPhaseDuration;

      let cumulativeDuration = 0;
      let stepIndex = steps.length - 1;

      for (let i = 0; i < steps.length; i++) {
        if (!completionRequested && i >= finalPhaseStartIndex) {
          stepIndex = Math.max(finalPhaseStartIndex - 1, 0);
          break;
        }

        cumulativeDuration += steps[i].estimatedDuration;

        if (effectiveElapsed < cumulativeDuration) {
          stepIndex = i;
          break;
        }

        stepIndex = Math.min(i + 1, steps.length - 1);
      }

      setState({
        progress: progressPercent,
        currentStep: stepIndex,
        timeRemaining: remainingDuration / 1000,
      });

      if (completionRequested && progressPercent >= 100) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete?.();
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, totalDuration, onComplete, steps]);

  const complete = useCallback(
    (elapsedMs?: number) => {
      if (typeof elapsedMs === "number") {
        actualElapsedRef.current = elapsedMs;
      }

      const finalPhaseStepCount = Math.min(2, steps.length);
      if (finalPhaseStepCount === 0) {
        onComplete?.();
        return;
      }

      const finalPhaseStartIndex = Math.max(steps.length - finalPhaseStepCount, 0);
      const finalPhaseDuration = steps
        .slice(finalPhaseStartIndex)
        .reduce((sum, step) => sum + step.estimatedDuration, 0);

      const minimumElapsed = Math.max(0, totalDuration - finalPhaseDuration);
      const now = Date.now();
      const latest = actualElapsedRef.current;

      completionRequestedRef.current = true;
      startTimeRef.current = now - (latest >= minimumElapsed ? latest : minimumElapsed);

      const progressPercent =
        totalDuration > 0 ? Math.min(99, (minimumElapsed / totalDuration) * 100) : 100;

      setState({
        progress: progressPercent,
        currentStep: finalPhaseStartIndex,
        timeRemaining: finalPhaseDuration / 1000,
      });

      if (finalPhaseDuration === 0) {
        onComplete?.();
      }
    },
    [onComplete, steps, totalDuration],
  );

  return {
    progress: state.progress,
    currentStep: state.currentStep,
    timeRemaining: state.timeRemaining,
    reset,
    complete,
  };
}
