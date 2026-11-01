import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollMainContentToTop } from "./scrollToMainContent";

function createMainContent() {
  const container = document.createElement("div");
  container.id = "main-content";
  const scrollTo = vi.fn();
  container.scrollTo = scrollTo;
  document.body.appendChild(container);
  return { container, scrollTo };
}

describe("scrollMainContentToTop", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("scrolls the main content container to the top", () => {
    const { scrollTo } = createMainContent();

    scrollMainContentToTop();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("jumps instead of animating when reduced motion is preferred", () => {
    const { scrollTo } = createMainContent();
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("prefers-reduced-motion"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          onchange: null,
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );

    scrollMainContentToTop();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("does nothing when the main content container is missing", () => {
    expect(() => scrollMainContentToTop()).not.toThrow();
  });

  it("falls back to scrollTop when the container has no scrollTo", () => {
    const container = document.createElement("div");
    container.id = "main-content";
    document.body.appendChild(container);

    scrollMainContentToTop();

    expect(container.scrollTop).toBe(0);
  });
});
