import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorController } from "./useEditorController";
import type { ProgressStep } from "@/components/ProgressDisplay";
import { saveToGallery, type GalleryItem } from "@/utils/galleryStorage";

vi.mock("@/utils/galleryStorage", () => ({
  saveToGallery: vi.fn(async () => ({ id: "art-1" })),
}));

vi.mock("@/utils/imageOptimization", () => ({
  resizeImage: vi.fn(async (file: File) => file),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
    info: vi.fn(),
    showToast: vi.fn(),
  }),
}));

const PROGRESS_STEPS: ProgressStep[] = [
  { id: "generate", label: "生成中...", estimatedDuration: 100 },
];

const OPTIONS = {
  recentStorageKey: "test-recent-prompts",
  progressSteps: PROGRESS_STEPS,
  maxUploads: 3,
  pasteToUpload: true,
  endpoint: "/api/test",
  errorFallback: "失敗しました",
  downloadPrefix: "test",
  validate: () => null,
  buildFormData: () => new FormData(),
};

/** jsdom has no clipboard API, so the paste event is built by hand. */
function dispatchPaste(files: File[], { alreadyHandled = false } = {}) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { files, types: files.length > 0 ? ["Files"] : [] },
  });
  if (alreadyHandled) event.preventDefault();
  window.dispatchEvent(event);
  return event;
}

function imageFile(name = "pasted.png") {
  return new File([new Uint8Array([1])], name, { type: "image/png" });
}

function mockFetchSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ imageBase64: "QUJD", mimeType: "image/png" }),
    })),
  );
}

describe("useEditorController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: vi.fn() });
  });

  describe("paste to upload", () => {
    it("adds a pasted image as an upload", async () => {
      const { result } = renderHook(() => useEditorController(OPTIONS));

      await act(async () => {
        dispatchPaste([imageFile()]);
      });

      expect(result.current.hasActiveFiles).toBe(true);
      expect(result.current.uploads[0].file?.name).toBe("pasted.png");
      expect(toastSuccess).toHaveBeenCalledWith("クリップボードの画像を参考画像に追加しました！");
    });

    it("ignores a paste that another handler already handled", async () => {
      const { result } = renderHook(() => useEditorController(OPTIONS));

      await act(async () => {
        dispatchPaste([imageFile()], { alreadyHandled: true });
      });

      expect(result.current.hasActiveFiles).toBe(false);
      expect(result.current.uploads).toHaveLength(0);
      expect(toastSuccess).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("scrolls the main content region to the top", () => {
      const container = document.createElement("div");
      container.id = "main-content";
      const scrollTo = vi.fn();
      container.scrollTo = scrollTo;
      document.body.appendChild(container);

      try {
        const { result } = renderHook(() =>
          useEditorController({ ...OPTIONS, scrollToTopOnReset: true }),
        );

        act(() => result.current.resetEditor());

        expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
      } finally {
        container.remove();
      }
    });

    it("does not scroll when the editor does not ask for it", () => {
      const container = document.createElement("div");
      container.id = "main-content";
      const scrollTo = vi.fn();
      container.scrollTo = scrollTo;
      document.body.appendChild(container);

      try {
        const { result } = renderHook(() => useEditorController(OPTIONS));

        act(() => result.current.resetEditor());

        expect(scrollTo).not.toHaveBeenCalled();
      } finally {
        container.remove();
      }
    });
  });

  describe("gallery", () => {
    const galleryOptions = {
      ...OPTIONS,
      galleryEntry: () => ({ mode: "freestyle" as const, prompt: "テストプロンプト" }),
    };

    it("saves the generated image to the gallery", async () => {
      mockFetchSuccess();
      vi.mocked(saveToGallery).mockResolvedValue({
        id: "art-1",
        createdAt: 1,
        mode: "freestyle",
        prompt: "テストプロンプト",
        imageBase64: "QUJD",
        mimeType: "image/png",
      } as GalleryItem);

      const { result } = renderHook(() => useEditorController(galleryOptions));

      await act(async () => {
        await result.current.submit();
      });

      expect(saveToGallery).toHaveBeenCalledWith({
        mode: "freestyle",
        prompt: "テストプロンプト",
        imageBase64: "QUJD",
        mimeType: "image/png",
      });
      expect(toastError).not.toHaveBeenCalled();
    });

    it("reports a failed gallery save", async () => {
      mockFetchSuccess();
      vi.mocked(saveToGallery).mockResolvedValue(null);

      const { result } = renderHook(() => useEditorController(galleryOptions));

      await act(async () => {
        await result.current.submit();
      });

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith("ギャラリーに保存できませんでした"),
      );
    });
  });
});
