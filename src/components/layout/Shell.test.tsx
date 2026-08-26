import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Shell } from "./Shell";
import { NAV_ITEMS } from "@/types/nav";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

describe("Shell", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
  });
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

  it("renders user profile when authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "家族ユーザー", email: "user@example.com", image: "https://example.com/avatar.jpg" },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(
      <Shell onSignOut={vi.fn()} navMode="freestyle" onNavModeChange={vi.fn()}>
        <p>content</p>
      </Shell>,
    );

    expect(screen.getByAltText("家族ユーザー")).toBeInTheDocument();
    expect(screen.getByText("家族ユーザー")).toBeInTheDocument();
  });
});
