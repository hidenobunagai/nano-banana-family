import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("changes story format and tone options", async () => {
    render(<StoryCreator />);

    const comicButton = screen.getByRole("button", { name: /4コマ漫画/ });
    fireEvent.click(comicButton);
    expect(comicButton).toHaveAttribute("aria-pressed", "true");

    const cuteToneButton = screen.getByRole("button", { name: "かわいい" });
    fireEvent.click(cuteToneButton);
    expect(cuteToneButton).toHaveAttribute("aria-pressed", "true");
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
});
