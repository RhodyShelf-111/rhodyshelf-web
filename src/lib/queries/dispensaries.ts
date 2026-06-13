import { unstable_cache } from "next/cache"
import { cache } from "react"
import { createServiceClient } from "@/lib/supabase/service-client"
import type { Dispensary, DispensaryWithCounts } from "@/lib/types"
import { slugify } from "@/lib/utils"

const DISPENSARY_COLUMNS = "id, name, slug, city, menu_url"

function freshnessCutoff(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Get all active dispensaries with fresh product and deal counts.
 * Counts come from a paginated light scan of current_inventory (id-level
 * columns only) — the service-role key bypasses the 24h RLS window, so the
 * freshness filter is applied explicitly.
 */
export const getDispensaries = unstable_cache(
  async (): Promise<DispensaryWithCounts[]> => {
    const client = createServiceClient()

    const { data: dispensaries, error: dispensariesError } = await client
      .from("dispensaries")
      .select(DISPENSARY_COLUMNS)
      .eq("is_active", true)
      .order("name")
    // Throw on errors so unstable_cache/ISR keep serving the last good
    // value instead of caching a degraded result for the whole window.
    if (dispensariesError) {
      throw new Error(`getDispensaries: ${dispensariesError.message}`)
    }
    if (!dispensaries?.length) return []

    const productCounts = new Map<string, number>()
    const dealCounts = new Map<string, number>()
    const PAGE_SIZE = 1000
    let from = 0
    while (true) {
      const { data, error } = await client
        .from("current_inventory")
        .select("dispensary_id, discount_amount")
        .gt("last_seen_at", freshnessCutoff())
        .order("id")
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw new Error(`getDispensaries counts: ${error.message}`)
      if (!data || data.length === 0) break
      for (const row of data) {
        const did = row.dispensary_id as string
        productCounts.set(did, (productCounts.get(did) ?? 0) + 1)
        if (((row.discount_amount as number) ?? 0) > 0) {
          dealCounts.set(did, (dealCounts.get(did) ?? 0) + 1)
        }
      }
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    return dispensaries.map((d) => ({
      ...d,
      slug: d.slug || slugify(d.name),
      product_count: productCounts.get(d.id) ?? 0,
      deal_count: dealCounts.get(d.id) ?? 0,
    })) as DispensaryWithCounts[]
  },
  ["dispensaries-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/**
 * Get a single dispensary by slug (falling back to slugified name for rows
 * with a null DB slug). React-cached so the page and generateMetadata share
 * one fetch per request.
 */
export const getDispensaryBySlug = cache(
  async (slug: string): Promise<Dispensary | null> => {
    const client = createServiceClient()

    const { data } = await client
      .from("dispensaries")
      .select(DISPENSARY_COLUMNS)
      .eq("slug", slug)
      .maybeSingle()
    if (data) {
      return { ...data, slug: data.slug || slugify(data.name) } as Dispensary
    }

    const { data: all } = await client
      .from("dispensaries")
      .select(DISPENSARY_COLUMNS)
      .eq("is_active", true)
    const match = all?.find((d) => slugify(d.name) === slug)
    return match ? ({ ...match, slug: slugify(match.name) } as Dispensary) : null
  }
)
