import type { MetadataRoute } from "next"
import { getDispensaries } from "@/lib/queries/dispensaries"
import {
  getBrands,
  getSitemapListings,
  HOMEPAGE_CATEGORIES,
} from "@/lib/queries/products"

export const revalidate = 86400 // daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rhodyshelf.com"
  const now = new Date()

  const [dispensaries, brands, listings] = await Promise.all([
    getDispensaries(),
    getBrands(),
    getSitemapListings(),
  ])

  // Note: /menu and /search are intentionally excluded — /menu only redirects
  // to /search, and /search is noindex (infinite param combinations).
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/deals`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/drops`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/dispensary`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/brand`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.2 },
  ]

  // Indexable category landing pages (the head-query targets).
  const categoryPages: MetadataRoute.Sitemap = HOMEPAGE_CATEGORIES.map((c) => ({
    url: `${baseUrl}/category/${c.key}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }))

  const dispensaryPages: MetadataRoute.Sitemap = dispensaries.map((d) => ({
    url: `${baseUrl}/dispensary/${d.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }))

  const brandPages: MetadataRoute.Sitemap = brands
    .filter((b) => b.slug)
    .map((b) => ({
      url: `${baseUrl}/brand/${b.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }))

  const productPages: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${baseUrl}/product/${l.id}`,
    lastModified: new Date(l.lastModified),
    changeFrequency: "daily" as const,
    priority: 0.5,
    // Image sitemap: opens the product catalog to Google Images.
    ...(l.image ? { images: [l.image] } : {}),
  }))

  return [
    ...staticPages,
    ...categoryPages,
    ...dispensaryPages,
    ...brandPages,
    ...productPages,
  ]
}
