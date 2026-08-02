import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * LocalStorage-backed list of recently used prompt strings.
 * Uses useSyncExternalStore so same-tab updates and cross-tab storage
 * events both refresh the snapshot without setState-in-effect.
 */

const EMPTY: readonly string[] = [];
const CACHE = new Map<string, string[]>();

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function parseStored(storageKey: string, maxItems: number): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(parsed.filter((item): item is string => typeof item === "string")),
    ].slice(0, maxItems);
  } catch {
    return [];
  }
}

function readStoredPrompts(storageKey: string, maxItems: number): string[] {
  const next = parseStored(storageKey, maxItems);
  const cached = CACHE.get(storageKey);
  if (cached && (cached === next || arraysEqual(cached, next))) return cached;
  CACHE.set(storageKey, next);
  return next;
}

export function useRecentPrompts(storageKey: string, maxItems: number): {
  recentPrompts: readonly string[];
  pushRecent: (text: string) => void;
  clearRecent: () => void;
} {
  const notifyRef = useRef<() => void>(() => {});

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      notifyRef.current = onStoreChange;
      const handleStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === storageKey) onStoreChange();
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    },
    [storageKey],
  );

  const getSnapshot = useCallback(
    () => readStoredPrompts(storageKey, maxItems),
    [storageKey, maxItems],
  );

  const recentPrompts = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY,
  );

  const pushRecent = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const current = CACHE.get(storageKey) ?? [];
      const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(
        0,
        maxItems,
      );
      CACHE.set(storageKey, next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      notifyRef.current();
    },
    [storageKey, maxItems],
  );

  const clearRecent = useCallback(() => {
    CACHE.set(storageKey, []);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
    notifyRef.current();
  }, [storageKey]);

  return { recentPrompts, pushRecent, clearRecent };
}
