import { createServiceClient } from "@/lib/supabase/service-client"
import type { InventoryListing, DropListing, Brand } from "@/lib/types"

/**
 * Paginated fetch to bypass PostgREST max_rows (1000) limit.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(buildQuery: (client: any) => any): Promise<any[]> {
  const client = createServiceClient()
  const PAGE_SIZE = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRows: any[] = []
  let from = 0

  while (true) {
    const { data } = await buildQuery(client).range(from, from + PAGE_SIZE - 1)
    if (!data || data.length === 0) break
    allRows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
}

/**
 * Get all active inventory listings (the core query).
 * 1 row = 1 product at 1 dispensary.
 *
 * Tier + status filtering already happens at sync time (Droplet 4).
 * The 24h freshness window is enforced in Supabase RLS on current_inventory.
 * We read image_url and product_url from the inventory row (per-dispensary).
 */
export async function getInventory(): Promise<InventoryListing[]> {
  const data = await fetchAll((client) =>
    client
      .from("current_inventory")
      .select(
        `
        id, price, original_price,
        discount_amount, discount_percent,
        thc_percent, cbd_percent,
        image_url, product_url,
        last_seen_at,
        product:product_id!inner(id, name, brand_id, brand_name, category, subcategory,
          weight_grams, weight_display, strain_type, strain_name, image_url),
        dispensary:dispensary_id!inner(id, name, slug, city, menu_url)
      `
      )
  )

  return data as unknown as InventoryListing[]
}

/**
 * Get a single inventory listing by ID (for product detail page).
 */
export async function getListingById(
  id: string
): Promise<InventoryListing | null> {
  const client = createServiceClient()
  const { data } = await client
    .from("current_inventory")
    .select(
      `
      id, price, original_price,
      discount_amount, discount_percent,
      thc_percent, cbd_percent,
      image_url, product_url,
      last_seen_at,
      product:product_id!inner(id, name, brand_id, brand_name, category, subcategory,
        weight_grams, weight_display, strain_type, strain_name, image_url),
      dispensary:dispensary_id!inner(id, name, slug, city, menu_url)
    `
    )
    .eq("id", id)
    .single()

  return (data as unknown as InventoryListing) ?? null
}

/**
 * Get new product drops from the last 14 days.
 *
 * RhodyShelf's `product_drops` table is a first-seen-at record per
 * (product_id, dispensary_id). The 14-day RLS window on anon already
 * filters to recent drops, so this query is a simple JOIN.
 */
export async function getDrops(): Promise<DropListing[]> {
  const client = createServiceClient()

  // Read drops and their associated inventory rows in one query
  const { data: drops } = await client
    .from("product_drops")
    .select(
      `
      product_id, dispensary_id, dropped_at
    `
    )
    .order("dropped_at", { ascending: false })

  if (!drops?.length) return []

  // Read inventory for matching (product, dispensary) pairs
  const inventoryRows = await fetchAll((c) =>
    c
      .from("current_inventory")
      .select(
        `
        id, price, original_price,
        discount_amount, discount_percent,
        thc_percent, cbd_percent,
        image_url, product_url,
        last_seen_at,
        product_id, dispensary_id,
        product:product_id!inner(id, name, brand_id, brand_name, category, subcategory,
          weight_grams, weight_display, strain_type, strain_name, image_url),
        dispensary:dispensary_id!inner(id, name, slug, city, menu_url)
      `
      )
      .in("product_id", [...new Set(drops.map((d) => d.product_id))])
  )

  // Join drops × inventory via (product_id, dispensary_id) composite key
  const invMap = new Map<string, Record<string, unknown>>()
  for (const row of inventoryRows) {
    const key = `${row.product_id}:${row.dispensary_id}`
    invMap.set(key, row as Record<string, unknown>)
  }

  const result: DropListing[] = []
  for (const d of drops) {
    const inv = invMap.get(`${d.product_id}:${d.dispensary_id}`)
    if (!inv) continue // inventory aged out of 24h window — skip
    result.push({
      ...(inv as unknown as InventoryListing),
      dropped_at: d.dropped_at,
    })
  }
  return result
}

/**
 * Get deals (inventory rows with an active discount).
 * RhodyShelf DB already filters to 24h via RLS.
 */
export async function getDeals(): Promise<InventoryListing[]> {
  const data = await fetchAll((client) =>
    client
      .from("current_inventory")
      .select(
        `
        id, price, original_price,
        discount_amount, discount_percent,
        thc_percent, cbd_percent,
        image_url, product_url,
        last_seen_at,
        product:product_id!inner(id, name, brand_id, brand_name, category, subcategory,
          weight_grams, weight_display, strain_type, strain_name, image_url),
        dispensary:dispensary_id!inner(id, name, slug, city, menu_url)
      `
      )
      .gt("discount_amount", 0)
      .order("discount_percent", { ascending: false, nullsFirst: false })
  )
  return data as unknown as InventoryListing[]
}

/**
 * Get all brands (for brand pages and filter list).
 */
export async function getBrands(): Promise<Brand[]> {
  const client = createServiceClient()
  const { data } = await client
    .from("brands")
    .select("id, canonical_name, slug, category")
    .order("canonical_name")

  return (data ?? []) as Brand[]
}

/**
 * Get a single brand by slug.
 */
export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const client = createServiceClient()
  const { data } = await client
    .from("brands")
    .select("id, canonical_name, slug, category")
    .eq("slug", slug)
    .single()

  return (data as Brand) ?? null
}
