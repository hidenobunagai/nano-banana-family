import type { Metadata, Viewport } from "next";
import { AuthProvider } from "./providers";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";

// Temporarily use system fonts for development
const geistSans = {
  variable: "--font-geist-sans",
};

const geistMono = {
  variable: "--font-geist-mono",
};

export const metadata: Metadata = {
  title: {
    default: "Hide NB Studio",
    template: "%s | Hide NB Studio",
  },
  description: "Family-only Gemini image editor with guided prompt presets.",
  applicationName: "Hide NB Studio",
  manifest: "/manifest.webmanifest",
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}