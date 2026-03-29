import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.dutchie.com" },
      { protocol: "https", hostname: "**.iheartjane.com" },
      { protocol: "https", hostname: "**.leafly.com" },
      { protocol: "https", hostname: "images.dutchie.com" },
      { protocol: "https", hostname: "product-assets.iheartjane.com" },
    ],
  },
}

export default nextConfig
