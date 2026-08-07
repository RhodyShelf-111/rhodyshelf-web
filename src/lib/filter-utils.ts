import type {
  Dispensary,
  DropListing,
  InventoryListing,
  ProductFilters,
} from "@/lib/types"
import { resolveAlias } from "@/lib/brand-aliases"
import { searchHaystack, searchTokens } from "@/lib/search-terms"
import { pricePerGram } from "@/lib/utils"

export interface FacetOptions {
  categories: string[]
  brands: string[]
  dispensaries: Dispensary[]
  strainTypes: string[]
}

/**
 * Options for each filter facet, derived from the listings that match every
 * OTHER active filter (classic faceted narrowing): pick a dispensary and the
 * brand list shrinks to brands that dispensary actually stocks under the
 * current category/price/sale constraints — never to brands that would
 * return an empty grid.
 *
 * A facet never narrows by its own filter (the brand list with a brand
 * selected still shows the alternatives), and a selected value is kept in
 * its own list even when the other filters orphan it, so it can always be
 * seen and unchecked.
 */
export function deriveFacetOptions(
  listings: InventoryListing[],
  filters: ProductFilters
): FacetOptions {
  const matching = (facet: keyof ProductFilters) =>
    // Sort is irrelevant to option derivation — strip it so the four
    // passes don't each pay for an unused array sort.
    applyFilters(listings, { ...filters, [facet]: undefined, sort: undefined })

  const categories = [
    ...new Set(matching("category").map((l) => l.product.category)),
  ]
  if (
    filters.category &&
    !categories.some(
      (c) => c.toLowerCase() === filters.category!.toLowerCase()
    )
  ) {
    categories.push(filters.category)
  }
  categories.sort()

  const brands = [
    ...new Set(matching("brand").map((l) => l.product.brand_name)),
  ]
  if (filters.brand && !brands.includes(filters.brand)) {
    brands.push(filters.brand)
  }
  brands.sort()

  const dispensaryMap = new Map(
    matching("dispensary").map((l) => [l.dispensary.slug, l.dispensary])
  )
  if (filters.dispensary && !dispensaryMap.has(filters.dispensary)) {
    const selected = listings.find(
      (l) => l.dispensary.slug === filters.dispensary
    )
    if (selected) dispensaryMap.set(selected.dispensary.slug, selected.dispensary)
  }
  const dispensaries = [...dispensaryMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const strainTypes = [
    ...new Set(
      matching("strainType")
        .map((l) => l.product.strain_type)
        .filter(Boolean)
    ),
  ] as string[]
  if (
    filters.strainType &&
    !strainTypes.some(
      (s) => s.toLowerCase() === filters.strainType!.toLowerCase()
    )
  ) {
    strainTypes.push(filters.strainType)
  }
  strainTypes.sort()

  return { categories, brands, dispensaries, strainTypes }
}

/** One row of the server-side catalog index (see getCatalogIndex). */
export interface CatalogIndexRow {
  id: string
  /** lowercased */
  category: string
  brand: string
  /** dispensary slug */
  dispensary: string
  /** discounted right now — lets counts respect the On Sale filter */
  onSale: boolean
}

/** The filters a brand-grouped browse can have active. Keyword and brand are
 *  excluded on purpose: both switch the page to a flat grid, so no brand
 *  grouping (and no per-brand count) is rendered for them. */
export interface CatalogScope {
  category?: string
  dispensary?: string
  onSale?: boolean
}

function inScope(row: CatalogIndexRow, scope: CatalogScope): boolean {
  if (scope.category && row.category !== scope.category.toLowerCase()) return false
  if (scope.dispensary && row.dispensary !== scope.dispensary) return false
  if (scope.onSale && !row.onSale) return false
  return true
}

/**
 * How many fresh listings each brand has under the active filters.
 *
 * The brand-grouped results only ever hold one loaded page (96 rows), so
 * counting the rendered cards undercounts every brand with more than that
 * share — "Mother Earth Wellness · 9 products" when the real answer under a
 * Concentrate filter was 36. Counting from the cached catalog index gives the
 * true, scope-aware number without another query.
 */
export function brandCountsFromIndex(
  rows: CatalogIndexRow[],
  scope: CatalogScope = {}
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    if (!inScope(row, scope)) continue
    counts[row.brand] = (counts[row.brand] ?? 0) + 1
  }
  return counts
}

/**
 * Brand names present in the catalog-index rows that match a
 * category/dispensary scope — powers the search page's brand facet so it
 * only offers brands with results under the active filters.
 */
export function brandNamesFromIndex(
  rows: CatalogIndexRow[],
  scope: { category?: string; dispensary?: string } = {}
): string[] {
  const brands = new Set<string>()
  for (const row of rows) {
    // Deliberately ignores onSale: the facet lists brands you could switch to,
    // and the sale toggle is applied on top of whichever you pick.
    if (!inScope(row, { ...scope, onSale: undefined })) continue
    brands.add(row.brand)
  }
  return [...brands].sort()
}

