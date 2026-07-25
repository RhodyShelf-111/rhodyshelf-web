/**
 * How a free-text query is turned into matching rules. Shared by the
 * server-side search (searchListings) and the client-side grid filter
 * (applyFilters) so the two can't disagree about what a query means.
 */

/**
 * Product fields a query token is matched against.
 *
 * `strain_type` and `category` used to be missing, which broke the most
 * ordinary searches on a cannabis site: "indica" is a `strain_type` value on
 * 590 fresh listings but only appears in 14 product *names*, so the search
 * returned 2% of what the shopper asked for. Same for "vape", "hybrid",
 * "edible" — the vocabulary people actually type.
 */
export const SEARCH_FIELDS = [
  "name",
  "brand_name",
  "strain_name",
  "strain_type",
  "category",
] as const

/** Cap on tokens honoured from one query — bounds the generated filter. */
export const MAX_SEARCH_TOKENS = 6

/**
 * Split a query into the words that must ALL match (each one against any
 * field). The whole query used to be matched as a single literal substring, so
 * anything with two words found nothing unless that exact phrase appeared in a
 * product name — "sativa vape" returned 0 of the 115 sativa vapes in stock, and
 * "hybrid pre-roll" 0 of 623.
 */
export function searchTokens(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TOKENS)
}

/** One listing's searchable text, lowercased — the client-side counterpart. */
export function searchHaystack(product: {
  name: string
  brand_name: string
  strain_name: string | null
  strain_type: string | null
  category: string
}): string {
  return [
    product.name,
    product.brand_name,
    product.strain_name,
    product.strain_type,
    product.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}
