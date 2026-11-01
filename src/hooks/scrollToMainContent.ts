/**
 * Scrolling helpers for the app shell.
 *
 * The shell renders a full-height layout (h-dvh + overflow-hidden) and scrolls
 * the `#main-content` region instead of the document, so window.scrollTo() does
 * nothing there.
 */

/** Id of the scrollable region rendered by the app shell. */
const MAIN_CONTENT_ID = "main-content";

/**
 * Scroll the main content region back to the top.
 *
 * Honors prefers-reduced-motion by jumping instead of animating.
 */
export function scrollMainContentToTop(): void {
  if (typeof document === "undefined") return;
  const container = document.getElementById(MAIN_CONTENT_ID);
  if (!container) return;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

  if (typeof container.scrollTo === "function") {
    container.scrollTo({ top: 0, behavior });
  } else {
    // Older browsers (and jsdom) have no Element.scrollTo.
    container.scrollTop = 0;
  }
}
