import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUndoRedoShortcuts } from "./useUndoRedoShortcuts";

function createTextarea(): HTMLTextAreaElement {
  const textarea = document.createElement("textarea");
  document.body.appendChild(textarea);
  return textarea;
}

function keydown(target: EventTarget, init: KeyboardEventInit): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { ...init, bubbles: true }));
}

describe("useUndoRedoShortcuts", () => {
  it("undoes with Cmd+Z while editing a textarea", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoRedoShortcuts(undo, redo));
    const textarea = createTextarea();

    keydown(textarea, { key: "z", metaKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).not.toHaveBeenCalled();
  });

  it("undoes with Ctrl+Z while editing a textarea", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoRedoShortcuts(undo, redo));
    const textarea = createTextarea();

    keydown(textarea, { key: "z", ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("redoes with Cmd+Shift+Z while editing a textarea", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoRedoShortcuts(undo, redo));
    const textarea = createTextarea();

    keydown(textarea, { key: "Z", metaKey: true, shiftKey: true });
    expect(redo).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
  });

  it("redoes with Ctrl+Y while editing a textarea", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoRedoShortcuts(undo, redo));
    const textarea = createTextarea();

    keydown(textarea, { key: "y", ctrlKey: true });
    expect(redo).toHaveBeenCalledTimes(1);
  });

  it("does not intercept shortcuts outside a textarea", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoRedoShortcuts(undo, redo));

    keydown(document.body, { key: "z", metaKey: true });
    keydown(document.body, { key: "Z", metaKey: true, shiftKey: true });
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
  });

  it("does not intercept plain z without modifiers", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useUndoRedoShortcuts(undo, redo));
    const textarea = createTextarea();

    keydown(textarea, { key: "z" });
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const { unmount } = renderHook(() => useUndoRedoShortcuts(undo, redo));
    const textarea = createTextarea();

    unmount();
    keydown(textarea, { key: "z", metaKey: true });
    expect(undo).not.toHaveBeenCalled();
  });
});
