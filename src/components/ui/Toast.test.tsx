import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
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
  it("throws error when useToast is used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow("useToast must be used within a ToastProvider");
    consoleSpy.mockRestore();
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

  it("renders error toast with alert role", () => {
    renderWithToast(<TestConsumer />);

    fireEvent.click(screen.getByText("エラートースト"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
  });
});
