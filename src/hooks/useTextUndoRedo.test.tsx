import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTextUndoRedo } from "./useTextUndoRedo";

describe("useTextUndoRedo", () => {
  it("tracks value through handleChange", () => {
    const { result } = renderHook(() => useTextUndoRedo(""));

    act(() => result.current.handleChange("hello"));

    expect(result.current.value).toBe("hello");
    expect(result.current.canUndo).toBe(true);
  });

  it("undoes and redoes changes", () => {
    const { result } = renderHook(() => useTextUndoRedo(""));

    act(() => result.current.handleChange("a"));
    act(() => result.current.handleChange("ab"));
    expect(result.current.value).toBe("ab");

    act(() => result.current.undo());
    expect(result.current.value).toBe("a");
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.value).toBe("");
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    expect(result.current.value).toBe("a");

    act(() => result.current.redo());
    expect(result.current.value).toBe("ab");
    expect(result.current.canRedo).toBe(false);
  });

  it("clears redo stack when a new change is made after undo", () => {
    const { result } = renderHook(() => useTextUndoRedo(""));

    act(() => result.current.handleChange("a"));
    act(() => result.current.handleChange("ab"));
    act(() => result.current.undo());
    act(() => result.current.handleChange("ac"));

    expect(result.current.value).toBe("ac");
    expect(result.current.canRedo).toBe(false);
  });

  it("clearStacks resets undo/redo without touching the value", () => {
    const { result } = renderHook(() => useTextUndoRedo(""));

    act(() => result.current.handleChange("a"));
    act(() => result.current.clearStacks());

    expect(result.current.value).toBe("a");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("reset restores the initial value and clears stacks", () => {
    const { result } = renderHook(() => useTextUndoRedo("initial"));

    act(() => result.current.handleChange("changed"));
    act(() => result.current.reset());

    expect(result.current.value).toBe("initial");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
