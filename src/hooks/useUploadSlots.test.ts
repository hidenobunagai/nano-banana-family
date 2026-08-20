import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUploadSlots } from "./useUploadSlots";

vi.mock("@/utils/imageOptimization", () => ({
  resizeImage: vi.fn(async (file: File) => file),
}));

describe("useUploadSlots", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: vi.fn() });
  });

  function makeFile(name = "test.png") {
    return new File([new Uint8Array([1])], name, { type: "image/png" });
  }

  it("creates the requested number of initial slots", () => {
    const { result } = renderHook(() => useUploadSlots({ maxSlots: 5, initialSlots: 2 }));

    expect(result.current.uploads).toHaveLength(2);
    expect(result.current.activeUploads).toHaveLength(0);
  });

  it("adds slots up to the max", () => {
    const { result } = renderHook(() => useUploadSlots({ maxSlots: 2 }));

    act(() => result.current.addUploadSlot());
    act(() => result.current.addUploadSlot());

    expect(result.current.uploads).toHaveLength(2);

    act(() => result.current.addUploadSlot());

    expect(result.current.uploads).toHaveLength(2);
  });

  it("removes a slot and revokes its preview URL", () => {
    const { result } = renderHook(() => useUploadSlots({ maxSlots: 3, initialSlots: 1 }));
    const id = result.current.uploads[0].id;

    act(() => result.current.removeUploadSlot(id));

    expect(result.current.uploads).toHaveLength(0);
  });

  it("stores the optimized file and a preview URL on file change", async () => {
    const { result } = renderHook(() => useUploadSlots({ maxSlots: 3, initialSlots: 1 }));
    const id = result.current.uploads[0].id;
    const file = makeFile();

    await act(async () => {
      await result.current.handleFileChange(
        { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>,
        id,
      );
    });

    expect(result.current.activeUploads).toHaveLength(1);
    expect(result.current.activeUploads[0].file).toBe(file);
    expect(result.current.uploads[0].previewUrl).toBeTruthy();
    expect(result.current.isOptimizingAny).toBe(false);
  });

  it("keeps the current upload when the file picker is cancelled (empty FileList)", async () => {
    const { result } = renderHook(() => useUploadSlots({ maxSlots: 3, initialSlots: 1 }));
    const id = result.current.uploads[0].id;

    await act(async () => {
      await result.current.handleFileChange(
        { target: { files: [makeFile()] } } as unknown as React.ChangeEvent<HTMLInputElement>,
        id,
      );
    });

    await act(async () => {
      await result.current.handleFileChange(
        { target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>,
        id,
      );
    });

    expect(result.current.uploads[0].file).not.toBeNull();
    expect(result.current.uploads[0].previewUrl).toBeTruthy();
  });

  it("reports an error and keeps the slot when optimization fails", async () => {
    const { resizeImage } = await import("@/utils/imageOptimization");
    vi.mocked(resizeImage).mockRejectedValueOnce(new Error("画像の読み込みに失敗しました。"));
    const onFileError = vi.fn();
    const { result } = renderHook(() =>
      useUploadSlots({ maxSlots: 3, initialSlots: 1, onFileError }),
    );
    const id = result.current.uploads[0].id;

    await act(async () => {
      await result.current.handleFileChange(
        { target: { files: [makeFile()] } } as unknown as React.ChangeEvent<HTMLInputElement>,
        id,
      );
    });

    expect(onFileError).toHaveBeenCalledWith("画像の読み込みに失敗しました。");
    expect(result.current.uploads[0].file).toBeNull();
  });

  it("calls onBeforeChange when a file change starts", async () => {
    const onBeforeChange = vi.fn();
    const { result } = renderHook(() =>
      useUploadSlots({ maxSlots: 3, initialSlots: 1, onBeforeChange }),
    );
    const id = result.current.uploads[0].id;

    await act(async () => {
      await result.current.handleFileChange(
        { target: { files: [makeFile()] } } as unknown as React.ChangeEvent<HTMLInputElement>,
        id,
      );
    });

    expect(onBeforeChange).toHaveBeenCalledTimes(1);
  });

  it("resets uploads to the initial slots", async () => {
    const { result } = renderHook(() => useUploadSlots({ maxSlots: 3, initialSlots: 1 }));
    const id = result.current.uploads[0].id;

    await act(async () => {
      await result.current.handleFileChange(
        { target: { files: [makeFile()] } } as unknown as React.ChangeEvent<HTMLInputElement>,
        id,
      );
    });

    act(() => result.current.resetUploads());

    expect(result.current.uploads).toHaveLength(1);
    expect(result.current.uploads[0].file).toBeNull();
  });
});
