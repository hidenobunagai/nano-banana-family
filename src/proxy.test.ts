import { describe, expect, it } from "vitest";
import { config } from "./proxy";

/**
 * Next.js compiles the proxy `matcher` into an anchored regular expression: the
 * matcher string is the body of the pattern and the request path has to match
 * it from the first to the last character. A path the pattern matches is
 * handled by the proxy, so it needs a session; a path it does not match is
 * served without one.
 */
function matcherPattern(): RegExp {
  const matcher = config.matcher;
  const pattern = Array.isArray(matcher) ? matcher[0] : matcher;
  return new RegExp(`^${pattern}$`);
}

/** Served without a session: the login page, the legal pages and static assets. */
const UNPROTECTED_PATHS = [
  "/about",
  "/about/",
  "/privacy",
  "/terms",
  "/manifest.webmanifest",
  "/serwist/sw.js",
  "/icon.png",
  "/apple-icon.png",
  "/_next/static/x.js",
  "/favicon.ico",
  "/api/auth/session",
];

/** Served only with a session, including paths that merely start with a public name. */
const PROTECTED_PATHS = [
  "/aboutx",
  "/termsheet",
  "/api/health",
  "/api/freestyle-edit",
  "/some/page",
];

describe("proxy matcher", () => {
  it("leaves the public pages and the static assets outside the session check", () => {
    const matcher = matcherPattern();

    for (const path of UNPROTECTED_PATHS) {
      expect(matcher.test(path), path).toBe(false);
    }
  });

  it("guards every other route", () => {
    const matcher = matcherPattern();

    for (const path of PROTECTED_PATHS) {
      expect(matcher.test(path), path).toBe(true);
    }
  });
});
