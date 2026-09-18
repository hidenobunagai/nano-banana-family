import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { GalleryModal } from "./GalleryModal";
import * as storage from "@/utils/galleryStorage";

const galleryItem = {
  id: "art-1",
  createdAt: Date.now(),
  mode: "freestyle" as const,
  prompt: "海賊風のポスター",
  imageBase64: "QUJD",
  mimeType: "image/png",
};

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("GalleryModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when no items in gallery", async () => {
    vi.spyOn(storage, "loadFromGallery").mockResolvedValue([]);

    await act(async () => {
      render(<GalleryModal isOpen={true} onClose={vi.fn()} />);
    });

    expect(await screen.findByText("まだ保存された画像がありません")).toBeInTheDocument();
  });

  it("renders gallery items and allows viewing detail", async () => {
    vi.spyOn(storage, "loadFromGallery").mockResolvedValue([
      {
        id: "art-1",
        createdAt: Date.now(),
        mode: "freestyle",
        prompt: "海賊風のポスター",
        imageBase64: "QUJD",
        mimeType: "image/png",
      },
    ]);

    await act(async () => {
      render(<GalleryModal isOpen={true} onClose={vi.fn()} />);
    });

    expect(await screen.findByText("自由生成")).toBeInTheDocument();
    expect(screen.getByText("作品ギャラリー (1件)")).toBeInTheDocument();

    // Click item to view detail
    await act(async () => {
      fireEvent.click(screen.getByAltText("海賊風のポスター"));
    });
    expect(screen.getByRole("link", { name: "ダウンロード" })).toBeInTheDocument();
  });

  it("calls onClose on close button click", async () => {
    const handleClose = vi.fn();
    vi.spyOn(storage, "loadFromGallery").mockResolvedValue([]);

    await act(async () => {
      render(<GalleryModal isOpen={true} onClose={handleClose} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("reports a failed load instead of staying on the loading state", async () => {
    vi.spyOn(storage, "loadFromGallery").mockRejectedValue(
      new DOMException("UnknownError", "UnknownError"),
    );

    await act(async () => {
      renderWithToast(<GalleryModal isOpen={true} onClose={vi.fn()} />);
    });

    expect(await screen.findByText("ギャラリーを読み込めませんでした")).toBeInTheDocument();
    expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    expect(screen.getByText("まだ保存された画像がありません")).toBeInTheDocument();
  });

  it("removes an item on a successful delete without reloading the gallery", async () => {
    const loadSpy = vi.spyOn(storage, "loadFromGallery").mockResolvedValue([galleryItem]);
    vi.spyOn(storage, "deleteFromGallery").mockResolvedValue(true);

    await act(async () => {
      renderWithToast(<GalleryModal isOpen={true} onClose={vi.fn()} />);
    });
    expect(await screen.findByText("自由生成")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "削除" }));
    });

    expect(await screen.findByText("ギャラリーから削除しました")).toBeInTheDocument();
    expect(screen.queryByText("自由生成")).not.toBeInTheDocument();
    // Showing a toast must not re-run the load effect: that would steal focus back
    // to the close button and re-read the store after every toast.
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  describe("delete failure", () => {
    it("reports a rejected delete and keeps the item", async () => {
      vi.spyOn(storage, "loadFromGallery").mockResolvedValue([galleryItem]);
      vi.spyOn(storage, "deleteFromGallery").mockRejectedValue(
        new DOMException("UnknownError", "UnknownError"),
      );

      await act(async () => {
        renderWithToast(<GalleryModal isOpen={true} onClose={vi.fn()} />);
      });
      expect(await screen.findByText("自由生成")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "削除" }));
      });

      expect(await screen.findByText("削除できませんでした")).toBeInTheDocument();
      expect(screen.getByText("自由生成")).toBeInTheDocument();
      expect(screen.queryByText("ギャラリーから削除しました")).not.toBeInTheDocument();
    });

    it("reports a false delete result and keeps the item", async () => {
      vi.spyOn(storage, "loadFromGallery").mockResolvedValue([galleryItem]);
      vi.spyOn(storage, "deleteFromGallery").mockResolvedValue(false);

      await act(async () => {
        renderWithToast(<GalleryModal isOpen={true} onClose={vi.fn()} />);
      });
      expect(await screen.findByText("自由生成")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "削除" }));
      });

      expect(await screen.findByText("削除できませんでした")).toBeInTheDocument();
      expect(screen.getByText("自由生成")).toBeInTheDocument();
    });
  });
});
