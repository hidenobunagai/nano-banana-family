import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hide NB Studio",
    short_name: "Hide NB",
    description:
      "Family-only image editing studio powered by Google Gemini and curated prompt presets.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f5f6f8",
    lang: "ja",
    scope: "/",
    icons: [
      {
        src: "/icon.png",
        sizes: "640x640",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
