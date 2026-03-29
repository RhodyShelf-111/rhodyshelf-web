import { createServiceClient } from "@/lib/supabase/service-client"
import type { Dispensary, DispensaryWithCounts } from "@/lib/types"
import { slugify } from "@/lib/utils"

/**
 * Get all dispensaries with product and deal counts.
 * Generates slugs from names if DB slugs are null.
 */
export async function getDispensaries(): Promise<DispensaryWithCounts[]> {
  const client = createServiceClient()

  const { data: dispensaries } = await client
    .from("dispensaries")
    .select("id, name, slug, city, address, latitude, longitude, menu_url")
    .eq("is_active", true)
    .order("name")

  if (!dispensaries?.length) return []

  // Get product counts per dispensary
  const { data: inventory } = await client
    .from("current_inventory")
    .select("dispensary_id, discount_amount")
    .eq("status", "active")

  const productCounts = new Map<string, number>()
  const dealCounts = new Map<string, number>()

  for (const row of inventory ?? []) {
    const did = row.dispensary_id as string
    productCounts.set(did, (productCounts.get(did) ?? 0) + 1)
    if ((row.discount_amount as number) > 0) {
      dealCounts.set(did, (dealCounts.get(did) ?? 0) + 1)
    }
  }

  return dispensaries.map((d) => ({
    ...d,
    slug: d.slug || slugify(d.name),
    product_count: productCounts.get(d.id) ?? 0,
    deal_count: dealCounts.get(d.id) ?? 0,
  })) as DispensaryWithCounts[]
}

/**
 * Get a single dispensary by generated slug.
 * Since DB slugs may be null, we fetch all and match by generated slug.
 */
export async function getDispensaryBySlug(
  slug: string
): Promise<Dispensary | null> {
  const client = createServiceClient()

  // Try DB slug first
  const { data } = await client
    .from("dispensaries")
    .select("id, name, slug, city, address, latitude, longitude, menu_url")
    .eq("slug", slug)
    .maybeSingle()

  if (data) return { ...data, slug: data.slug || slugify(data.name) } as Dispensary

  // Fall back to matching generated slug against all dispensaries
  const { data: all } = await client
    .from("dispensaries")
    .select("id, name, slug, city, address, latitude, longitude, menu_url")
    .eq("is_active", true)

  const match = all?.find((d) => slugify(d.name) === slug)
  if (match) return { ...match, slug: slugify(match.name) } as Dispensary

  return null
}
