import type { MetadataRoute } from "next"
import { getDispensaries } from "@/lib/queries/dispensaries"
import { getBrands } from "@/lib/queries/products"

export const revalidate = 86400 // daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rhodyshelf.com"

  const [dispensaries, brands] = await Promise.all([
    getDispensaries(),
    getBrands(),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/menu`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/deals`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/drops`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/dispensary`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.2 },
  ]

  const dispensaryPages: MetadataRoute.Sitemap = dispensaries.map((d) => ({
    url: `${baseUrl}/dispensary/${d.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }))

  const brandPages: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${baseUrl}/brand/${b.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }))

  return [...staticPages, ...dispensaryPages, ...brandPages]
}
