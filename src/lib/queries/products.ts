import { unstable_cache } from "next/cache"
import { cache } from "react"
import { createServiceClient } from "@/lib/supabase/service-client"
import type {
  CategorySection,
  DropListing,
  InventoryListing,
  UpvotedListing,
  Product,
  Dispensary,
  Brand,
  SearchQuery,
  SearchPage,
} from "@/lib/types"
import { resolveAlias } from "@/lib/brand-aliases"
import {
  brandCountsFromIndex,
  brandNamesFromIndex,
  type CatalogIndexRow,
  type CatalogScope,
} from "@/lib/filter-utils"
import { SEARCH_FIELDS, searchTokens } from "@/lib/search-terms"

export const SEARCH_PAGE_SIZE = 96

/** How many listings the category/dispensary pages serialize into the initial
 *  payload for fast first paint; the grid fetches the full set client-side. */
export const INITIAL_LISTINGS = 96

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

/**
 * Light projection for passes that only need to identify rows (the "Newest"
 * ranking scans the whole filtered set). The embeds stay `!inner` so
 * freshListings' dispensary check and the search's product filters still apply
 * — PostgREST filters on embedded columns that aren't selected, which is how
 * `dispensary.is_active` already works against LISTING_SELECT.
 */
const LISTING_ID_SELECT = `
  id, product_id, dispensary_id,
  product:product_id!inner(id),
  dispensary:dispensary_id!inner(id)
`

