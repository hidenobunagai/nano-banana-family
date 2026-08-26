/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResultPane } from "./ResultPane";

const defaultProps = {
  isSubmitting: false,
  steps: [{ id: "test", label: "テスト中", estimatedDuration: 1000 }],
  currentStep: 0,
  progress: 0,
  timeRemaining: 0,
  resultImage: null,
  emptyIcon: <span>icon</span>,
  emptyText: "結果がここに表示されます",
  history: { index: 0, total: 1, canBack: false, canForward: false },
  onBack: vi.fn(),
  onForward: vi.fn(),
  downloadFilename: "test.png",
  downloadLabel: "ダウンロード",
  onRetry: vi.fn(),
  retryLabel: "再試行",
  canRetry: true,
  onReset: vi.fn(),
};

describe("ResultPane", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when resultImage is null", () => {
    render(<ResultPane {...defaultProps} />);
    expect(screen.getByText("結果がここに表示されます")).toBeInTheDocument();
  });

  it("renders progress display when isSubmitting is true", () => {
    render(<ResultPane {...defaultProps} isSubmitting={true} progress={42} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getAllByText("テスト中").length).toBeGreaterThanOrEqual(1);
  });

  it("renders result image and action buttons", () => {
    render(
      <ResultPane {...defaultProps} resultImage="data:image/png;base64,QUJD">
        <img src="data:image/png;base64,QUJD" alt="結果画像" />
      </ResultPane>,
    );

    expect(screen.getByAltText("結果画像")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ダウンロード/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /画像をコピー/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /全画面で拡大/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /再試行/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /最初からやり直す/ })).toBeInTheDocument();
  });

  it("opens lightbox on expand click and closes on Escape", async () => {
    render(
      <ResultPane {...defaultProps} resultImage="data:image/png;base64,QUJD">
        <img src="data:image/png;base64,QUJD" alt="結果画像" />
      </ResultPane>,
    );

    expect(screen.queryByRole("dialog", { name: "生成画像の拡大表示" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "全画面で拡大" }));
    expect(screen.getByRole("dialog", { name: "生成画像の拡大表示" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "生成画像の拡大表示" })).not.toBeInTheDocument();
    });
  });

  it("copies image to clipboard on copy click", async () => {
    class FakeClipboardItem {
      constructor(public data: Record<string, Blob>) {}
    }
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);

    const clipboardWriteMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        write: clipboardWriteMock,
        writeText: vi.fn(),
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["data"], { type: "image/png" })),
      }),
    );

    render(
      <ResultPane {...defaultProps} resultImage="data:image/png;base64,QUJD">
        <img src="data:image/png;base64,QUJD" alt="結果画像" />
      </ResultPane>,
    );

    await userEvent.click(screen.getByRole("button", { name: /画像をコピー/ }));

    await waitFor(() => {
      expect(screen.getByText("コピー完了！")).toBeInTheDocument();
    });
  });
});
