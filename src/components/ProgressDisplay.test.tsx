import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressDisplay, type ProgressStep } from "./ProgressDisplay";

const sampleSteps: ProgressStep[] = [
  { id: "analyze", label: "画像を解析中", estimatedDuration: 2000 },
  { id: "generate", label: "画像を生成中", estimatedDuration: 4000 },
  { id: "finalize", label: "最終調整中", estimatedDuration: 1000 },
];

describe("ProgressDisplay", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <ProgressDisplay isVisible={false} currentStep={0} progress={0} steps={sampleSteps} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders progress percentage when visible", () => {
    render(
      <ProgressDisplay isVisible={true} currentStep={0} progress={25} steps={sampleSteps} />,
    );
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("shows current step label", () => {
    render(
      <ProgressDisplay isVisible={true} currentStep={0} progress={25} steps={sampleSteps} />,
    );
    const labels = screen.getAllByText("画像を解析中");
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows custom title", () => {
    render(
      <ProgressDisplay
        isVisible={true}
        currentStep={0}
        progress={50}
        steps={sampleSteps}
        title="Custom Title"
      />,
    );
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });

  it("shows time remaining", () => {
    render(
      <ProgressDisplay
        isVisible={true}
        currentStep={0}
        progress={50}
        steps={sampleSteps}
        timeRemaining={7.2}
      />,
    );
    expect(screen.getByText("残り約 8 秒")).toBeInTheDocument();
  });

  it("renders all step labels", () => {
    render(
      <ProgressDisplay isVisible={true} currentStep={1} progress={60} steps={sampleSteps} />,
    );
    expect(screen.getAllByText("画像を解析中").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("画像を生成中").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("最終調整中").length).toBeGreaterThanOrEqual(1);
  });

  it("clamps time remaining to minimum of 1", () => {
    render(
      <ProgressDisplay
        isVisible={true}
        currentStep={0}
        progress={99}
        steps={sampleSteps}
        timeRemaining={0.3}
      />,
    );
    expect(screen.getByText("残り約 1 秒")).toBeInTheDocument();
  });
});
