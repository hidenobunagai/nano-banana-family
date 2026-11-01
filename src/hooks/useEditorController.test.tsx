import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorController } from "./useEditorController";
import type { ProgressStep } from "@/components/ProgressDisplay";

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
});
