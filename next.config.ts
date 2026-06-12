import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Dutchie (Aura Central Falls, Newport, Sweetspot)
      { protocol: "https", hostname: "**.dutchie.com" },
      { protocol: "https", hostname: "images.dutchie.com" },
      // Legacy Dutchie S3 — biggest source (1276 inventory rows)
      {
        protocol: "https",
        hostname: "s3-us-west-2.amazonaws.com",
        pathname: "/dutchie-images/**",
      },
      { protocol: "https", hostname: "**.s3.us-west-2.amazonaws.com" },
      // iHeartJane (Rise Warwick)
      { protocol: "https", hostname: "**.iheartjane.com" },
      { protocol: "https", hostname: "product-assets.iheartjane.com" },
      { protocol: "https", hostname: "uploads.iheartjane.com" },
      // Leafly
      { protocol: "https", hostname: "**.leafly.com" },
      // SweedPOS (GreenWave)
      { protocol: "https", hostname: "**.sweedpos.com" },
      { protocol: "https", hostname: "media-prime.sweedpos.com" },
      // Leaflogix (Mother Earth, some Sweetspot)
      { protocol: "https", hostname: "leaflogixmedia.blob.core.windows.net" },
      // DispenseApp / imgix (Slater)
      { protocol: "https", hostname: "**.dispenseapp.com" },
      { protocol: "https", hostname: "imgix.dispenseapp.com" },
      { protocol: "https", hostname: "dispense-images.imgix.net" },
    ],
  },
}

export default nextConfig
