import type { ProgressStep } from "@/components/ProgressDisplay";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseProgressSimulationProps {
  isActive: boolean;
  onComplete?: () => void;
  steps: ProgressStep[];
}

export interface UseProgressSimulationReturn {
  progress: number;
  currentStep: number;
  timeRemaining: number;
  complete: (elapsedMs?: number) => void;
}

interface ProgressState {
  progress: number;
  currentStep: number;
  timeRemaining: number;
}

const INITIAL_STATE: ProgressState = { progress: 0, currentStep: 0, timeRemaining: 0 };

// ponytail: single 100ms interval ramping 0→90% while running, then to 100%
// after complete(). The old phase-pacing math (minimumElapsed, final-phase
// clamps, elapsed re-basing across restarts) added ~90 lines for the same
// visible behavior.
const RUN_CAP = 90;

export function useProgressSimulation({
  isActive,
  onComplete,
  steps,
}: UseProgressSimulationProps): UseProgressSimulationReturn {
  const [state, setState] = useState<ProgressState>(INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const completionRequestedRef = useRef(false);

  const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
      completionRequestedRef.current = false;
      // Deferred so the reset never triggers a synchronous setState-in-effect.
      const resetTimeout = setTimeout(() => {
        setState(INITIAL_STATE);
      }, 0);
      return () => clearTimeout(resetTimeout);
    }

    startedAtRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const done = completionRequestedRef.current;
      const progress =
        totalDuration > 0
          ? Math.min(done ? 100 : RUN_CAP, (elapsed / totalDuration) * 100)
          : 100;

      let cumulative = 0;
      let stepIndex = steps.length - 1;
      for (let i = 0; i < steps.length; i++) {
        cumulative += steps[i].estimatedDuration;
        if (elapsed < cumulative) {
          stepIndex = i;
          break;
        }
      }

      setState({
        progress,
        currentStep: done ? stepIndex : 0,
        timeRemaining: Math.max(0, (totalDuration - elapsed) / 1000),
      });

      if (done && progress >= 100) {
        if (intervalRef.current !== null) clearInterval(intervalRef.current);
        intervalRef.current = null;
        onComplete?.();
      }
    }, 100);

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [isActive, onComplete, steps, totalDuration]);

  const complete = useCallback(
    (elapsedMs?: number) => {
      // Re-base the clock so the remaining countdown is at most the final
      // phases: a slow fetch keeps its pace, a fast one still finishes.
      const finalPhaseStartIndex = Math.max(steps.length - 2, 0);
      const finalPhaseDuration = steps
        .slice(finalPhaseStartIndex)
        .reduce((sum, step) => sum + step.estimatedDuration, 0);
      const minimumElapsed = Math.max(0, totalDuration - finalPhaseDuration);

      completionRequestedRef.current = true;
      startedAtRef.current = Date.now() - Math.max(elapsedMs ?? 0, minimumElapsed);
    },
    [steps, totalDuration],
  );

  return {
    progress: state.progress,
    currentStep: state.currentStep,
    timeRemaining: state.timeRemaining,
    complete,
  };
}
