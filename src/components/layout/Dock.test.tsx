import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dock } from "./Dock";
import { NAV_ITEMS } from "@/types/nav";

describe("Dock", () => {
  it("renders all nav items", () => {
    render(<Dock currentMode="freestyle" onModeChange={vi.fn()} />);
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole("button", { name: item.label })).toBeInTheDocument();
    }
  });

  it("calls onModeChange with the clicked mode", async () => {
    const onModeChange = vi.fn();
    render(<Dock currentMode="freestyle" onModeChange={onModeChange} />);
    await userEvent.click(screen.getByRole("button", { name: "アイコン" }));
    expect(onModeChange).toHaveBeenCalledWith("icon");
  });

  it("calls onModeChange with the current mode when clicked again", async () => {
    const onModeChange = vi.fn();
    render(<Dock currentMode="icon" onModeChange={onModeChange} />);
    await userEvent.click(screen.getByRole("button", { name: "アイコン" }));
    expect(onModeChange).toHaveBeenCalledWith("icon");
  });
});