function freshnessCutoff(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function freshListings(client: any, count = false, select = LISTING_SELECT) {
  return client
    .from("current_inventory")
    .select(select, count ? { count: "exact" } : undefined)
    .gt("last_seen_at", freshnessCutoff())
    .eq("dispensary.is_active", true)
}

/**
 * Categories where thc_percent/cbd_percent really are percentages by weight.
 *
 * Everywhere else the feed dumps the mg dose — or a flat 100 — into the percent
 * column. Measured on the live catalog: 144 edible and 12 topical listings sit
 * at exactly 100.0, "Grape - 10mg" reports 10.0, a 90mg chocolate bar reports
 * 90.0, and a 5mg chew reports 73.3. None of those are percentages, so none of
 * them can be rendered as one or ranked against a flower's 25.4.
 */
const POTENCY_BY_WEIGHT = new Set([
  "flower",
  "pre-roll",
  "vape",
  "concentrate",
])

/** A percent-by-weight assay lives strictly inside (0, 100): no product is
 *  100% cannabinoid, and a 0 means "not assayed", not "contains none". */
function usablePercent(value: number | null): number | null {
  const n = value == null ? NaN : Number(value)
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null
}

/**
 * Blank out potency the feed can't be trusted on, at the read boundary — so
 * the card, the quick look, the product page and both sort paths all see the
 * same nulls instead of each re-litigating whether a 10mg gummy is 100% THC.
 * Returns the row untouched when nothing changed (the common case).
 */
function sanitizePotency<T extends InventoryListing>(listing: T): T {
  const byWeight = POTENCY_BY_WEIGHT.has(listing.product.category.toLowerCase())
  const thc = byWeight ? usablePercent(listing.thc_percent) : null
  const cbd = byWeight ? usablePercent(listing.cbd_percent) : null
  if (thc === listing.thc_percent && cbd === listing.cbd_percent) return listing
  return { ...listing, thc_percent: thc, cbd_percent: cbd }
}

/** Cast + sanitize one PostgREST result set of listings. */
function toListings(data: unknown): InventoryListing[] {
  return ((data ?? []) as unknown as InventoryListing[]).map(sanitizePotency)
}

/** Escape LIKE wildcards for use in a single-column .ilike() filter. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Build a double-quoted `%term%` ilike pattern for use inside a PostgREST
 * .or() expression. Quoting (vs stripping) keeps punctuation like ( ) , "
 * matchable — these appear in ~6% of product names. Escaping happens in two
 * layers: LIKE wildcards first, then the PostgREST quoted-literal syntax
 * (backslashes doubled, double quotes backslash-escaped).
 */
function orIlikePattern(term: string): string {
  const like = term.replace(/[\\%_]/g, (c) => `\\${c}`)
  const quoted = like.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `"%${quoted}%"`
}

/** Throw on PostgREST errors inside cached functions: a throw makes
 * unstable_cache / ISR keep serving the last good value, while returning
 * a degraded result would get cached for the whole revalidate window. */
function assertNoError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`)
}

/**
 * The light catalog index: id + category + brand + dispensary slug for every
 * fresh listing. One cached fetch powers homepage sampling, category counts,
 * the brand autocomplete list, and the search filter options — without ever
 * shipping the full catalog to the browser.
 */
const getCatalogIndex = unstable_cache(
  async (): Promise<CatalogIndexRow[]> => {
    const client = createServiceClient()
    const PAGE_SIZE = 1000
    const rows: CatalogIndexRow[] = []
    let from = 0

    while (true) {
      const { data, error } = await client
        .from("current_inventory")
        .select(
          "id, discount_amount, product:product_id!inner(category, brand_name), dispensary:dispensary_id!inner(id, slug)"
        )
        .gt("last_seen_at", freshnessCutoff())
        .eq("dispensary.is_active", true)
        .order("id")
        .range(from, from + PAGE_SIZE - 1)
      assertNoError(error, "getCatalogIndex")
      if (!data || data.length === 0) break
      for (const row of data) {
        const product = row.product as unknown as {
          category: string
          brand_name: string
        }
        const dispensary = row.dispensary as unknown as { slug: string }
        rows.push({
          id: row.id as string,
          category: product.category.toLowerCase(),
          brand: product.brand_name,
          dispensary: dispensary.slug,
          onSale: Number(row.discount_amount ?? 0) > 0,
        })
      }
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    return rows
  },
  // v3: rows gained the sale flag — a new key so stale v2 entries (without it)
  // can't serve brand counts that ignore the On Sale filter.
  ["catalog-index-v3"],
  { revalidate: 1800, tags: ["inventory"] }
)

/**
 * True per-brand listing counts under the active browse filters — what the
 * brand-grouped search rows label themselves with. Reads the same cached index
 * as the brand facet, so it costs no extra query.
 */
export async function getBrandCountsFor(
  scope: CatalogScope
): Promise<Record<string, number>> {
  const index = await getCatalogIndex()
  return brandCountsFromIndex(index, scope)
}

/** Unique brand names with fresh inventory, sorted — for autocomplete and filters. */
export async function getBrandNames(): Promise<string[]> {
  return getBrandNamesFor({})
}

/**
 * Brand names narrowed to a search scope: only brands with fresh inventory
 * matching the given category/dispensary, so the search page's brand facet
 * never offers a brand that would land on an empty result set.
 */
export async function getBrandNamesFor(scope: {
  category?: string
  dispensary?: string
}): Promise<string[]> {
  const index = await getCatalogIndex()
  return brandNamesFromIndex(index, scope)
}

/** Unique categories with fresh inventory, sorted — for filter chips. */
export async function getCategories(): Promise<string[]> {
  const index = await getCatalogIndex()
  return [...new Set(index.map((r) => r.category))].sort()
}

/**
 * Suggestion pool for the search autocomplete: distinct product names, brand
 * names, and strain names across fresh inventory. Built once per revalidation
 * window and held server-side — the /api/search/suggest endpoint filters it and
 * only the handful of matches ever reaches the browser (never the full catalog).
 */
export const getSuggestPool = unstable_cache(
  async (): Promise<{
    products: string[]
    brands: string[]
    strains: string[]
  }> => {
    const client = createServiceClient()
    const PAGE_SIZE = 1000
    const products = new Set<string>()
    const brands = new Set<string>()
    const strains = new Set<string>()
    let from = 0

    while (true) {
      const { data, error } = await client
        .from("current_inventory")
        .select(
          "id, product:product_id!inner(name, brand_name, strain_name), dispensary:dispensary_id!inner(id)"
        )
        .gt("last_seen_at", freshnessCutoff())
        .eq("dispensary.is_active", true)
        .order("id")
        .range(from, from + PAGE_SIZE - 1)
      assertNoError(error, "getSuggestPool")
      if (!data || data.length === 0) break
      for (const row of data) {
        const p = row.product as unknown as {
          name: string | null
          brand_name: string | null
          strain_name: string | null
        }
        if (p.name) products.add(p.name)
        if (p.brand_name) brands.add(p.brand_name)
        if (p.strain_name) strains.add(p.strain_name)
      }
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    return {
      products: [...products].sort(),
      brands: [...brands].sort(),
      strains: [...strains].sort(),
    }
  },
  ["suggest-pool-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

// The canonical category registry. Started as homepage-rail display config;
// an entry here now also creates a public indexable /category/[slug] route
// (generateStaticParams + dynamicParams=false), a sitemap entry, a footer
// link, and the product-breadcrumb link target.
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
      const { data, error } = await freshListings(client).in(
        "id",
        sampledIds.slice(i, i + 100)
      )
      assertNoError(error, "getHomepageSections")
      for (const row of toListings(data)) {
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
 * Apply every search filter (everything except sort + pagination) to a
 * listings query. Split out because "Newest" needs the same filtered set
 * twice: once light, to rank ids by drop date, and once to fetch the page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySearchFilters(q: any, query: SearchQuery): any {
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
    const term = query.q.trim()
    const alias = resolveAlias(query.q)
    if (alias) {
      // A brand nickname resolves as a whole; don't tokenize it apart.
      q = q.or(
        `brand_name.ilike.${orIlikePattern(alias)},name.ilike.${orIlikePattern(term)},strain_name.ilike.${orIlikePattern(term)}`,
        { referencedTable: "product" }
      )
    } else if (term) {
      // One .or() per token, and PostgREST ANDs successive filters — so every
      // word must match somewhere, each against any SEARCH_FIELD. That covers
      // the vocabulary shoppers actually type ("indica", "sativa vape",
      // "hybrid pre-roll"), which a single whole-query substring match missed
      // entirely.
      for (const token of searchTokens(term)) {
        const pattern = orIlikePattern(token)
        q = q.or(
          SEARCH_FIELDS.map((f) => `${f}.ilike.${pattern}`).join(","),
          { referencedTable: "product" }
        )
      }
    }
  }
  return q
}

/**
 * Arrival date for every recorded (product, dispensary) pair, keyed
 * `productId:dispensaryId`.
 *
 * product_drops is written by an in-DB trigger the first time a listing lands
 * in current_inventory, so it is the only genuine arrival signal the catalog
 * has. It covers roughly half the fresh listings — everything stocked since
 * the trigger shipped — and the rest simply predate it.
 *
 * A plain object rather than a Map: unstable_cache round-trips its value
 * through serialization, and a Map comes back empty.
 */
const getDropIndex = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const client = createServiceClient()
    const PAGE_SIZE = 1000
    const index: Record<string, string> = {}
    let from = 0

    while (true) {
      const { data, error } = await client
        .from("product_drops")
        .select("product_id, dispensary_id, dropped_at")
        // fully deterministic order — range pagination on a non-unique key
        // can otherwise skip or repeat rows across pages
        .order("product_id")
        .order("dispensary_id")
        .order("dropped_at")
        .range(from, from + PAGE_SIZE - 1)
      assertNoError(error, "getDropIndex")
      if (!data || data.length === 0) break
      for (const d of data as unknown as {
        product_id: string
        dispensary_id: string
        dropped_at: string
      }[]) {
        const key = `${d.product_id}:${d.dispensary_id}`
        // A pair can drop twice (fully purged, then restocked as a new row).
        // The latest arrival is the one a shopper means by "new".
        const prev = index[key]
        if (!prev || d.dropped_at > prev) index[key] = d.dropped_at
      }
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    return index
  },
  ["drop-index-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/**
 * Every listing id matching a search, ordered by real arrival date.
 *
 * "Newest" used to ORDER BY last_seen_at, which is when the scraper last
 * confirmed the row — every fresh listing carries one of a couple of batch
 * timestamps (its correlation with the actual drop date is -0.009; see
 * filter-utils' newestRank), so the id tiebreaker decided the page and
 * "Newest" returned UUID order. PostgREST can't join current_inventory to
 * product_drops (there is no FK between them), so the rank is applied here:
 * one light id-only scan of the filtered set, ranked against the cached drop
 * index. Cached per query so every page of a load-more run shares one scan.
 */
const getNewestSearchIds = unstable_cache(
  async (query: SearchQuery): Promise<string[]> => {
    const client = createServiceClient()
    const dropped = await getDropIndex()
    const PAGE_SIZE = 1000
    const rows: { id: string; droppedAt: string }[] = []
    let from = 0

    while (true) {
      const { data, error } = await applySearchFilters(
        freshListings(client, false, LISTING_ID_SELECT),
        query
      )
        .order("id")
        .range(from, from + PAGE_SIZE - 1)
      assertNoError(error, "getNewestSearchIds")
      if (!data || data.length === 0) break
      for (const r of data as unknown as {
        id: string
        product_id: string
        dispensary_id: string
      }[]) {
        rows.push({
          id: r.id,
          // "" for the pre-trigger rows: it sorts below every ISO timestamp,
          // which puts "arrival unknown" last where it belongs.
          droppedAt: dropped[`${r.product_id}:${r.dispensary_id}`] ?? "",
        })
      }
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    // Same-format UTC ISO strings compare correctly as strings. Ties fall back
    // to id so paging never skips or duplicates a row.
    rows.sort((a, b) => {
      if (a.droppedAt !== b.droppedAt) return a.droppedAt < b.droppedAt ? 1 : -1
      return a.id < b.id ? -1 : 1
    })
    return rows.map((r) => r.id)
  },
  ["search-newest-ids-v1"],
  { revalidate: 600, tags: ["inventory"] }
)

/** One page of the drop-date ranking: slice the ordered ids, fetch those rows,
 *  and restore the ranked order (PostgREST returns an `in` filter unordered). */
async function newestSearchPage(
  query: SearchQuery,
  page: number
): Promise<SearchPage> {
  const ids = await getNewestSearchIds(query)
  const from = (page - 1) * SEARCH_PAGE_SIZE
  const pageIds = ids.slice(from, from + SEARCH_PAGE_SIZE)
  if (pageIds.length === 0) {
    return { listings: [], total: ids.length, pageSize: SEARCH_PAGE_SIZE }
  }

  const client = createServiceClient()
  const { data, error } = await freshListings(client).in("id", pageIds)
  assertNoError(error, "searchListings newest")
  const byId = new Map(toListings(data).map((l) => [l.id, l]))

  return {
    listings: pageIds
      .map((id) => byId.get(id))
      .filter((l): l is InventoryListing => !!l),
    total: ids.length,
    pageSize: SEARCH_PAGE_SIZE,
  }
}

/** Whether a THC ranking can say anything about this search: false once the
 *  shopper has pinned a category with no percent-by-weight assay. */
function rankableByPotency(query: SearchQuery): boolean {
  return !query.category || POTENCY_BY_WEIGHT.has(query.category.toLowerCase())
}

/**
 * One page of a column-ordered search — every sort except "Newest".
 * `rankPotency` is false on the retry that gives up on the THC ranking because
 * nothing in the result set carries a real assay (see searchListings).
 */
async function sortedSearchPage(
  query: SearchQuery,
  page: number,
  rankPotency: boolean
): Promise<SearchPage> {
  const client = createServiceClient()
  let q = applySearchFilters(freshListings(client, true), query)

  switch (query.sort) {
    case "price-asc":
      q = q.order("price", { ascending: true, nullsFirst: false })
      break
    case "price-desc":
      q = q.order("price", { ascending: false, nullsFirst: false })
      break
    case "thc-desc":
      // thc_percent is only a percentage for the weight-dosed categories
      // (see sanitizePotency), so a raw ORDER BY handed the top of the page
      // to 96 gummies claiming 100% THC and pushed every flower off it.
      // Rank only the rows whose potency survives sanitization.
      if (rankPotency && rankableByPotency(query)) {
        q = q
          .in("product.category", [...POTENCY_BY_WEIGHT])
          .gt("thc_percent", 0)
          .lt("thc_percent", 100)
          .order("thc_percent", { ascending: false, nullsFirst: false })
      } else {
        // Nothing here has a real assay — a pinned edible/accessory category,
        // or a search like "gummy". Keep the rows and let the default order
        // stand rather than answering a potency question with "0 results".
        q = q.order("product(brand_name)", { ascending: true })
      }
      break
    case "name-asc":
      q = q.order("product(name)", { ascending: true })
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
    // PGRST103 = requested range past the end: a genuinely empty page.
    // Anything else throws so the error is not cached (callers catch).
    if (error.code === "PGRST103") {
      return { listings: [], total: count ?? 0, pageSize: SEARCH_PAGE_SIZE }
    }
    throw new Error(`searchListings: ${error.message}`)
  }
  return {
    listings: toListings(data),
    total: count ?? 0,
    pageSize: SEARCH_PAGE_SIZE,
  }
}

/**
 * Server-side search over fresh inventory: filters, sort, and pagination
 * happen in Postgres; only one page of results is returned.
 * Mirrors the original client-side applyFilters semantics.
 */
export const searchListings = unstable_cache(
  async (query: SearchQuery, page: number): Promise<SearchPage> => {
    // "Newest" can't be expressed as a column ORDER BY — see newestSearchPage.
    if (query.sort === "newest") return newestSearchPage(query, page)

    const result = await sortedSearchPage(query, page, true)
    // The potency rank keeps only rows with a real assay, and for a search like
    // "gummy" or "tincture" that is none of them — so ranking would answer "No
    // products found" over 47 genuine matches, which reads as "we don't carry
    // that". A sort must never delete the result set, so drop the ranking when
    // nothing in the set is rankable. (rankableByPotency catches the pinned-
    // category form up front; q/brand/dispensary can only be found by asking.)
    if (query.sort === "thc-desc" && result.total === 0) {
      return sortedSearchPage(query, page, false)
    }
    return result
  },
  ["search-listings-v3"],
  { revalidate: 600, tags: ["inventory"] }
)

const DEALS_CAP = 400

/**
 * Top deals by discount percent, capped. `total` is the uncapped count.
 */
export const getDeals = unstable_cache(
  async (): Promise<{ listings: InventoryListing[]; total: number }> => {
    const client = createServiceClient()
    const { data, count, error } = await freshListings(client, true)
      .gt("discount_amount", 0)
      .order("discount_percent", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(DEALS_CAP)
    assertNoError(error, "getDeals")
    return { listings: toListings(data), total: count ?? 0 }
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

    const { data: drops, error: dropsError } = await client
      .from("product_drops")
      .select("product_id, dispensary_id, dropped_at")
      .gt("dropped_at", since)
      .order("dropped_at", { ascending: false })
      .limit(500)
    assertNoError(dropsError, "getDrops")
    if (!drops?.length) return []

    const ids = [...new Set(drops.map((d) => d.product_id))]
    const invMap = new Map<string, InventoryListing>()
    for (let i = 0; i < ids.length; i += 50) {
      const { data, error } = await freshListings(client).in(
        "product_id",
        ids.slice(i, i + 50)
      )
      assertNoError(error, "getDrops inventory")
      for (const row of toListings(data)) {
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

// A non-UUID id makes PostgREST reject the `.eq("id", …)` on the uuid column
// (it throws), so short-circuit to null and let every caller degrade to a clean
// not-found — the full page → notFound(), generateMetadata → "Product Not
// Found", the /api/product/[id] drawer fallback → 404 — instead of a 500.
const LISTING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Single listing by ID (full product page + quick-look drawer fallback).
 * React-cached so the page and generateMetadata share one fetch per request.
 * Deliberately NOT data-cached across requests: both the public /product/[id]
 * page and the public /api/product/[id] fallback call this with a URL-supplied
 * id, so persisting per-id (including not-found) results would let a random-id
 * flood pump the data cache full of nulls. The full page is ISR-cached at the
 * route level (revalidate = 1800); found API responses are CDN-cached via
 * s-maxage.
 */
export const getListingById = cache(
  async (id: string): Promise<InventoryListing | null> => {
    if (!LISTING_ID_RE.test(id)) return null
    const client = createServiceClient()
    const { data, error } = await freshListings(client)
      .eq("id", id)
      .maybeSingle()
    assertNoError(error, "getListingById")
    return data ? sanitizePotency(data as unknown as InventoryListing) : null
  }
)

/** Hard cap on how many saved products we resolve in one /saved request. */
export const SAVED_MAX = 200

/** Sort key that pushes null/missing prices to the end. */
function rankPrice(price: number | null): number {
  return price == null ? Number.POSITIVE_INFINITY : price
}

// Stand-in dispensary for a synthetic out-of-stock card (product fully purged
// from inventory). The Saved card hides the dispensary chip when out of stock,
// so these empty fields never surface.
const PLACEHOLDER_DISPENSARY: Dispensary = {
  id: "",
  name: "",
  slug: "",
  city: null,
  menu_url: null,
}

/** Build an out-of-stock card straight from a products row (no inventory left). */
function synthesizeUpvotedListing(product: Product): UpvotedListing {
  return {
    id: `product:${product.id}`, // synthetic — not a real current_inventory id
    price: null,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: null,
    cbd_percent: null,
    image_url: null,
    product_url: null,
    last_seen_at: "",
    product,
    dispensary: PLACEHOLDER_DISPENSARY,
    inStock: false,
    dispensaryCount: 0,
  }
}

/**
 * Resolve a set of upvoted product ids to ONE representative listing each,
 * annotated with live stock status — so the Saved page shows every upvoted
 * product (in stock or not) with no per-dispensary duplicates.
 *
 * A product can sit at several dispensaries and go stale at different times, so
 * each product collapses to a single card:
 *   • in stock → the cheapest listing that is fresh (< 24h) at an active
 *     dispensary; dispensaryCount = how many active dispensaries carry it now.
 *   • out of stock → the most-recently-seen listing (last-known price/shop), or
 *     — once every inventory snapshot has been purged — a synthetic card built
 *     from the products row so the upvote never silently disappears.
 *
 * The service-role key bypasses RLS, so the 24h window and active-dispensary
 * check are applied here rather than by policy. Not cached (input is per-visitor
 * and unbounded).
 */
export async function getUpvotedListings(
  productIds: string[]
): Promise<UpvotedListing[]> {
  const ids = [...new Set(productIds)].slice(0, SAVED_MAX)
  if (ids.length === 0) return []

  const client = createServiceClient()
  const cutoffMs = Date.now() - 24 * 60 * 60 * 1000

  // Every listing for these products at ACTIVE dispensaries — fresh OR stale.
  // (No freshness filter here: stale rows are what let out-of-stock upvotes
  // still render with their last-known price and shop.)
  const rowsByProduct = new Map<string, InventoryListing[]>()
  for (let i = 0; i < ids.length; i += 50) {
    const { data, error } = await client
      .from("current_inventory")
      .select(LISTING_SELECT)
      .in("product_id", ids.slice(i, i + 50))
      .eq("dispensary.is_active", true)
    assertNoError(error, "getUpvotedListings")
    for (const row of toListings(data)) {
      const list = rowsByProduct.get(row.product.id)
      if (list) list.push(row)
      else rowsByProduct.set(row.product.id, [row])
    }
  }

  const byProduct = new Map<string, UpvotedListing>()
  for (const [pid, rows] of rowsByProduct) {
    const fresh = rows.filter((r) => new Date(r.last_seen_at).getTime() > cutoffMs)
    if (fresh.length > 0) {
      // Cheapest fresh listing represents the product; count the distinct shops.
      const cheapest = fresh.reduce((best, r) =>
        rankPrice(r.price) < rankPrice(best.price) ? r : best
      )
      const dispensaryCount = new Set(fresh.map((r) => r.dispensary.id)).size
      byProduct.set(pid, { ...cheapest, inStock: true, dispensaryCount })
    } else {
      // Out of stock: surface the most recently seen listing's last-known info.
      const mostRecent = rows.reduce((best, r) =>
        r.last_seen_at > best.last_seen_at ? r : best
      )
      byProduct.set(pid, { ...mostRecent, inStock: false, dispensaryCount: 0 })
    }
  }

  // Products whose inventory has been fully purged: synthesize from products so
  // the upvote still shows as out of stock instead of vanishing.
  const missing = ids.filter((id) => !byProduct.has(id))
  for (let i = 0; i < missing.length; i += 50) {
    const { data, error } = await client
      .from("products")
      .select(
        "id, name, brand_id, brand_name, category, subcategory, weight_grams, weight_display, strain_type, strain_name, image_url"
      )
      .in("id", missing.slice(i, i + 50))
    assertNoError(error, "getUpvotedListings products")
    for (const p of (data ?? []) as unknown as Product[]) {
      byProduct.set(p.id, synthesizeUpvotedListing(p))
    }
  }

  // Preserve the caller's order (client sends most-recently-saved first).
  return ids
    .map((id) => byProduct.get(id))
    .filter((l): l is UpvotedListing => !!l)
}

/**
 * Range-paginated fetch: PostgREST caps every response at max_rows=1000
 * regardless of requested range, so any potentially-large fetch must loop.
 * Builders are mutable, so a fresh query is built per page.
 */
async function fetchAllListings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildQuery: () => any,
  context: string
): Promise<InventoryListing[]> {
  const PAGE_SIZE = 1000
  const rows: InventoryListing[] = []
  let from = 0
  while (true) {
    const { data, error } = await buildQuery()
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
    assertNoError(error, context)
    if (!data || data.length === 0) break
    rows.push(...toListings(data))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

/** All fresh listings for one brand. */
export const getInventoryByBrand = unstable_cache(
  async (canonicalName: string): Promise<InventoryListing[]> => {
    const client = createServiceClient()
    const listings = await fetchAllListings(
      () =>
        freshListings(client).ilike(
          "product.brand_name",
          escapeLike(canonicalName)
        ),
      "getInventoryByBrand"
    )
    return listings.sort((a, b) => a.product.name.localeCompare(b.product.name))
  },
  ["brand-inventory-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/** All fresh listings in one category (DB category value, e.g. "flower").
 *  Powers the category page's server render (first slice) and the /api/listings
 *  full-set fetch — one cached source, so both see one consistent snapshot. */
export const getInventoryByCategory = unstable_cache(
  async (category: string): Promise<InventoryListing[]> => {
    const client = createServiceClient()
    const listings = await fetchAllListings(
      () =>
        freshListings(client).ilike(
          "product.category",
          escapeLike(category)
        ),
      "getInventoryByCategory"
    )
    return listings.sort((a, b) =>
      a.product.brand_name.localeCompare(b.product.brand_name)
    )
  },
  ["category-inventory-v1"],
  { revalidate: 1800, tags: ["inventory"] }
)

/** All fresh listings at one dispensary (the largest store is ~925 rows and
 *  growing). Filters by dispensary_id, so it's robust to rows with a null slug
 *  (unlike a slug-based query). */
export const getInventoryByDispensary = unstable_cache(
  async (dispensaryId: string): Promise<InventoryListing[]> => {
    const client = createServiceClient()
    const listings = await fetchAllListings(
      () => freshListings(client).eq("dispensary_id", dispensaryId),
      "getInventoryByDispensary"
    )
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
    const { data, error } = await client
      .from("brands")
      .select("id, canonical_name, slug, category")
      .order("canonical_name")
    assertNoError(error, "getBrands")
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
    const { data, error } = await client
      .from("brands")
      .select("id, canonical_name, slug, category")
      .eq("slug", slug)
      .maybeSingle()
    assertNoError(error, "getBrandBySlug")
    return (data as Brand) ?? null
  }
)

/**
 * Every fresh listing id (+ last-seen timestamp) for the XML sitemap. Light
 * id-level scan of current_inventory (no product/dispensary embed beyond the
 * active-dispensary join), paginated past PostgREST's 1000-row cap. Cached
 * daily to match the sitemap's revalidate window.
 */
export const getSitemapListings = unstable_cache(
  async (): Promise<
    { id: string; lastModified: string; image: string | null }[]
  > => {
    const client = createServiceClient()
    const rows: { id: string; lastModified: string; image: string | null }[] =
      []
    const PAGE_SIZE = 1000
    let from = 0
    while (true) {
      const { data, error } = await client
        .from("current_inventory")
        .select(
          "id, last_seen_at, image_url, dispensary:dispensary_id!inner(is_active)"
        )
        .eq("dispensary.is_active", true)
        .gt("last_seen_at", freshnessCutoff())
        .order("id")
        .range(from, from + PAGE_SIZE - 1)
      assertNoError(error, "getSitemapListings")
      if (!data || data.length === 0) break
      for (const row of data as unknown as {
        id: string
        last_seen_at: string
        image_url: string | null
      }[]) {
        rows.push({
          id: row.id,
          lastModified: row.last_seen_at,
          image: row.image_url,
        })
      }
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    return rows
  },
  ["sitemap-listings-v2"],
  { revalidate: 86400, tags: ["inventory"] }
)
