import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
});

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /api/auth (NextAuth handlers)
     * - / (login page)
     * - /about, /privacy, /terms: the app's public pages. Google requires the
     *   privacy policy to be readable without signing in and to sit on the same
     *   domain as the app, so these must not redirect to the login page.
     * - /manifest.webmanifest
     * - /serwist (service worker)
     * - /icon, /apple-icon (static icons)
     * - /_next (Next.js internals)
     *
     * The policy paths are anchored with (?:/|$) so that a path merely starting
     * with one of those words is still protected.
     */
    "/((?!api/auth|/|about(?:/|$)|privacy(?:/|$)|terms(?:/|$)|manifest\\.webmanifest|serwist|icon|apple-icon|_next|favicon\\.ico).*)",
  ],
};
