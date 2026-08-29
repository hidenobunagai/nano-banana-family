import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useResultHistory } from "./useResultHistory";

describe("useResultHistory", () => {
  it("pushes results and lands the index at the last item", () => {
    const { result } = renderHook(() => useResultHistory(4));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));

    expect(result.current.history).toEqual(["img1", "img2"]);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(false);
  });

  it("trims history beyond maxItems", () => {
    const { result } = renderHook(() => useResultHistory(2));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    act(() => result.current.pushResult("img3"));

    expect(result.current.history).toEqual(["img2", "img3"]);
    expect(result.current.historyIndex).toBe(1);
  });

  it("navigates back and forward within bounds", () => {
    const { result } = renderHook(() => useResultHistory(4));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    act(() => result.current.pushResult("img3"));

    act(() => result.current.navigateTo(1));
    expect(result.current.historyIndex).toBe(1);

    act(() => result.current.navigateTo(0));
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.canGoBack).toBe(false);

    act(() => result.current.navigateTo(1));
    expect(result.current.historyIndex).toBe(1);

    act(() => result.current.navigateTo(0));
    expect(result.current.historyIndex).toBe(0);
  });

  it("navigateTo jumps to a specific index and ignores out-of-bounds", () => {
    const { result } = renderHook(() => useResultHistory(4));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));

    act(() => result.current.navigateTo(0));
    expect(result.current.historyIndex).toBe(0);

    act(() => result.current.navigateTo(5));
    expect(result.current.historyIndex).toBe(0);
  });

  it("reset clears history and index", () => {
    const { result } = renderHook(() => useResultHistory(4));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.reset());

    expect(result.current.history).toEqual([]);
    expect(result.current.historyIndex).toBe(-1);
  });

  it("lands index at the newly pushed item even when previously viewing an older item", () => {
    const { result } = renderHook(() => useResultHistory(4));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    expect(result.current.historyIndex).toBe(1);

    // Navigate back to the first item
    act(() => result.current.navigateTo(0));
    expect(result.current.historyIndex).toBe(0);

    // Push a 3rd item
    act(() => result.current.pushResult("img3"));
    expect(result.current.history).toEqual(["img1", "img2", "img3"]);
    expect(result.current.historyIndex).toBe(2);
  });
});
