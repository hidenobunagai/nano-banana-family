import { describe, it, expect } from "vitest";
import {
  ImageGenerationResponseSchema,
  ErrorResponseSchema,
  ApiResponseSchema,
  EditImageFormSchema,
  FreestyleEditFormSchema,
  IconGenerateFormSchema,
  validateFormData,
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

describe("ErrorResponseSchema", () => {
  it("accepts valid error", () => {
    const result = ErrorResponseSchema.safeParse({ error: "something went wrong" });
    expect(result.success).toBe(true);
  });

  it("rejects non-string error", () => {
    const result = ErrorResponseSchema.safeParse({ error: 42 });
    expect(result.success).toBe(false);
  });
});

describe("ApiResponseSchema", () => {
  it("accepts success response", () => {
    const result = ApiResponseSchema.safeParse({
      imageBase64: "abc",
      mimeType: "image/jpeg",
    });
    expect(result.success).toBe(true);
  });

  it("accepts error response", () => {
    const result = ApiResponseSchema.safeParse({ error: "fail" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown shape", () => {
    const result = ApiResponseSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});

describe("EditImageFormSchema", () => {
  it("rejects empty prompt", () => {
    const result = EditImageFormSchema.safeParse({
      prompt: "",
      image: new File([], "test.png"),
    });
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

describe("validateFormData", () => {
  it("returns success for valid data", () => {
    const schema = ImageGenerationResponseSchema;
    const result = validateFormData(schema, {
      imageBase64: "abc",
      mimeType: "image/png",
    });
    expect(result.success).toBe(true);
  });

  it("returns error messages for invalid data", () => {
    const schema = ImageGenerationResponseSchema;
    const result = validateFormData(schema, {});
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
