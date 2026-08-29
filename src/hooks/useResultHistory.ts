import { useCallback, useState } from "react";

/**
 * Bounded history of generated result images with navigation.
 * The current position is always the last item after a push.
 */
export function useResultHistory(maxItems: number) {
  const [state, setState] = useState<{ items: string[]; index: number }>({
    items: [],
    index: -1,
  });

  const pushResult = useCallback(
    (image: string) => {
      setState((prev) => {
        const nextItems = [...prev.items, image];
        const bounded =
          nextItems.length > maxItems ? nextItems.slice(nextItems.length - maxItems) : nextItems;
        return {
          items: bounded,
          index: bounded.length - 1,
        };
      });
    },
    [maxItems],
  );

  const navigateTo = useCallback((index: number) => {
    setState((prev) => {
      if (index < 0 || index >= prev.items.length) return prev;
      return { ...prev, index };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ items: [], index: -1 });
  }, []);

  return {
    history: state.items,
    historyIndex: state.index,
    pushResult,
    navigateTo,
    canGoBack: state.index > 0,
    canGoForward: state.index < state.items.length - 1,
    reset,
  };
}
