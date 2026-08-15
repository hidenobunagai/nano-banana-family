import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IconCreator } from "./IconCreator";

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
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () => ({ imageBase64: "QUJD", mimeType: "image/png" }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("IconCreator", () => {
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

  it("disables submit until a contact name is provided", () => {
    render(<IconCreator />);
    const submitButton = screen.getByRole("button", { name: "アイコンを生成" });

    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("例: 桜小学校児童クラブ"), {
      target: { value: "テスト連絡先" },
    });

    expect(submitButton).toBeEnabled();
  });

  it("generates an icon with the entered name and selected style", async () => {
    const fetchMock = mockFetchSuccess();
    render(<IconCreator />);

    fireEvent.change(screen.getByPlaceholderText("例: 桜小学校児童クラブ"), {
      target: { value: "テスト連絡先" },
    });
    fireEvent.click(screen.getByRole("button", { name: "アイコンを生成" }));

    expect(await screen.findByAltText("テスト連絡先 の生成アイコン")).toBeInTheDocument();
    expect(screen.getByAltText("テスト連絡先 の四角いプレビュー")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/icon-generate",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
    const [, init] = fetchMock.mock.calls[0]!;
    const body = init!.body as FormData;
    expect(body.get("name")).toBe("テスト連絡先");
    expect(body.get("style")).toBe("auto");

    expect(screen.getByRole("link", { name: "ダウンロード" })).toHaveAttribute(
      "download",
      expect.stringMatching(/^icon-\d+\.png$/),
    );
  });

  it("sends the URL and custom prompt when provided", async () => {
    const fetchMock = mockFetchSuccess();
    render(<IconCreator />);

    fireEvent.change(screen.getByPlaceholderText("例: 桜小学校児童クラブ"), {
      target: { value: "テスト連絡先" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), {
      target: { value: "https://example.com/school" },
    });
    fireEvent.change(screen.getByPlaceholderText(/追加したい雰囲気/), {
      target: { value: "かわいくして" },
    });
    fireEvent.click(screen.getByRole("button", { name: "アイコンを生成" }));

    await screen.findByAltText("テスト連絡先 の生成アイコン");

    const [, init] = fetchMock.mock.calls[0]!;
    const body = init!.body as FormData;
    expect(body.get("url")).toBe("https://example.com/school");
    expect(body.get("customPrompt")).toBe("かわいくして");
  });

  it("shows the error banner when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "テスト用エラー" }),
      })),
    );
    render(<IconCreator />);

    fireEvent.change(screen.getByPlaceholderText("例: 桜小学校児童クラブ"), {
      target: { value: "テスト連絡先" },
    });
    fireEvent.click(screen.getByRole("button", { name: "アイコンを生成" }));

    expect(await screen.findByText("テスト用エラー")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同じ条件で再試行" })).toBeInTheDocument();
    expect(screen.getByText("アイコンがここに表示されます")).toBeInTheDocument();
  });

  it("includes uploaded reference images in the request", async () => {
    const fetchMock = mockFetchSuccess();
    const { container } = render(<IconCreator />);

    fireEvent.change(screen.getByPlaceholderText("例: 桜小学校児童クラブ"), {
      target: { value: "テスト連絡先" },
    });
    fireEvent.click(screen.getByRole("button", { name: /画像を追加/ }));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeFile("ref.png")] } });
    await waitFor(() => expect(fileInput.files?.[0]).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "アイコンを生成" }));
    await screen.findByAltText("テスト連絡先 の生成アイコン");

    const [, init] = fetchMock.mock.calls[0]!;
    const body = init!.body as FormData;
    expect(body.getAll("images")).toHaveLength(1);
  });
});
