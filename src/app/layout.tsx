import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "./providers";

import { Analytics } from "@vercel/analytics/next";

const GTM_ID = "GTM-NP6VPKT6";

export const metadata: Metadata = {
  title: {
    default: "Hide NB Studio",
    template: "%s | Hide NB Studio",
  },
  description: "Family-only Gemini image editor with guided prompt presets.",
  applicationName: "Hide NB Studio",
  manifest: "/manifest.webmanifest?v=2",
  appleWebApp: {
    capable: true,
    title: "Hide NB Studio",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#f5f6f8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      </head>
      <body className="font-sans antialiased selection:bg-[#2563eb]/20 selection:text-[#111827]">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#bfdbfe]/30 rounded-[9999px] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#c7d6fe]/30 rounded-[9999px] blur-[120px]" />
        </div>

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#2563eb] focus:text-white focus:rounded-[8px] focus:shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          メインコンテンツへスキップ
        </a>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
