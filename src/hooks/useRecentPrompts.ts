import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === storageKey) {
        setRecentPrompts(readStored(storageKey, maxItems));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey, maxItems]);

  const pushRecent = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setRecentPrompts((prev) => {
        const next = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, maxItems);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey, maxItems],
  );

  return { recentPrompts, pushRecent };
}
