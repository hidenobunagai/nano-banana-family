import { describe, it, expect } from "vitest";
import { MAX_PROMPT_LENGTH } from "./promptConstants";

describe("MAX_PROMPT_LENGTH", () => {
  it("is a positive number", () => {
    expect(MAX_PROMPT_LENGTH).toBeGreaterThan(0);
  });

  it("is 1000", () => {
    expect(MAX_PROMPT_LENGTH).toBe(1000);
  });
});
