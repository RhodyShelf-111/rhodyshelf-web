import type { MetadataRoute } from "next"

// Served at /manifest.webmanifest with an auto-injected <link rel="manifest">.
// Static (no request-time APIs) so it stays cached. Colors match the dark
// theme set in the root layout's viewport (themeColor #0a0f0a).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RhodyShelf — Rhode Island Cannabis Menus & Deals",
    short_name: "RhodyShelf",
    description:
      "Browse cannabis menus across 9 Rhode Island dispensaries in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f0a",
    theme_color: "#0a0f0a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  }
}
