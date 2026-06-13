import type { SearchQuery } from "@/lib/types"

const VALID_SORTS = new Set([
  "price-asc",
  "price-desc",
  "thc-desc",
  "name-asc",
  "newest",
  "brand-asc",
])

type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return v || undefined
}

/**
 * Normalize raw /search URL params into a SearchQuery.
 * Shared by the search page and the /api/search load-more endpoint so both
 * resolve identical filters (and identical cache keys) for the same URL.
 */
export function parseSearchQuery(params: RawParams): SearchQuery {
  const sort = first(params.sort)
  return {
    q: first(params.q),
    category: first(params.category),
    brand: first(params.brand),
    dispensary: first(params.dispensary),
    onSale: first(params.sale) === "true" || undefined,
    sort: (sort && VALID_SORTS.has(sort)
      ? sort
      : "brand-asc") as SearchQuery["sort"],
  }
}

/** Build the /search query string for a SearchQuery (inverse of parseSearchQuery). */
export function buildSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.category) params.set("category", query.category)
  if (query.brand) params.set("brand", query.brand)
  if (query.dispensary) params.set("dispensary", query.dispensary)
  if (query.onSale) params.set("sale", "true")
  if (query.sort && query.sort !== "brand-asc") params.set("sort", query.sort)
  return params
}
