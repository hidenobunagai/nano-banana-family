import { describe, it, expect } from "vitest";
import { appendPromptTag } from "./promptText";

describe("appendPromptTag", () => {
  it("returns the tag alone when the prompt is empty", () => {
    expect(appendPromptTag("", "tag")).toBe("tag");
  });

  it("returns the tag alone when the prompt is whitespace-only", () => {
    expect(appendPromptTag("   ", "tag")).toBe("tag");
    expect(appendPromptTag("\t\n", "tag")).toBe("tag");
  });

  it("joins a non-empty prompt and tag with a Japanese comma", () => {
    expect(appendPromptTag("prompt", "tag")).toBe("prompt、tag");
  });

  it("trims surrounding whitespace from the prompt before joining", () => {
    expect(appendPromptTag("  prompt  ", "tag")).toBe("prompt、tag");
  });

  it("uses the full-width Japanese comma (U+3001) as separator instead of an ASCII comma", () => {
    const result = appendPromptTag("prompt", "tag");
    expect(result).toContain("、");
    expect(result).not.toContain(",");
    expect(result).toBe("prompt\u3001tag");
  });

  it("appends the tag verbatim, untrimmed and unmodified", () => {
    expect(appendPromptTag("prompt", "  tag  ")).toBe("prompt、  tag  ");
    expect(appendPromptTag("", "  tag  ")).toBe("  tag  ");
  });
});
