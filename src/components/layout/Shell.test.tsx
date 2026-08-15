import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Shell } from "./Shell";
import { NAV_ITEMS } from "@/types/nav";

describe("Shell", () => {
  it("renders children", () => {
    render(
      <Shell onSignOut={vi.fn()} navMode="freestyle" onNavModeChange={vi.fn()}>
        <p>content</p>
      </Shell>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders all nav items", () => {
    render(
      <Shell onSignOut={vi.fn()} navMode="freestyle" onNavModeChange={vi.fn()}>
        <p>content</p>
      </Shell>,
    );
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole("button", { name: item.label })).toBeInTheDocument();
    }
  });

  it("calls onNavModeChange when a nav item is clicked", async () => {
    const onNavModeChange = vi.fn();
    render(
      <Shell onSignOut={vi.fn()} navMode="freestyle" onNavModeChange={onNavModeChange}>
        <p>content</p>
      </Shell>,
    );
    await userEvent.click(screen.getByRole("button", { name: "アイコン" }));
    expect(onNavModeChange).toHaveBeenCalledWith("icon");
  });

  it("calls onSignOut when the sign-out button is clicked", async () => {
    const onSignOut = vi.fn();
    render(
      <Shell onSignOut={onSignOut} navMode="freestyle" onNavModeChange={vi.fn()}>
        <p>content</p>
      </Shell>,
    );
    await userEvent.click(screen.getByRole("button", { name: /サインアウト/ }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
