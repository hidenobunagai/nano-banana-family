import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_STORY_UPLOADS } from "@/utils/promptConstants";
import { StoryCreator } from "./StoryCreator";

vi.mock("@/utils/imageOptimization", () => ({
  resizeImage: vi.fn(async (file: File) => file),
}));

vi.mock("@/hooks/useProgressSimulation", () => ({
  useProgressSimulation: ({ onComplete }: { onComplete?: () => void }) => {
    let completed = false;
    return {
      progress: 50,
      currentStep: 2,
      timeRemaining: 2,
      reset: vi.fn(),
      complete: vi.fn(() => {
        if (!completed) {
          completed = true;
          onComplete?.();
        }
      }),
    };
  },
}));

function makeFile(name = "photo.png") {
  return new File([new Uint8Array([1])], name, { type: "image/png" });
}

function mockFetchSuccess() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ imageBase64: "U1RPUlk=", mimeType: "image/png" }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Responds with a different image on every call, so history entries are distinguishable. */
function mockFetchDistinct() {
  let call = 0;
  const fetchMock = vi.fn(async () => {
    call += 1;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ imageBase64: `SU1H${call}`, mimeType: "image/png" }),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function imageSrc(alt: string): string {
  return (screen.getByAltText(alt) as HTMLImageElement).src;
}

async function uploadFirstFile(container: HTMLElement) {
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [makeFile()] } });
  await waitFor(() =>
    expect(screen.getByAltText("選択した参考画像のプレビュー")).toBeInTheDocument(),
  );
}

describe("StoryCreator", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: vi.fn() });
    Object.defineProperty(window, "scrollTo", { writable: true, value: vi.fn() });
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      writable: true,
      value: vi.fn(),
    });
    vi.unstubAllGlobals();
  });

  it("disables submit button until at least one photo is uploaded", async () => {
    const { container } = render(<StoryCreator />);
    const submitButton = screen.getByRole("button", { name: "ストーリーを生成する" });

    expect(submitButton).toBeDisabled();

    await uploadFirstFile(container);
    expect(submitButton).toBeEnabled();
  });

  it("adds a screenshot pasted anywhere in the window as a photo", async () => {
    render(<StoryCreator />);
    const submitButton = screen.getByRole("button", { name: "ストーリーを生成する" });
    expect(submitButton).toBeDisabled();

    // The window listener, not the upload slot, catches the paste: nothing is focused.
    fireEvent.paste(window, {
      clipboardData: { files: [makeFile("screenshot.png")], types: ["Files"] },
    });

    await waitFor(() =>
      expect(screen.getByAltText("選択した参考画像のプレビュー")).toBeInTheDocument(),
    );
    expect(submitButton).toBeEnabled();
  });

  it("leaves text pasted into the story settings field to the browser", () => {
    render(<StoryCreator />);

    fireEvent.paste(screen.getByLabelText("追加のストーリー設定"), {
      clipboardData: { files: [], types: ["text/plain"], getData: () => "こんにちは" },
    });

    // Plain text must not be swallowed as a photo.
    expect(screen.queryByAltText("選択した参考画像のプレビュー")).not.toBeInTheDocument();
  });

  it("changes story format and tone options", async () => {
    render(<StoryCreator />);

    const comicButton = screen.getByRole("button", { name: /4コマ漫画/ });
    fireEvent.click(comicButton);
    expect(comicButton).toHaveAttribute("aria-pressed", "true");

    const cuteToneButton = screen.getByRole("button", { name: "かわいい" });
    fireEvent.click(cuteToneButton);
    expect(cuteToneButton).toHaveAttribute("aria-pressed", "true");
  });

  it("caps upload slots at the shared MAX_STORY_UPLOADS limit", () => {
    render(<StoryCreator />);

    // Starts with one slot, so the hint counts down from the shared constant.
    expect(screen.getByText(`画像を追加（あと ${MAX_STORY_UPLOADS - 1} 枚）`)).toBeInTheDocument();
    // The step hint interpolates the same constant rather than hardcoding "1〜5".
    expect(
      screen.getByText(`日常の写真、おでかけの写真を 1〜${MAX_STORY_UPLOADS} 枚選んでください。`),
    ).toBeInTheDocument();

    for (let i = 0; i < MAX_STORY_UPLOADS - 1; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: /画像を追加/ }));
    }
    expect(screen.queryByRole("button", { name: /画像を追加/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /参考画像 \d+ を削除/ })).toHaveLength(
      MAX_STORY_UPLOADS,
    );
  });

  it("generates a story image on submission and allows reset", async () => {
    const fetchMock = mockFetchSuccess();
    const { container } = render(<StoryCreator />);

    await uploadFirstFile(container);
    const submitButton = screen.getByRole("button", { name: "ストーリーを生成する" });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    expect(await screen.findByAltText("ストーリー生成の結果画像")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/create-story",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );

    // Reset editor
    fireEvent.click(screen.getByRole("button", { name: "最初からやり直す" }));
    expect(
      screen.getByText(/写真を選ぶと、AI が絵本や漫画のストーリー作品を自動生成します/),
    ).toBeInTheDocument();
  });

  it("steps the result history back and forward with the pane buttons", async () => {
    mockFetchDistinct();
    const { container } = render(<StoryCreator />);

    await uploadFirstFile(container);
    fireEvent.click(screen.getByRole("button", { name: "ストーリーを生成する" }));
    await screen.findByAltText("ストーリー生成の結果画像");
    const first = imageSrc("ストーリー生成の結果画像");

    fireEvent.click(screen.getByRole("button", { name: "同じ写真でもう一度生成" }));
    await waitFor(() => expect(imageSrc("ストーリー生成の結果画像")).not.toBe(first));
    const second = imageSrc("ストーリー生成の結果画像");

    fireEvent.click(screen.getByRole("button", { name: "前の結果" }));
    expect(imageSrc("ストーリー生成の結果画像")).toBe(first);

    fireEvent.click(screen.getByRole("button", { name: "次の結果" }));
    expect(imageSrc("ストーリー生成の結果画像")).toBe(second);
  });
});