/**
 * Sort key for "Newest".
 *
 * `last_seen_at` is when the scraper last confirmed a listing, not when the
 * product arrived — every fresh listing carries one of a couple of batch
 * timestamps (measured: 827 drops span just 2 distinct hours, and its
 * correlation with the real drop date is -0.009). So on /drops it ranked by
 * scrape batch, and only stayed in drop order by luck: the key is near-constant
 * and Array#sort is stable, so the server's `dropped_at desc` order survived
 * untouched. Spread the scrape out and "Newest" would have quietly scrambled.
 *
 * A DropListing knows when it actually dropped, so prefer that.
 */
function newestRank(listing: InventoryListing): number {
  // applyFilters is typed on InventoryListing, but /drops passes DropListings
  // through it — narrow rather than widen the signature for one caller.
  const { dropped_at } = listing as Partial<DropListing>
  const t = new Date(dropped_at ?? listing.last_seen_at).getTime()
  // An unparseable timestamp sorts last instead of poisoning every comparison
  // with NaN (which would leave the whole list in an arbitrary order).
  return Number.isNaN(t) ? -Infinity : t
}

export function applyFilters(
  listings: InventoryListing[],
  filters: ProductFilters
): InventoryListing[] {
  let result = listings

  if (filters.category) {
    result = result.filter(
      (l) => l.product.category.toLowerCase() === filters.category!.toLowerCase()
    )
  }

  if (filters.brand) {
    const resolved = resolveAlias(filters.brand) ?? filters.brand
    result = result.filter((l) =>
      l.product.brand_name.toLowerCase().includes(resolved.toLowerCase())
    )
  }

  if (filters.dispensary) {
    result = result.filter((l) => l.dispensary.slug === filters.dispensary)
  }

  if (filters.strainType) {
    result = result.filter(
      (l) =>
        l.product.strain_type?.toLowerCase() ===
        filters.strainType!.toLowerCase()
    )
  }

  if (filters.minPrice != null) {
    result = result.filter((l) => (l.price ?? 0) >= filters.minPrice!)
  }

  if (filters.maxPrice != null) {
    result = result.filter(
      (l) => l.price != null && l.price <= filters.maxPrice!
    )
  }

  if (filters.minThc != null) {
    result = result.filter(
      (l) => (l.thc_percent ?? 0) >= filters.minThc!
    )
  }

  if (filters.onSale) {
    result = result.filter((l) => (l.discount_amount ?? 0) > 0)
  }

  if (filters.search) {
    const term = filters.search.toLowerCase()
    const aliasResolved = resolveAlias(term)
    if (aliasResolved) {
      // A brand nickname resolves as a whole; don't tokenize it apart.
      const alias = aliasResolved.toLowerCase()
      result = result.filter(
        (l) =>
          l.product.brand_name.toLowerCase().includes(alias) ||
          l.product.name.toLowerCase().includes(term)
      )
    } else {
      // Same rule as the server-side search: every word must match somewhere,
      // each against any searchable field.
      const tokens = searchTokens(term)
      result = result.filter((l) => {
        const haystack = searchHaystack(l.product)
        return tokens.every((t) => haystack.includes(t))
      })
    }
  }

  // Sort
  switch (filters.sort) {
    case "price-asc":
      result = [...result].sort(
        (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)
      )
      break
    case "price-desc":
      result = [...result].sort(
        (a, b) => (b.price ?? 0) - (a.price ?? 0)
      )
      break
    // The only ordering that answers "which is actually the better deal".
    // Sorting by raw price puts a $6 gram above an $88 ounce that costs $3.14
    // a gram. Listings with no meaningful $/g (edibles, accessories) sort last
    // rather than to the top, where an Infinity-free comparison would put them.
    case "unit-price-asc":
      result = [...result].sort((a, b) => {
        const ua = pricePerGram(a.price, a.product.weight_grams)
        const ub = pricePerGram(b.price, b.product.weight_grams)
        return (ua ?? Infinity) - (ub ?? Infinity)
      })
      break
    case "thc-desc":
      result = [...result].sort(
        (a, b) => (b.thc_percent ?? 0) - (a.thc_percent ?? 0)
      )
      break
    case "name-asc":
      result = [...result].sort((a, b) =>
        a.product.name.localeCompare(b.product.name)
      )
      break
    case "newest":
      result = [...result].sort((a, b) => newestRank(b) - newestRank(a))
      break
    case "brand-asc":
      result = [...result].sort((a, b) =>
        a.product.brand_name.localeCompare(b.product.brand_name)
      )
      break
    case "discount-desc":
      result = [...result].sort(
        (a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0)
      )
      break
  }

  return result
}
