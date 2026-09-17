import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useResultHistory } from "./useResultHistory";

describe("useResultHistory", () => {
  it("pushes results and lands the index at the last item", () => {
    const { result } = renderHook(() => useResultHistory({ maxItems: 4 }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));

    expect(result.current.history).toEqual(["img1", "img2"]);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(false);
  });

  it("keeps four items by default, matching the editor history size", () => {
    const { result } = renderHook(() => useResultHistory());

    act(() => {
      ["img1", "img2", "img3", "img4", "img5"].forEach((image) => result.current.pushResult(image));
    });

    expect(result.current.history).toEqual(["img2", "img3", "img4", "img5"]);
    expect(result.current.historyIndex).toBe(3);
  });

  it("trims history beyond maxItems", () => {
    const { result } = renderHook(() => useResultHistory({ maxItems: 2 }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    act(() => result.current.pushResult("img3"));

    expect(result.current.history).toEqual(["img2", "img3"]);
    expect(result.current.historyIndex).toBe(1);
  });

  it("navigates back and forward within bounds", () => {
    const { result } = renderHook(() => useResultHistory({ maxItems: 4 }));

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
    const { result } = renderHook(() => useResultHistory({ maxItems: 4 }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));

    act(() => result.current.navigateTo(0));
    expect(result.current.historyIndex).toBe(0);

    act(() => result.current.navigateTo(5));
    expect(result.current.historyIndex).toBe(0);
  });

  it("goBack and goForward step the index and stop at the ends", () => {
    const { result } = renderHook(() => useResultHistory({ maxItems: 4 }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    act(() => result.current.pushResult("img3"));
    expect(result.current.canGoForward).toBe(false);

    act(() => result.current.goBack());
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(true);

    act(() => result.current.goBack());
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.canGoBack).toBe(false);

    // At the oldest item an extra goBack is a no-op, not an index of -1.
    act(() => result.current.goBack());
    expect(result.current.historyIndex).toBe(0);

    act(() => result.current.goForward());
    expect(result.current.historyIndex).toBe(1);

    act(() => result.current.goForward());
    expect(result.current.historyIndex).toBe(2);
    expect(result.current.canGoForward).toBe(false);

    // At the newest item an extra goForward is a no-op.
    act(() => result.current.goForward());
    expect(result.current.historyIndex).toBe(2);
  });

  it("goBack and goForward with an empty history keep the index at -1", () => {
    const { result } = renderHook(() => useResultHistory());

    act(() => result.current.goBack());
    expect(result.current.historyIndex).toBe(-1);

    act(() => result.current.goForward());
    expect(result.current.historyIndex).toBe(-1);
  });

  it("reports the image in view to onNavigate on each move", () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useResultHistory({ maxItems: 4, onNavigate }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    act(() => result.current.pushResult("img3"));
    // Pushing a result follows the newest item, so no caller sync is needed.
    expect(onNavigate).not.toHaveBeenCalled();

    act(() => result.current.goBack());
    expect(onNavigate).toHaveBeenLastCalledWith("img2");

    act(() => result.current.goBack());
    expect(onNavigate).toHaveBeenLastCalledWith("img1");

    act(() => result.current.goForward());
    expect(onNavigate).toHaveBeenLastCalledWith("img2");

    act(() => result.current.navigateTo(2));
    expect(onNavigate).toHaveBeenLastCalledWith("img3");
    expect(onNavigate).toHaveBeenCalledTimes(4);
  });

  it("does not call onNavigate when the target index is out of bounds", () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useResultHistory({ maxItems: 4, onNavigate }));

    act(() => result.current.pushResult("img1"));

    act(() => result.current.navigateTo(3));
    act(() => result.current.goForward());
    expect(onNavigate).not.toHaveBeenCalled();

    act(() => result.current.goBack());
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("reset clears history and index", () => {
    const { result } = renderHook(() => useResultHistory({ maxItems: 4 }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.reset());

    expect(result.current.history).toEqual([]);
    expect(result.current.historyIndex).toBe(-1);
  });

  it("lands index at the newly pushed item even when previously viewing an older item", () => {
    const { result } = renderHook(() => useResultHistory({ maxItems: 4 }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    expect(result.current.historyIndex).toBe(1);

    // Navigate back to the first item
    act(() => result.current.navigateTo(0));
    expect(result.current.historyIndex).toBe(0);

    // Push a 3rd item: the abandoned img2 is gone, so img3 follows img1.
    act(() => result.current.pushResult("img3"));
    expect(result.current.history).toEqual(["img1", "img3"]);
    expect(result.current.historyIndex).toBe(1);
  });

  it("drops the forward entries when a result is pushed after navigating back", () => {
    const { result } = renderHook(() => useResultHistory({ maxItems: 4 }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    act(() => result.current.pushResult("img3"));

    act(() => result.current.goBack());
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canGoForward).toBe(true);

    // Regenerating here replaces the future: img3 was superseded, so "next
    // result" must not step into it.
    act(() => result.current.pushResult("img4"));
    expect(result.current.history).toEqual(["img1", "img2", "img4"]);
    expect(result.current.historyIndex).toBe(2);
    expect(result.current.canGoForward).toBe(false);

    // Stepping back still reaches the two kept entries, and forward returns to
    // the new result instead of the replaced one.
    act(() => result.current.goBack());
    expect(result.current.historyIndex).toBe(1);
    act(() => result.current.goBack());
    expect(result.current.historyIndex).toBe(0);
    act(() => result.current.goForward());
    act(() => result.current.goForward());
    expect(result.current.historyIndex).toBe(2);
    expect(result.current.canGoForward).toBe(false);
  });

  it("keeps the newest maxItems results when pushing truncates the future", () => {
    const { result } = renderHook(() => useResultHistory({ maxItems: 2 }));

    act(() => result.current.pushResult("img1"));
    act(() => result.current.pushResult("img2"));
    act(() => result.current.goBack());

    act(() => result.current.pushResult("img3"));
    expect(result.current.history).toEqual(["img1", "img3"]);
    expect(result.current.historyIndex).toBe(1);

    // The bound still applies to the truncated list.
    act(() => result.current.pushResult("img4"));
    expect(result.current.history).toEqual(["img3", "img4"]);
    expect(result.current.historyIndex).toBe(1);
  });
});
