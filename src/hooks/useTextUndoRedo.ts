import { useCallback, useRef, useState } from "react";

const MAX_STACK = 40;

/**
 * Text state with undo/redo stacks.
 * `handleChange` records the previous value before applying the new one;
 * `setValue` applies a value without recording history.
 */
export function useTextUndoRedo(initialValue: string = "") {
  const [value, setValue] = useState(initialValue);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  const syncCanUndoRedo = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const handleChange = useCallback(
    (next: string) => {
      undoStackRef.current.push(value);
      if (undoStackRef.current.length > MAX_STACK) undoStackRef.current.shift();
      redoStackRef.current = [];
      setValue(next);
      syncCanUndoRedo();
    },
    [value, syncCanUndoRedo],
  );

  const undo = useCallback(() => {
    if (!undoStackRef.current.length) return;
    const prev = undoStackRef.current.pop();
    if (typeof prev === "string") {
      redoStackRef.current.push(value);
      setValue(prev);
    }
    syncCanUndoRedo();
  }, [value, syncCanUndoRedo]);

  const redo = useCallback(() => {
    if (!redoStackRef.current.length) return;
    const next = redoStackRef.current.pop();
    if (typeof next === "string") {
      undoStackRef.current.push(value);
      setValue(next);
    }
    syncCanUndoRedo();
  }, [value, syncCanUndoRedo]);

  const clearStacks = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncCanUndoRedo();
  }, [syncCanUndoRedo]);

  const reset = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setValue(initialValue);
    syncCanUndoRedo();
  }, [initialValue, syncCanUndoRedo]);

  return {
    value,
    handleChange,
    undo,
    redo,
    canUndo,
    canRedo,
    clearStacks,
    reset,
  };
}
