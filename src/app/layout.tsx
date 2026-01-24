import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google"; // UI/UX Pro Max: Premium fonts
import { AuthProvider } from "./providers";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";

// UI/UX Pro Max: Modern Typography
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
  maximumScale: 5,
  userScalable: true,
  themeColor: "#020617", // Match background
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${outfit.variable} ${inter.variable}`}>
      {/* UI/UX Pro Max: Global Background & Font Classes */}
      <body className="font-sans bg-slate-950 text-slate-50 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Background Gradients for depth */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen" />
        </div>

        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
