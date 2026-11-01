import { useCallback, useEffect, useRef, useState } from "react";

/**
 * LocalStorage-backed list of recently used prompt strings.
 * Synced across tabs via the storage event.
 */

function readStored(storageKey: string, maxItems: number): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item): item is string => typeof item === "string"))].slice(
      0,
      maxItems,
    );
  } catch {
    return [];
  }
}

export function useRecentPrompts(
  storageKey: string,
  maxItems: number,
): {
  recentPrompts: readonly string[];
  pushRecent: (text: string) => void;
} {
  const [recentPrompts, setRecentPrompts] = useState<readonly string[]>(() =>
    readStored(storageKey, maxItems),
  );
  // Mirror of the state. The next list is computed from it outside the state
  // updater, because a state updater must stay pure.
  const recentPromptsRef = useRef(recentPrompts);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === storageKey) {
        const next = readStored(storageKey, maxItems);
        recentPromptsRef.current = next;
        setRecentPrompts(next);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey, maxItems]);

  const pushRecent = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // Both the next list and the storage write happen outside the state
      // updater: React may invoke an updater twice (StrictMode), and a side
      // effect inside it would run twice as well.
      const next = [trimmed, ...recentPromptsRef.current.filter((item) => item !== trimmed)].slice(
        0,
        maxItems,
      );
      recentPromptsRef.current = next;
      setRecentPrompts(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [storageKey, maxItems],
  );

  return { recentPrompts, pushRecent };
}
