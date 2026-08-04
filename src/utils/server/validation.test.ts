import { describe, it, expect } from "vitest";
import {
  ImageGenerationResponseSchema,
  FreestyleEditFormSchema,
  IconGenerateFormSchema,
} from "./validation";

describe("ImageGenerationResponseSchema", () => {
  it("accepts valid response", () => {
    const result = ImageGenerationResponseSchema.safeParse({
      imageBase64: "abc123",
      mimeType: "image/png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = ImageGenerationResponseSchema.safeParse({ imageBase64: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("FreestyleEditFormSchema", () => {
  it("accepts valid form", () => {
    const result = FreestyleEditFormSchema.safeParse({
      prompt: "make it blue",
      images: [new File(["a"], "img.png")],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty images", () => {
    const result = FreestyleEditFormSchema.safeParse({
      prompt: "edit",
      images: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many images", () => {
    const files = Array.from({ length: 6 }, (_, i) => new File([], `img${i}.png`));
    const result = FreestyleEditFormSchema.safeParse({
      prompt: "edit",
      images: files,
    });
    expect(result.success).toBe(false);
  });
});

describe("IconGenerateFormSchema", () => {
  it("accepts minimal valid form", () => {
    const result = IconGenerateFormSchema.safeParse({
      name: "John",
      images: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = IconGenerateFormSchema.safeParse({
      name: "",
      images: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many reference images", () => {
    const files = Array.from({ length: 4 }, (_, i) => new File([], `img${i}.png`));
    const result = IconGenerateFormSchema.safeParse({
      name: "John",
      images: files,
    });
    expect(result.success).toBe(false);
  });
});
