import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FreestyleEditor } from "./FreestyleEditor";

vi.mock("@/utils/imageOptimization", () => ({
  resizeImage: vi.fn(async (file: File) => file),
}));

vi.mock("@/hooks/useProgressSimulation", () => ({
  useProgressSimulation: ({ onComplete }: { onComplete?: () => void }) => {
    let completed = false;
    return {
      progress: 50,
      currentStep: 3,
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

function makeFile(name = "test.png") {
  return new File([new Uint8Array([1])], name, { type: "image/png" });
}

function mockFetchSuccess() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ imageBase64: "QUJD", mimeType: "image/png" }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function uploadFirstFile(container: HTMLElement) {
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [makeFile()] } });
  await waitFor(() => expect(fileInput.files?.[0]).toBeTruthy());
}

describe("FreestyleEditor", () => {
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

  it("disables submit until a prompt and an image are provided", async () => {
    const { container } = render(<FreestyleEditor />);
    const submitButton = screen.getByRole("button", { name: "Gemini に生成を依頼" });

    expect(submitButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/仕上がりのイメージ/);
    fireEvent.change(textarea, { target: { value: "かっこいい感じに" } });

    expect(submitButton).toBeDisabled();

    await uploadFirstFile(container);

    expect(submitButton).toBeEnabled();
  });

  it("generates a result and supports history navigation and comparison", async () => {
    const fetchMock = mockFetchSuccess();
    const { container } = render(<FreestyleEditor />);

    const textarea = screen.getByPlaceholderText(/仕上がりのイメージ/);
    fireEvent.change(textarea, { target: { value: "海賊風のポスターに" } });
    await uploadFirstFile(container);

    fireEvent.click(screen.getByRole("button", { name: "Gemini に生成を依頼" }));

    expect(await screen.findByAltText("自由生成の結果画像")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/freestyle-edit",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
    expect(screen.getByRole("link", { name: "画像をダウンロード" })).toHaveAttribute(
      "download",
      expect.stringMatching(/^freestyle-\d+\.png$/),
    );

    fireEvent.click(screen.getByRole("button", { name: "同じ内容でもう一度" }));
    expect(await screen.findByAltText("自由生成の結果画像")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "前の結果と比較" }));
    expect(screen.getByRole("button", { name: "最新の結果に戻る" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the error banner with retry actions when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: "テスト用エラー" }),
      })),
    );
    const { container } = render(<FreestyleEditor />);

    fireEvent.change(screen.getByPlaceholderText(/仕上がりのイメージ/), {
      target: { value: "かっこいい感じに" },
    });
    await uploadFirstFile(container);

    fireEvent.click(screen.getByRole("button", { name: "Gemini に生成を依頼" }));

    expect(await screen.findByText("テスト用エラー")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同じ内容で再試行" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "最初からやり直す" })).toBeInTheDocument();
    expect(screen.queryByAltText("自由生成の結果画像")).not.toBeInTheDocument();
  });

  it("clears the editor when reset is clicked", async () => {
    const fetchMock = mockFetchSuccess();
    const { container } = render(<FreestyleEditor />);

    fireEvent.change(screen.getByPlaceholderText(/仕上がりのイメージ/), {
      target: { value: "かっこいい感じに" },
    });
    await uploadFirstFile(container);
    fireEvent.click(screen.getByRole("button", { name: "Gemini に生成を依頼" }));
    await screen.findByAltText("自由生成の結果画像");

    fireEvent.click(screen.getByRole("button", { name: "最初からやり直す" }));

    expect(screen.getByText("生成結果がここに表示されます")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gemini に生成を依頼" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
