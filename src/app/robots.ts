import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rhodyshelf.com"

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API responses and the device-local saved list have no crawl value.
      disallow: ["/api/", "/saved"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
