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

export function useProgressSimulation({
  isActive,
  onComplete,
  steps,
}: UseProgressSimulationProps): UseProgressSimulationReturn {
  const [state, setState] = useState<ProgressState>(INITIAL_STATE);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const completionRequestedRef = useRef(false);
  const actualElapsedRef = useRef(0);

  const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

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
    complete,
  };
}
