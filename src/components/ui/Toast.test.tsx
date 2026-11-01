import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success("成功しました", 50)}>成功トースト</button>
      <button onClick={() => toast.info("情報メッセージ")}>情報トースト</button>
      <button onClick={() => toast.error("エラーが発生しました")}>エラートースト</button>
    </div>
  );
}

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("Toast", () => {
  it("does not throw when useToast is used outside provider", () => {
    expect(() => render(<TestConsumer />)).not.toThrow();
  });

  it("shows success toast and auto-dismisses after timeout", async () => {
    renderWithToast(<TestConsumer />);

    fireEvent.click(screen.getByText("成功トースト"));
    expect(screen.getByText("成功しました")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText("成功しました")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("dismisses toast when close button is clicked", async () => {
    renderWithToast(<TestConsumer />);

    fireEvent.click(screen.getByText("情報トースト"));
    expect(screen.getByText("情報メッセージ")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "閉じる" });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("情報メッセージ")).not.toBeInTheDocument();
    });
  });

  it("announces toasts through a single live region", () => {
    renderWithToast(<TestConsumer />);

    fireEvent.click(screen.getByText("エラートースト"));
    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toContainElement(screen.getByText("エラーが発生しました"));
    // One live mechanism only: no nested live regions and no per-toast roles.
    expect(liveRegion?.querySelectorAll("[aria-live]")).toHaveLength(0);
    expect(liveRegion?.querySelectorAll("[role]")).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("cancels the auto-dismiss timer when a toast is dismissed manually", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const before = vi.getTimerCount();
      renderWithToast(<TestConsumer />);

      fireEvent.click(screen.getByText("情報トースト"));
      expect(screen.getByText("情報メッセージ")).toBeInTheDocument();
      expect(vi.getTimerCount()).toBe(before + 1);

      fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
      expect(vi.getTimerCount()).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels the pending timers when the provider unmounts", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const before = vi.getTimerCount();
      const { unmount } = renderWithToast(<TestConsumer />);

      fireEvent.click(screen.getByText("情報トースト"));
      expect(screen.getByText("情報メッセージ")).toBeInTheDocument();
      expect(vi.getTimerCount()).toBe(before + 1);

      unmount();
      expect(vi.getTimerCount()).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});
