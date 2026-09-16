import { describe, it, expect } from "vitest";
import {
  MAX_FREESTYLE_UPLOADS,
  MAX_ICON_UPLOADS,
  MAX_PROMPT_LENGTH,
  MAX_STORY_UPLOADS,
} from "@/utils/promptConstants";
import {
  ImageGenerationResponseSchema,
  FreestyleEditFormSchema,
  IconGenerateFormSchema,
  CreateStoryFormSchema,
} from "./validation";

function makeFiles(count: number, prefix = "img") {
  return Array.from({ length: count }, (_, i) => new File([], `${prefix}${i}.png`));
}

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
    const result = FreestyleEditFormSchema.safeParse({
      prompt: "edit",
      images: makeFiles(MAX_FREESTYLE_UPLOADS + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly the shared upload limit and rejects one more", () => {
    expect(
      FreestyleEditFormSchema.safeParse({
        prompt: "edit",
        images: makeFiles(MAX_FREESTYLE_UPLOADS),
      }).success,
    ).toBe(true);

    const tooMany = FreestyleEditFormSchema.safeParse({
      prompt: "edit",
      images: makeFiles(MAX_FREESTYLE_UPLOADS + 1),
    });
    expect(tooMany.success).toBe(false);
    expect(JSON.stringify(tooMany.error?.issues)).toContain(
      `画像は最大${MAX_FREESTYLE_UPLOADS}枚までアップロードできます`,
    );
  });

  it("rejects prompts longer than the client limit", () => {
    const result = FreestyleEditFormSchema.safeParse({
      prompt: "a".repeat(MAX_PROMPT_LENGTH + 1),
      images: [new File(["a"], "img.png")],
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
    const result = IconGenerateFormSchema.safeParse({
      name: "John",
      images: makeFiles(MAX_ICON_UPLOADS + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly the shared upload limit and rejects one more", () => {
    expect(
      IconGenerateFormSchema.safeParse({
        name: "John",
        images: makeFiles(MAX_ICON_UPLOADS),
      }).success,
    ).toBe(true);

    const tooMany = IconGenerateFormSchema.safeParse({
      name: "John",
      images: makeFiles(MAX_ICON_UPLOADS + 1),
    });
    expect(tooMany.success).toBe(false);
    expect(JSON.stringify(tooMany.error?.issues)).toContain(
      `画像は最大${MAX_ICON_UPLOADS}枚までアップロードできます`,
    );
  });

  it("rejects custom prompts longer than the client limit", () => {
    const result = IconGenerateFormSchema.safeParse({
      name: "John",
      customPrompt: "a".repeat(MAX_PROMPT_LENGTH + 1),
      images: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateStoryFormSchema", () => {
  it("accepts exactly the shared upload limit and rejects one more", () => {
    expect(
      CreateStoryFormSchema.safeParse({
        images: makeFiles(MAX_STORY_UPLOADS, "photo"),
      }).success,
    ).toBe(true);

    const tooMany = CreateStoryFormSchema.safeParse({
      images: makeFiles(MAX_STORY_UPLOADS + 1, "photo"),
    });
    expect(tooMany.success).toBe(false);
    expect(JSON.stringify(tooMany.error?.issues)).toContain(
      `写真は最大${MAX_STORY_UPLOADS}枚までアップロードできます`,
    );
  });
});
