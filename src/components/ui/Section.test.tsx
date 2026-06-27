import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Section } from "./Section";

describe("Section", () => {
  it("renders children", () => {
    render(<Section><p>content</p></Section>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<Section title="My Title">body</Section>);
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("renders without title", () => {
    const { container } = render(<Section>no title</Section>);
    expect(container.querySelector("h3")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Section className="extra-class">content</Section>);
    expect(container.firstChild).toHaveClass("extra-class");
  });
});
