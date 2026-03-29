/**
 * Brand alias mapping for search.
 * Maps common abbreviations/nicknames to canonical brand names.
 */
export const BRAND_ALIASES: Record<string, string> = {
  oscc: "Ocean State Curated Cannabis",
  osb: "Ocean State Botanicals",
  ricc: "Rhode Island Cultivation Co",
  scc: "South County Cultivators",
  ngc: "Natural Green Choice",
}

/**
 * Resolve a search term against brand aliases.
 * Returns the canonical name if the term matches an alias, otherwise null.
 */
export function resolveAlias(term: string): string | null {
  const lower = term.toLowerCase().trim()
  return BRAND_ALIASES[lower] ?? null
}
