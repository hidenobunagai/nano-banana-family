import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileInput } from "./FileInput";

// jsdom does not implement DataTransfer or a settable input.files,
// so stub both to exercise the component's drop handling.
class FakeDataTransfer {
  files: File[] = [];
  items = {
    add: (file: File) => {
      this.files.push(file);
    },
  };
}

function dropFile(target: HTMLElement, file: File): void {
  const dataTransfer = new FakeDataTransfer();
  dataTransfer.items.add(file);
  const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(dropEvent, "dataTransfer", { value: dataTransfer });
  target.dispatchEvent(dropEvent);
}

describe("FileInput", () => {
  beforeEach(() => {
    vi.stubGlobal("DataTransfer", FakeDataTransfer);
    vi.spyOn(HTMLInputElement.prototype, "files", "set").mockImplementation(function (
      this: HTMLInputElement,
      files,
    ) {
      (this as HTMLInputElement & { _testFiles?: File[] })._testFiles = Array.from(
        (files ?? []) as unknown as FileList,
      );
    });
    vi.spyOn(HTMLInputElement.prototype, "files", "get").mockImplementation(function (
      this: HTMLInputElement,
    ): FileList {
      const stored = (this as HTMLInputElement & { _testFiles?: File[] })._testFiles;
      return (stored ?? []) as unknown as FileList;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the upload placeholder when there is no preview", () => {
    render(
      <FileInput
        subLabel="参考画像 1"
        previewUrl={null}
        isOptimizing={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("クリックして追加")).toBeInTheDocument();
  });

  it("shows a spinner while optimizing", () => {
    const { container } = render(
      <FileInput previewUrl={null} isOptimizing={true} onChange={vi.fn()} />,
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("calls onChange with the dropped file", () => {
    const onChange = vi.fn();
    const { container } = render(
      <FileInput previewUrl={null} isOptimizing={false} onChange={onChange} />,
    );

    const dropZone = screen.getByText("クリックして追加").closest("label");
    expect(dropZone).not.toBeNull();

    const file = new File(["abc"], "photo.png", { type: "image/png" });
    dropFile(dropZone as HTMLElement, file);

    expect(onChange).toHaveBeenCalledTimes(1);
    const event = onChange.mock.calls[0][0] as React.ChangeEvent<HTMLInputElement>;
    expect(event.target.files?.[0]).toBe(file);
    expect(container.querySelector("input[type=file]")).toBe(event.target);
  });

  it("renders a preview image when previewUrl is set", () => {
    render(
      <FileInput
        previewUrl="blob:mock-preview"
        isOptimizing={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByAltText("Preview")).toBeInTheDocument();
    expect(screen.getByText("画像を変更")).toBeInTheDocument();
  });
});
