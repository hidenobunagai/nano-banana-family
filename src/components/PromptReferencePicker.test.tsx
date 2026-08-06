import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptReferencePicker } from "./PromptReferencePicker";

describe("PromptReferencePicker", () => {
  it("selects a prompt and closes on click", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<PromptReferencePicker onSelect={onSelect} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /浮世絵フラッシュカード/ }));

    expect(onSelect).toHaveBeenCalledWith(
      "この画像を浮世絵スタイルのフラッシュカードに変換してください。",
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<PromptReferencePicker onSelect={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes via the close button", () => {
    const onClose = vi.fn();
    render(<PromptReferencePicker onSelect={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("filters prompts by search query", () => {
    render(<PromptReferencePicker onSelect={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("検索"), { target: { value: "座標" } });

    expect(screen.getByRole("button", { name: /座標から画像を生成/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /浮世絵フラッシュカード/ }),
    ).not.toBeInTheDocument();
  });

  it("toggles favorites from the prompt list", () => {
    render(<PromptReferencePicker onSelect={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "お気に入りに追加" })[0]);

    expect(screen.getByRole("button", { name: /お気に入り\(1\)/ })).toBeInTheDocument();
  });
});
