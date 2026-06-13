import { unstable_cache } from "next/cache"
import { cache } from "react"
import { createServiceClient } from "@/lib/supabase/service-client"
import type {
  CategorySection,
  DropListing,
  InventoryListing,
  Brand,
  SearchQuery,
  SearchPage,
} from "@/lib/types"
import { resolveAlias } from "@/lib/brand-aliases"

export const SEARCH_PAGE_SIZE = 96

/**
 * Shared embedded select for inventory listings.
 * The service-role key bypasses RLS, so the 24h freshness window and
 * active-dispensary check must be applied explicitly on every query
 * (see freshListings) — they are NOT enforced by policies for us.
 */
const LISTING_SELECT = `
  id, price, original_price,
  discount_amount, discount_percent,
  thc_percent, cbd_percent,
  image_url, product_url,
  last_seen_at,
  product:product_id!inner(id, name, brand_id, brand_name, category, subcategory,
    weight_grams, weight_display, strain_type, strain_name, image_url),
  dispensary:dispensary_id!inner(id, name, slug, city, menu_url)
`

function freshnessCutoff(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function freshListings(client: any, count = false) {
  return client
    .from("current_inventory")
    .select(LISTING_SELECT, count ? { count: "exact" } : undefined)
    .gt("last_seen_at", freshnessCutoff())
    .eq("dispensary.is_active", true)
}

/** Escape LIKE wildcards for use in a single-column .ilike() filter. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Sanitize a user search term for use inside a PostgREST .or() expression,
 * where `,`, `(`, `)`, `"` and `\` are syntax characters and `%`/`_` are
 * LIKE wildcards. Stripping them (vs escaping) loses nothing meaningful
 * for product/brand searches.
 */
function sanitizeOrTerm(term: string): string {
  return term.replace(/[%_(),"\\]/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * The light catalog index: id + category + brand for every fresh listing.
 * One cached fetch powers homepage sampling, category counts, the brand
 * autocomplete list, and the search filter options — without ever shipping
 * the full catalog to the browser.
 */
const getCatalogIndex = unstable_cache(
  async (): Promise<{ id: string; category: string; brand: string }[]> => {
    const client = createServiceClient()
    const PAGE_SIZE = 1000
    const rows: { id: string; category: string; brand: string }[] = []
    let from = 0

    while (true) {
      const { data, error } = await client
        .from("current_inventory")
        .select(
          "id, product:product_id!inner(category, brand_name), dispensary:dispensary_id!inner(id)"
        )
        .gt("last_seen_at", freshnessCutoff())
        .eq("dispensary.is_active", true)
        .order("id")
        .range(from, from + PAGE_SIZE - 1)
      if (error || !data || data.length === 0) break
      for (const row of data) {
        const product = row.product as unknown as {
          category: string
          brand_name: string
        }
        rows.push({
          id: row.id as string,
          category: product.category.toLowerCase(),
          brand: product.brand_name,
        })
      }
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    return rows
  },
  ["catalog-index-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/** Unique brand names with fresh inventory, sorted — for autocomplete and filters. */
export async function getBrandNames(): Promise<string[]> {
  const index = await getCatalogIndex()
  return [...new Set(index.map((r) => r.brand))].sort()
}

/** Unique categories with fresh inventory, sorted — for filter chips. */
export async function getCategories(): Promise<string[]> {
  const index = await getCatalogIndex()
  return [...new Set(index.map((r) => r.category))].sort()
}

// Category display config — maps DB category value to homepage rail label
export const HOMEPAGE_CATEGORIES = [
  { key: "flower", label: "Flower" },
  { key: "concentrate", label: "Concentrates" },
  { key: "pre-roll", label: "Pre-Rolls" },
  { key: "vape", label: "Vapes" },
  { key: "edible", label: "Edibles" },
  { key: "topical", label: "Topicals" },
  { key: "accessory", label: "Accessories" },
] as const

const SAMPLE_PER_CATEGORY = 24

/**
 * Homepage rails: a random sample of listings per category plus the true
 * per-category counts. ~170 listings total instead of the full catalog.
 */
export const getHomepageSections = unstable_cache(
  async (): Promise<CategorySection[]> => {
    const index = await getCatalogIndex()

    const idsByCategory = new Map<string, string[]>()
    for (const row of index) {
      if (!idsByCategory.has(row.category)) idsByCategory.set(row.category, [])
      idsByCategory.get(row.category)!.push(row.id)
    }

    // Partial Fisher-Yates: pick SAMPLE_PER_CATEGORY random ids per category
    const sampledIds: string[] = []
    for (const { key } of HOMEPAGE_CATEGORIES) {
      const ids = [...(idsByCategory.get(key) ?? [])]
      const take = Math.min(SAMPLE_PER_CATEGORY, ids.length)
      for (let i = 0; i < take; i++) {
        const j = i + Math.floor(Math.random() * (ids.length - i))
        ;[ids[i], ids[j]] = [ids[j], ids[i]]
      }
      sampledIds.push(...ids.slice(0, take))
    }

    const client = createServiceClient()
    const listingById = new Map<string, InventoryListing>()
    for (let i = 0; i < sampledIds.length; i += 100) {
      const { data } = await freshListings(client).in(
        "id",
        sampledIds.slice(i, i + 100)
      )
      for (const row of (data ?? []) as unknown as InventoryListing[]) {
        listingById.set(row.id, row)
      }
    }

    const sampled = sampledIds
      .map((id) => listingById.get(id))
      .filter((l): l is InventoryListing => !!l)

    return HOMEPAGE_CATEGORIES.map(({ key, label }) => ({
      key,
      label,
      count: (idsByCategory.get(key) ?? []).length,
      listings: sampled.filter(
        (l) => l.product.category.toLowerCase() === key
      ),
    })).filter((s) => s.listings.length > 0)
  },
  ["homepage-sections-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/**
 * Server-side search over fresh inventory: filters, sort, and pagination
 * happen in Postgres; only one page of results is returned.
 * Mirrors the original client-side applyFilters semantics.
 */
export const searchListings = unstable_cache(
  async (query: SearchQuery, page: number): Promise<SearchPage> => {
    const client = createServiceClient()
    let q = freshListings(client, true)

    if (query.category) {
      // exact, case-insensitive equality (ilike without wildcards)
      q = q.ilike("product.category", escapeLike(query.category))
    }
    if (query.brand) {
      const resolved = resolveAlias(query.brand) ?? query.brand
      q = q.ilike("product.brand_name", `%${escapeLike(resolved)}%`)
    }
    if (query.dispensary) {
      q = q.eq("dispensary.slug", query.dispensary)
    }
    if (query.onSale) {
      q = q.gt("discount_amount", 0)
    }
    if (query.q) {
      const term = sanitizeOrTerm(query.q)
      const alias = resolveAlias(query.q)
      if (alias) {
        const brandTerm = sanitizeOrTerm(alias)
        q = term
          ? q.or(`brand_name.ilike.%${brandTerm}%,name.ilike.%${term}%`, {
              referencedTable: "product",
            })
          : q.ilike("product.brand_name", `%${escapeLike(alias)}%`)
      } else if (term) {
        q = q.or(`name.ilike.%${term}%,brand_name.ilike.%${term}%`, {
          referencedTable: "product",
        })
      }
    }

    switch (query.sort) {
      case "price-asc":
        q = q.order("price", { ascending: true, nullsFirst: false })
        break
      case "price-desc":
        q = q.order("price", { ascending: false, nullsFirst: false })
        break
      case "thc-desc":
        q = q.order("thc_percent", { ascending: false, nullsFirst: false })
        break
      case "name-asc":
        q = q.order("product(name)", { ascending: true })
        break
      case "newest":
        q = q.order("last_seen_at", { ascending: false })
        break
      case "brand-asc":
      default:
        q = q.order("product(brand_name)", { ascending: true })
        break
    }
    // stable tiebreaker so pagination never skips/duplicates rows
    q = q.order("id", { ascending: true })

    const from = (page - 1) * SEARCH_PAGE_SIZE
    const { data, count, error } = await q.range(
      from,
      from + SEARCH_PAGE_SIZE - 1
    )
    if (error) {
      // out-of-range page or transient error — empty page beats a 500
      console.error("searchListings error:", error.message)
      return { listings: [], total: count ?? 0, pageSize: SEARCH_PAGE_SIZE }
    }
    return {
      listings: (data ?? []) as unknown as InventoryListing[],
      total: count ?? 0,
      pageSize: SEARCH_PAGE_SIZE,
    }
  },
  ["search-listings-v1"],
  { revalidate: 600, tags: ["inventory"] }
)

const DEALS_CAP = 400

/**
 * Top deals by discount percent, capped. `total` is the uncapped count.
 */
export const getDeals = unstable_cache(
  async (): Promise<{ listings: InventoryListing[]; total: number }> => {
    const client = createServiceClient()
    const { data, count } = await freshListings(client, true)
      .gt("discount_amount", 0)
      .order("discount_percent", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(DEALS_CAP)
    return {
      listings: (data ?? []) as unknown as InventoryListing[],
      total: count ?? 0,
    }
  },
  ["deals-v1"],
  { revalidate: 900, tags: ["inventory"] }
)

/**
 * New product drops from the last 14 days, joined to fresh inventory.
 * The 14-day window is applied here (RLS only covers anon, not service role).
 */
export const getDrops = unstable_cache(
  async (): Promise<DropListing[]> => {
    const client = createServiceClient()
    const since = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: drops } = await client
      .from("product_drops")
      .select("product_id, dispensary_id, dropped_at")
      .gt("dropped_at", since)
      .order("dropped_at", { ascending: false })
      .limit(500)
    if (!drops?.length) return []

    const ids = [...new Set(drops.map((d) => d.product_id))]
    const invMap = new Map<string, InventoryListing>()
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await freshListings(client).in(
        "product_id",
        ids.slice(i, i + 100)
      )
      for (const row of (data ?? []) as unknown as (InventoryListing & {
        product: { id: string }
        dispensary: { id: string }
      })[]) {
        invMap.set(`${row.product.id}:${row.dispensary.id}`, row)
      }
    }

    const result: DropListing[] = []
    for (const d of drops) {
      const inv = invMap.get(`${d.product_id}:${d.dispensary_id}`)
      if (!inv) continue // no longer in the fresh window — skip
      result.push({ ...inv, dropped_at: d.dropped_at })
    }
    return result
  },
  ["drops-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/**
 * Single listing by ID (product detail page). React-cached so the page and
 * generateMetadata share one fetch per request.
 */
export const getListingById = cache(
  async (id: string): Promise<InventoryListing | null> => {
    const client = createServiceClient()
    const { data } = await freshListings(client).eq("id", id).maybeSingle()
    return (data as unknown as InventoryListing) ?? null
  }
)

/** All fresh listings for one brand (bounded: a brand is tens-to-hundreds of rows). */
export const getInventoryByBrand = unstable_cache(
  async (canonicalName: string): Promise<InventoryListing[]> => {
    const client = createServiceClient()
    const { data } = await freshListings(client).ilike(
      "product.brand_name",
      escapeLike(canonicalName)
    )
    const listings = (data ?? []) as unknown as InventoryListing[]
    return listings.sort((a, b) => a.product.name.localeCompare(b.product.name))
  },
  ["brand-inventory-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/** All fresh listings at one dispensary (bounded: ~1k rows max). */
export const getInventoryByDispensary = unstable_cache(
  async (dispensaryId: string): Promise<InventoryListing[]> => {
    const client = createServiceClient()
    const { data } = await freshListings(client).eq(
      "dispensary_id",
      dispensaryId
    )
    const listings = (data ?? []) as unknown as InventoryListing[]
    return listings.sort((a, b) =>
      a.product.brand_name.localeCompare(b.product.brand_name)
    )
  },
  ["dispensary-inventory-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/**
 * Get all brands (for brand pages and the sitemap).
 */
export const getBrands = unstable_cache(
  async (): Promise<Brand[]> => {
    const client = createServiceClient()
    const { data } = await client
      .from("brands")
      .select("id, canonical_name, slug, category")
      .order("canonical_name")
    return (data ?? []) as Brand[]
  },
  ["brands-v1"],
  { revalidate: 86400 }
)

/**
 * Get a single brand by slug. React-cached so the page and generateMetadata
 * share one fetch per request.
 */
export const getBrandBySlug = cache(
  async (slug: string): Promise<Brand | null> => {
    const client = createServiceClient()
    const { data } = await client
      .from("brands")
      .select("id, canonical_name, slug, category")
      .eq("slug", slug)
      .maybeSingle()
    return (data as Brand) ?? null
  }
)
