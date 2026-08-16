import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useRecentPrompts } from "./useRecentPrompts";

const STORAGE_KEY = "test-recent-prompts";

describe("useRecentPrompts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useRecentPrompts(STORAGE_KEY, 6));
    expect(result.current.recentPrompts).toEqual([]);
  });

  it("pushes prompts to the top and persists to localStorage", () => {
    const { result } = renderHook(() => useRecentPrompts(STORAGE_KEY, 6));

    act(() => result.current.pushRecent("first prompt"));
    act(() => result.current.pushRecent("second prompt"));

    expect(result.current.recentPrompts).toEqual(["second prompt", "first prompt"]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([
      "second prompt",
      "first prompt",
    ]);
  });

  it("trims whitespace and ignores empty prompts", () => {
    const { result } = renderHook(() => useRecentPrompts(STORAGE_KEY, 6));

    act(() => result.current.pushRecent("  padded  "));
    act(() => result.current.pushRecent("   "));

    expect(result.current.recentPrompts).toEqual(["padded"]);
  });

  it("deduplicates prompts, keeping the newest position", () => {
    const { result } = renderHook(() => useRecentPrompts(STORAGE_KEY, 6));

    act(() => result.current.pushRecent("same"));
    act(() => result.current.pushRecent("other"));
    act(() => result.current.pushRecent("same"));

    expect(result.current.recentPrompts).toEqual(["same", "other"]);
  });

  it("caps the list at maxItems", () => {
    const { result } = renderHook(() => useRecentPrompts(STORAGE_KEY, 2));

    act(() => result.current.pushRecent("one"));
    act(() => result.current.pushRecent("two"));
    act(() => result.current.pushRecent("three"));

    expect(result.current.recentPrompts).toEqual(["three", "two"]);
  });

  it("loads, deduplicates, and caps stored prompts on mount", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["dup", "other", "dup", 42, "extra", "extra2"]),
    );

    const { result } = renderHook(() => useRecentPrompts(STORAGE_KEY, 3));

    expect(result.current.recentPrompts).toEqual(["dup", "other", "extra"]);
  });

  it("recovers from corrupt stored JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    const { result } = renderHook(() => useRecentPrompts(STORAGE_KEY, 6));

    expect(result.current.recentPrompts).toEqual([]);
  });
});
