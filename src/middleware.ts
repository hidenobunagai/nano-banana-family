export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /api/auth (NextAuth handlers)
     * - / (login page)
     * - /manifest.webmanifest
     * - /serwist (service worker)
     * - /icon, /apple-icon (static icons)
     * - /_next (Next.js internals)
     */
    "/((?!api/auth|/|manifest\\.webmanifest|serwist|icon|apple-icon|_next|favicon\\.ico).*)",
  ],
};
