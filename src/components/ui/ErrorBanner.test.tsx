import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("announces the error with the alert role", () => {
    render(
      <ErrorBanner
        message="生成に失敗しました"
        hint="短い指示文でお試しください"
        retryLabel="再試行"
        onRetry={vi.fn()}
        canRetry
        onReset={vi.fn()}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("生成に失敗しました");
    expect(alert).toHaveTextContent("短い指示文でお試しください");
  });
});
