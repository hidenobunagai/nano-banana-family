import { useEffect } from "react";

/**
 * Keyboard shortcuts (Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
 * for redo) that only apply while editing a textarea or contenteditable.
 */
export function useUndoRedoShortcuts(undo: () => void, redo: () => void): void {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target &&
        (target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true");

      // Outside textareas/contenteditable (single-line inputs), let the
      // browser run its native undo instead of swallowing the key.
      if (!isEditing) return;

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        redo();
      } else if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        undo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo]);
}
