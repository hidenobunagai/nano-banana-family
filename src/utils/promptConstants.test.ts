import { describe, it, expect } from "vitest";
import {
  MAX_FREESTYLE_UPLOADS,
  MAX_ICON_UPLOADS,
  MAX_PROMPT_LENGTH,
  MAX_STORY_UPLOADS,
} from "./promptConstants";

describe("MAX_PROMPT_LENGTH", () => {
  it("is a positive number", () => {
    expect(MAX_PROMPT_LENGTH).toBeGreaterThan(0);
  });

  it("is 1000", () => {
    expect(MAX_PROMPT_LENGTH).toBe(1000);
  });
});

describe("upload limits", () => {
  it("keeps the values the two sides used to hardcode", () => {
    expect(MAX_FREESTYLE_UPLOADS).toBe(5);
    expect(MAX_ICON_UPLOADS).toBe(3);
    expect(MAX_STORY_UPLOADS).toBe(5);
  });

  it("stays a positive integer", () => {
    for (const limit of [MAX_FREESTYLE_UPLOADS, MAX_ICON_UPLOADS, MAX_STORY_UPLOADS]) {
      expect(Number.isInteger(limit)).toBe(true);
      expect(limit).toBeGreaterThan(0);
    }
  });
});
