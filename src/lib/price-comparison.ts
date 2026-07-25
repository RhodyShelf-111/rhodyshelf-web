import type { InventoryListing } from "@/lib/types"

/**
 * Cross-dispensary price comparison — the site's core promise, applied to the
 * one page where a visitor is about to act on a price.
 *
 * Dispensary feeds don't share product ids: the same SKU carried by three shops
 * usually lands as three `products` rows, so `product_id` only links ~4% of the
 * catalog. Matching on brand + normalized name + pack size instead links ~12%
 * of fresh listings, which is where the real spreads live (A-1 Herb Co. "OGKB
 * V2" 3.5g: $18 at Aura, $30 at Solar, $35 at Newport).
 *
 * Brand equality is the caller's job — it passes the brand's cached listing
 * set, so a comparison costs no extra query.
 */

/** Collapse a product name to its comparable core: "OGKB V2" ≡ "ogkb-v2". */
export function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Same product, same size? Category is checked too, so a brand that names an
 * edible and a pre-roll alike can't cross-match.
 */
export function isSameProduct(
  a: InventoryListing,
  b: InventoryListing
): boolean {
  return (
    normalizeProductName(a.product.name) ===
      normalizeProductName(b.product.name) &&
    a.product.category.toLowerCase() === b.product.category.toLowerCase() &&
    // Numeric compare: PostgREST hands back `numeric` columns as strings.
    // A null weight only matches another null weight, so an unsized listing
    // never gets compared against a 3.5g one.
    (a.product.weight_grams == null || b.product.weight_grams == null
      ? a.product.weight_grams == null && b.product.weight_grams == null
      : Number(a.product.weight_grams) === Number(b.product.weight_grams))
  )
}

export interface PriceComparisonRow {
  listing: InventoryListing
  /** The listing whose page this is. */
  isCurrent: boolean
  /** Ties count: two shops at the same lowest price are both cheapest. */
  isCheapest: boolean
  /** Price minus the current listing's price. Null if either side has no price. */
  delta: number | null
}

export interface PriceComparison {
  rows: PriceComparisonRow[]
  /** What the visitor saves by buying at the cheapest row instead of this one. */
  savings: number | null
  /** True when no other shop beats the current listing's price. */
  currentIsCheapest: boolean
}

/** Sort key that pushes null/missing prices to the end. */
function rankPrice(price: number | null): number {
  return price == null ? Number.POSITIVE_INFINITY : price
}

/**
 * Build the comparison table for `current` out of its brand's fresh listings.
 * Returns null when no other dispensary carries it — the panel is hidden then,
 * rather than rendering a table of one.
 *
 * One row per dispensary (a shop listing the same product twice collapses to
 * its cheaper row), except that `current` always represents its own shop so
 * the "you're viewing this one" marker can't land on a sibling listing.
 */
export function buildPriceComparison(
  current: InventoryListing,
  brandListings: InventoryListing[]
): PriceComparison | null {
  const byDispensary = new Map<string, InventoryListing>()
  byDispensary.set(current.dispensary.id, current)

  for (const l of brandListings) {
    if (l.dispensary.id === current.dispensary.id) continue
    if (!isSameProduct(current, l)) continue
    const held = byDispensary.get(l.dispensary.id)
    if (!held || rankPrice(l.price) < rankPrice(held.price)) {
      byDispensary.set(l.dispensary.id, l)
    }
  }

  if (byDispensary.size < 2) return null

  const listings = [...byDispensary.values()].sort(
    (a, b) => rankPrice(a.price) - rankPrice(b.price)
  )
  const lowest = listings.reduce(
    (min, l) => Math.min(min, rankPrice(l.price)),
    Number.POSITIVE_INFINITY
  )

  const rows = listings.map((l) => ({
    listing: l,
    isCurrent: l.id === current.id,
    isCheapest: l.price != null && l.price === lowest,
    delta:
      l.price != null && current.price != null ? l.price - current.price : null,
  }))

  // Only a real, positive gap counts as savings — an unpriced current listing
  // has nothing to compare against.
  const savings =
    current.price != null && lowest < current.price
      ? current.price - lowest
      : null

  return { rows, savings, currentIsCheapest: savings == null }
}
