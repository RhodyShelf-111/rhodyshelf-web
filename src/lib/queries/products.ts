import { createServiceClient } from "@/lib/supabase/service-client"
import type { InventoryListing, DropListing, Brand } from "@/lib/types"
import { slugify } from "@/lib/utils"

/**
 * Paginated fetch to bypass PostgREST max_rows (1000) limit.
 * Pattern from WeedShelf blog/queries.ts.
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
 * 1 row = 1 product at 1 dispensary. Strips sensitive fields.
 * Returns ~3,300 rows, ~50KB gzipped.
 */
export async function getInventory(): Promise<InventoryListing[]> {
  const data = await fetchAll((client) =>
    client
      .from("current_inventory")
      .select(
        `
        id, price, discount_amount, thc_percent, cbd_percent, last_seen_at,
        product:product_id!inner(id, name, brand_name, category, subcategory,
          weight_display, strain_type, image_url),
        dispensary:dispensary_id!inner(id, name, slug, city, menu_url)
      `
      )
      .eq("status", "active")
      .in("product.tier", [1, 2])
  )

  // Post-process: generate slugs for dispensaries that have null slugs
  const listings = data as unknown as InventoryListing[]
  for (const listing of listings) {
    if (!listing.dispensary.slug) {
      listing.dispensary.slug = slugify(listing.dispensary.name)
    }
  }
  return listings
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
      id, price, discount_amount, thc_percent, cbd_percent, last_seen_at,
      product:product_id!inner(id, name, brand_name, category, subcategory,
        weight_display, strain_type, image_url),
      dispensary:dispensary_id!inner(id, name, slug, city, menu_url)
    `
    )
    .eq("id", id)
    .eq("status", "active")
    .single()

  if (!data) return null
  const listing = data as unknown as InventoryListing
  if (!listing.dispensary.slug) {
    listing.dispensary.slug = slugify(listing.dispensary.name)
  }
  return listing
}

/**
 * Get new product drops from the last N days.
 * Two-step query because product_events is partitioned by month
 * and PostgREST FK joins fail on partitioned tables.
 */
export async function getDrops(daysBack = 14): Promise<DropListing[]> {
  const client = createServiceClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)

  // Step 1: Get recent 'added' events
  const { data: events } = await client
    .from("product_events")
    .select("product_id, dispensary_id, event_date")
    .eq("event_type", "added")
    .gte("event_date", cutoff.toISOString().split("T")[0])
    .order("event_date", { ascending: false })

  if (!events?.length) return []

  // Step 2: Get active inventory for those product+dispensary combos
  const productIds = [...new Set(events.map((e) => e.product_id))]
  const inventory = await fetchAll((c) =>
    c
      .from("current_inventory")
      .select(
        `
        id, price, discount_amount, thc_percent, cbd_percent, last_seen_at,
        product:product_id!inner(id, name, brand_name, category, subcategory,
          weight_display, strain_type, image_url),
        dispensary:dispensary_id!inner(id, name, slug, city, menu_url)
      `
      )
      .eq("status", "active")
      .in("product_id", productIds)
      .in("product.tier", [1, 2])
  )

  // Step 3: Join events with inventory via product_id + dispensary_id
  const eventMap = new Map<string, string>()
  for (const e of events) {
    const key = `${e.product_id}:${e.dispensary_id}`
    if (!eventMap.has(key)) {
      eventMap.set(key, e.event_date)
    }
  }

  const drops: DropListing[] = []
  for (const row of inventory) {
    // Access the raw product_id and dispensary_id from the joined data
    const listing = row as unknown as InventoryListing & {
      product_id?: string
      dispensary_id?: string
    }
    const key = `${listing.product?.id}:${listing.dispensary?.id}`
    // Also try with raw FK fields
    const key2 = `${(row as Record<string, unknown>).product_id}:${(row as Record<string, unknown>).dispensary_id}`
    const eventDate = eventMap.get(key) || eventMap.get(key2)
    if (eventDate) {
      drops.push({
        ...(listing as InventoryListing),
        dropped_at: eventDate,
      })
    }
  }

  // Sort by drop date, newest first
  drops.sort(
    (a, b) => new Date(b.dropped_at).getTime() - new Date(a.dropped_at).getTime()
  )

  return drops
}

/**
 * Get all brands with products (for brand pages and filter list).
 */
export async function getBrands(): Promise<Brand[]> {
  const client = createServiceClient()
  const { data } = await client
    .from("brands")
    .select("id, canonical_name, slug, category, is_active")
    .eq("is_active", true)
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
    .select("id, canonical_name, slug, category, is_active")
    .eq("slug", slug)
    .single()

  return (data as Brand) ?? null
}
