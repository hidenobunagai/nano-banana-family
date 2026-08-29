import { beforeEach, describe, expect, it } from "vitest";
import { deleteFromGallery, loadFromGallery, saveToGallery } from "./galleryStorage";

describe("galleryStorage", () => {
  beforeEach(async () => {
    const items = await loadFromGallery();
    for (const item of items) {
      await deleteFromGallery(item.id);
    }
  });

  it("saves, loads, and deletes artwork in gallery store", async () => {
    const saved = await saveToGallery({
      mode: "freestyle",
      prompt: "テストプロンプト",
      imageBase64: "QUJD",
      mimeType: "image/png",
    });

    expect(saved.id).toBeDefined();
    expect(saved.mode).toBe("freestyle");

    const items = await loadFromGallery();
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(saved.id);
    expect(items[0].prompt).toBe("テストプロンプト");

    const deleted = await deleteFromGallery(saved.id);
    expect(deleted).toBe(true);

    const itemsAfterDelete = await loadFromGallery();
    expect(itemsAfterDelete.length).toBe(0);
  });
});
