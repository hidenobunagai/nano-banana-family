import { useCallback, useState } from "react";

/** Result images kept in the editor history. */
const MAX_HISTORY = 4;

interface UseResultHistoryOptions {
  /** How many result images to keep. Defaults to MAX_HISTORY. */
  maxItems?: number;
  /**
   * Called with the image now in view whenever navigation moves the index.
   * Editors use it to sync their displayed image and any comparison/scroll
   * behavior, so the index bookkeeping stays in one place.
   */
  onNavigate?: (image: string) => void;
}

/**
 * Bounded history of generated result images with navigation.
 * The current position is always the last item after a push.
 */
export function useResultHistory({
  maxItems = MAX_HISTORY,
  onNavigate,
}: UseResultHistoryOptions = {}) {
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

  const navigateTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= state.items.length) return;
      setState((prev) => {
        if (index < 0 || index >= prev.items.length) return prev;
        return { ...prev, index };
      });
      onNavigate?.(state.items[index]);
    },
    [onNavigate, state.items],
  );

  const goBack = useCallback(() => navigateTo(state.index - 1), [navigateTo, state.index]);
  const goForward = useCallback(() => navigateTo(state.index + 1), [navigateTo, state.index]);

  const reset = useCallback(() => {
    setState({ items: [], index: -1 });
  }, []);

  return {
    history: state.items,
    historyIndex: state.index,
    pushResult,
    navigateTo,
    goBack,
    goForward,
    canGoBack: state.index > 0,
    canGoForward: state.index < state.items.length - 1,
    reset,
  };
}
