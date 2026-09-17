import type { MetadataRoute } from "next";

/**
 * What a phone reads when the site is kept on a home screen.
 *
 * Without it — and without the PNG beside it — iOS had nothing to draw and
 * fell back to its own tile: the first letter of the title on a grey square.
 * Safari will not use an SVG for a home-screen icon, which is all this app
 * shipped, so `icon.svg` covered every browser tab and no phone at all.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "danke",
    short_name: "danke",
    description: "A self-hosted study app for cards you write yourself.",
    start_url: "/",
    display: "standalone",
    // The page behind the splash, and the bar Android tints around it. Both
    // are the light palette's, which is what `:root` renders before any theme
    // cookie is read.
    background_color: "#f4f5f9",
    theme_color: "#f4f5f9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // `maskable` lets Android crop to its own shape without letterboxing;
      // the mark is drawn at 66% so the crop has room.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
