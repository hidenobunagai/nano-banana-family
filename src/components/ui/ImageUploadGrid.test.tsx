import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageUploadGrid } from "./ImageUploadGrid";
import type { UploadSlot } from "@/hooks/useUploadSlots";

describe("ImageUploadGrid", () => {
  const sampleSlots: UploadSlot[] = [
    { id: "slot-1", file: null, previewUrl: null },
    { id: "slot-2", file: null, previewUrl: null },
  ];

  it("renders upload slots and add button when under max limit", () => {
    const handleFileChange = vi.fn();
    const handleRemoveSlot = vi.fn();
    const handleAddSlot = vi.fn();

    render(
      <ImageUploadGrid
        uploads={sampleSlots}
        maxUploads={4}
        onFileChange={handleFileChange}
        onRemoveSlot={handleRemoveSlot}
        onAddSlot={handleAddSlot}
      />,
    );

    expect(screen.getByText("参考画像 1")).toBeInTheDocument();
    expect(screen.getByText("参考画像 2")).toBeInTheDocument();
    expect(screen.getByText("画像を追加（あと 2 枚）")).toBeInTheDocument();
  });

  it("calls onAddSlot when add button is clicked", () => {
    const handleAddSlot = vi.fn();
    render(
      <ImageUploadGrid
        uploads={sampleSlots}
        maxUploads={4}
        onFileChange={vi.fn()}
        onRemoveSlot={vi.fn()}
        onAddSlot={handleAddSlot}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /画像を追加/ }));
    expect(handleAddSlot).toHaveBeenCalledTimes(1);
  });

  it("calls onRemoveSlot when delete button is clicked on a multi-slot list", () => {
    const handleRemoveSlot = vi.fn();
    render(
      <ImageUploadGrid
        uploads={sampleSlots}
        maxUploads={4}
        onFileChange={vi.fn()}
        onRemoveSlot={handleRemoveSlot}
        onAddSlot={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "参考画像 1 を削除" }));
    expect(handleRemoveSlot).toHaveBeenCalledWith("slot-1");
  });

  it("hides add button when max uploads limit is reached", () => {
    render(
      <ImageUploadGrid
        uploads={sampleSlots}
        maxUploads={2}
        onFileChange={vi.fn()}
        onRemoveSlot={vi.fn()}
        onAddSlot={vi.fn()}
      />,
    );

    expect(screen.queryByText(/画像を追加/)).not.toBeInTheDocument();
  });
});
