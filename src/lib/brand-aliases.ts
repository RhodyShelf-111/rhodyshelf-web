/**
 * Brand alias mapping for search.
 * Maps common abbreviations/nicknames to canonical brand names.
 */
export const BRAND_ALIASES: Record<string, string> = {
  // The catalog stores this brand as "OSCC" (not the long form), so the alias
  // must resolve to the stored value or brand search returns 0 results.
  oscc: "OSCC",
  "ocean state curated cannabis": "OSCC",
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
