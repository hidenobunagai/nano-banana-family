import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            // 'unsafe-inline' stays in script-src on purpose: the Next.js App Router
            // injects inline bootstrap scripts into the document, and a nonce-based
            // policy would force every page to render dynamically in Next 16. Moving
            // to a nonce is therefore deliberately deferred.
            //
            // Google Tag Manager was removed, so no googletagmanager.com or
            // google-analytics.com origin is allowed any more; Vercel Analytics is
            // served from the app's own origin and stays within 'self'.
            value:
              "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.vercel.live; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
