import { useCallback, useState } from "react";

/**
 * Bounded history of generated result images with navigation.
 * The current position is always the last item after a push.
 */
export function useResultHistory(maxItems: number) {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushResult = useCallback(
    (image: string) => {
      setHistory((prev) => {
        const next = [...prev, image];
        return next.length > maxItems ? next.slice(next.length - maxItems) : next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, maxItems - 1));
    },
    [maxItems],
  );

  const navigateTo = useCallback(
    (index: number) => {
      setHistoryIndex((prev) => {
        if (index < 0 || index >= history.length) return prev;
        return index;
      });
    },
    [history.length],
  );

  const reset = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    historyIndex,
    pushResult,
    navigateTo,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
    reset,
  };
}
