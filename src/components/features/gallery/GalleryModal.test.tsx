import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GalleryModal } from "./GalleryModal";
import * as storage from "@/utils/galleryStorage";

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
});
