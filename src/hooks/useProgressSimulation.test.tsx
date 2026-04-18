import type { ProgressStep } from "@/components/ProgressDisplay";
import { act, createRef, forwardRef, useImperativeHandle, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { useProgressSimulation } from "./useProgressSimulation";

interface HarnessHandle {
  complete: () => void;
  getSnapshot: () => {
    completionCount: number;
    currentStep: number;
    isActive: boolean;
    progress: number;
  };
  start: () => void;
}

const TEST_STEPS: ProgressStep[] = [
  { id: "prepare", label: "準備", estimatedDuration: 100 },
  { id: "generate", label: "生成", estimatedDuration: 100 },
  { id: "complete", label: "完了", estimatedDuration: 100 },
];

const ProgressHarness = forwardRef<HarnessHandle>(function ProgressHarness(_, ref) {
  const [isActive, setIsActive] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);

  const { complete, currentStep, progress } = useProgressSimulation({
    isActive,
    onComplete: () => {
      setCompletionCount((prev) => prev + 1);
      setIsActive(false);
    },
    steps: TEST_STEPS,
  });

  useImperativeHandle(
    ref,
    () => ({
      complete: () => complete(),
      getSnapshot: () => ({
        completionCount,
        currentStep,
        isActive,
        progress,
      }),
      start: () => setIsActive(true),
    }),
    [complete, completionCount, currentStep, isActive, progress],
  );

  return null;
});

describe("useProgressSimulation", () => {
  let container: HTMLDivElement;
  let previousActEnvironment: boolean | undefined;
  let root: Root;
  let harnessRef: ReturnType<typeof createRef<HarnessHandle>>;

  beforeEach(() => {
    vi.useFakeTimers();
    previousActEnvironment = (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    harnessRef = createRef<HarnessHandle>();

    act(() => {
      root.render(<ProgressHarness ref={harnessRef} />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    vi.useRealTimers();
  });

  it("does not auto-complete a new run before complete is called again", () => {
    act(() => {
      harnessRef.current?.start();
    });

    act(() => {
      harnessRef.current?.complete();
      vi.advanceTimersByTime(250);
    });

    expect(harnessRef.current?.getSnapshot().completionCount).toBe(1);
    expect(harnessRef.current?.getSnapshot().isActive).toBe(false);

    act(() => {
      harnessRef.current?.start();
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(harnessRef.current?.getSnapshot().completionCount).toBe(1);
    expect(harnessRef.current?.getSnapshot().isActive).toBe(true);
    expect(harnessRef.current?.getSnapshot().currentStep).toBe(0);
  });
});
