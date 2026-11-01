import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptReferencePicker } from "./PromptReferencePicker";

describe("PromptReferencePicker", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });
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

  it("restores the previous body overflow when it closes", () => {
    document.body.style.overflow = "auto";

    const { rerender, unmount } = render(
      <PromptReferencePicker onSelect={vi.fn()} onClose={vi.fn()} />,
    );
    expect(document.body.style.overflow).toBe("hidden");

    // A parent re-render with a new inline handler must not re-run the effect:
    // it would capture the already hidden overflow as the value to restore.
    rerender(<PromptReferencePicker onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("uses the inverse text color for the active category count", () => {
    render(<PromptReferencePicker onSelect={vi.fn()} onClose={vi.fn()} />);

    const activeTab = screen
      .getAllByRole("tab")
      .find((tab) => tab.getAttribute("aria-selected") === "true");
    const count = activeTab?.querySelector("span");

    expect(count?.className).toContain("text-[var(--color-text-inverse)]");
  });
});
