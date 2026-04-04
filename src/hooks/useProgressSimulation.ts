import { useCallback, useEffect, useRef, useReducer } from "react";
import { ProgressStep } from "@/components/ProgressDisplay";

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
}

export interface UseProgressSimulationReturn {
  progress: number;
  currentStep: number;
  timeRemaining: number;
  reset: () => void;
  complete: () => void;
}

interface ProgressState {
  progress: number;
  currentStep: number;
  timeRemaining: number;
}

type ProgressAction =
  | { type: "TICK"; payload: { progress: number; currentStep: number; timeRemaining: number } }
  | { type: "RESET" };

function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case "TICK":
      return action.payload;
    case "RESET":
      return { progress: 0, currentStep: 0, timeRemaining: 0 };
    default:
      return state;
  }
}

export function useProgressSimulation({
  isActive,
  onComplete,
  steps = PROGRESS_STEPS,
}: UseProgressSimulationProps): UseProgressSimulationReturn {
  const [state, dispatch] = useReducer(progressReducer, {
    progress: 0,
    currentStep: 0,
    timeRemaining: 0,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const completionRequestedRef = useRef(false);

  const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
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
      const resetTimeout = setTimeout(() => {
        dispatch({ type: "RESET" });
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
      startTimeRef.current = Date.now() - minimumElapsed;
    } else {
      startTimeRef.current = Date.now();
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const completionRequested = completionRequestedRef.current;

      const effectiveElapsed = completionRequested ? elapsed : Math.min(elapsed, minimumElapsed);
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

      dispatch({
        type: "TICK",
        payload: {
          progress: progressPercent,
          currentStep: stepIndex,
          timeRemaining: remainingDuration / 1000,
        },
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

  const complete = useCallback(() => {
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

    completionRequestedRef.current = true;
    startTimeRef.current = now - minimumElapsed;

    const progressPercent =
      totalDuration > 0 ? Math.min(99, (minimumElapsed / totalDuration) * 100) : 100;

    dispatch({
      type: "TICK",
      payload: {
        progress: progressPercent,
        currentStep: finalPhaseStartIndex,
        timeRemaining: finalPhaseDuration / 1000,
      },
    });

    if (finalPhaseDuration === 0) {
      onComplete?.();
    }
  }, [onComplete, steps, totalDuration]);

  return {
    progress: state.progress,
    currentStep: state.currentStep,
    timeRemaining: state.timeRemaining,
    reset,
    complete,
  };
}
