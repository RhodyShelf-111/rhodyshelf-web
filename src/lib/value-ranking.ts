import type { InventoryListing } from "@/lib/types"
import { isGramPriced, pricePerGram } from "@/lib/utils"

/**
 * Ranking for /best-value — "most product per dollar", by price per gram.
 *
 * Three things about this data forced the shape below, all measured against
 * production rather than assumed:
 *
 * 1. `weight_grams` carries inconsistent units. Flower, vape and concentrate
 *    store real mass, but edibles and topicals mix real mass with the labelled
 *    THC milligrams divided by 1000 — a 5mg chocolate is stored as 0.005.
 *    Edible $/g therefore spans $0.06 to $35,000 with a $229 median. Those
 *    categories are excluded until the column is normalised; no outlier bound
 *    can rescue a numerator and denominator that disagree on units.
 *    (Pre-rolls store real mass but are excluded for a separate reason — see
 *    VALUE_CATEGORIES.)
 *
 * 2. Bigger formats are always cheaper per gram, so one ranking across all sizes
 *    is just an ounce list. Sizes are therefore SECTIONS, each ranked within
 *    itself — which is also how a shopper thinks, having already decided roughly
 *    how much they are buying.
 *
 * 3. Ranking by raw $/g surfaces the cheapest *grade*, not the best value: the
 *    cheapest flower in RI is shake, and the five cheapest concentrates are all
 *    kief. Bulk grades are excluded explicitly rather than hoped away.
 */

/**
 * Categories this page ranks.
 *
 * Deliberately a subset of what `weight_grams` alone would allow: it must match
 * `isGramPriced()` in @/lib/utils, which is the single site-wide gate for
 * whether a $/g figure means anything. Pre-rolls are excluded there (a
 * mis-listed pack weight produces a falsely low rate) and so are excluded here
 * — ranking a category by a rate the product card refuses to print would be the
 * worst of both. A test asserts the two stay in agreement.
 */
export const VALUE_CATEGORIES = ["flower", "vape", "concentrate"] as const

export type ValueCategory = (typeof VALUE_CATEGORIES)[number]

export function isValueCategory(c: string): c is ValueCategory {
  // Both gates, deliberately. Widening VALUE_CATEGORIES alone cannot make this
  // page rank a category whose $/g the product card refuses to print — the two
  // have to be changed together, on purpose.
  return (VALUE_CATEGORIES as readonly string[]).includes(c) && isGramPriced(c)
}

export interface SizeBand {
  /** URL/DOM-safe identifier. */
  id: string
  /** Shopper-facing name. */
  label: string
  /** Inclusive gram range. */
  min: number
  max: number
}

/**
 * Bands are ranges, never exact weights. The same physical eighth is stored as
 * 3.5 (602 rows), 3.54 (54) and 3.33 (9) depending on which scraper rounded it;
 * partitioning on the exact value would grade a product against 53 peers instead
 * of 665 purely by accident of rounding.
 *
 * Ranges are deliberately a little generous (a 4g and a 3.5g compete) because
 * $/g already normalises for weight — the band exists to separate bulk pricing
 * tiers, not to demand identical weights.
 */
export const SIZE_BANDS: Record<ValueCategory, SizeBand[]> = {
  flower: [
    { id: "gram", label: "1g", min: 0.9, max: 1.35 },
    { id: "eighth", label: "Eighths (3.5g)", min: 3.2, max: 4.1 },
    { id: "quarter", label: "Quarters (7g)", min: 6.8, max: 7.3 },
    { id: "half", label: "Half ounces (14g)", min: 13.5, max: 14.5 },
    { id: "ounce", label: "Ounces (28g)", min: 27, max: 29 },
  ],
  vape: [
    { id: "half-gram", label: "0.5g carts", min: 0.4, max: 0.6 },
    { id: "gram", label: "1g carts", min: 0.9, max: 1.1 },
    { id: "two-gram", label: "2g carts", min: 1.6, max: 2.1 },
    { id: "multi", label: "Multi-packs (3.3g)", min: 3.2, max: 3.5 },
    { id: "bulk", label: "Bulk packs (6.7g)", min: 6.5, max: 6.8 },
  ],
  concentrate: [
    { id: "half-gram", label: "0.5g", min: 0.4, max: 0.6 },
    { id: "gram", label: "1g", min: 0.9, max: 1.1 },
    { id: "two-gram", label: "2g", min: 1.6, max: 2.1 },
    { id: "three-gram", label: "3.5g", min: 3.2, max: 3.6 },
  ],
}

/**
 * A band needs enough peers for "below the going rate" to mean anything. Below
 * this the band is dropped rather than shown — a "top 10" drawn from 4 products
 * is just a list of the 4 products.
 */
export const MIN_BAND_SIZE = 20

/** Rows shown per band. */
export const ROWS_PER_BAND = 10

/** Stops one brand owning a whole section. */
export const MAX_PER_BRAND = 2

/**
 * Bulk grades and non-comparable products.
 *
 * Kief is the case that proves the list has to cover names as well as
 * `subcategory`: only 9 of the 15 kief rows carry `subcategory = 'kief'`, and
 * the unlabelled ones include the cheapest concentrate on the whole site.
 *
 * CBD/CBG/CBN products are excluded because they are cheap per gram for a
 * reason that has nothing to do with value — leaving them in makes the board
 * systematically recommend low-THC product to people shopping for THC.
 */
const EXCLUDED_NAME_PATTERNS: RegExp[] = [
  /\b(shake|popcorn|trim|smalls)\b/i,
  /\bkief\b/i,
  /\bbundle\b/i,
  /\b(cbd|cbg|cbn)\b/i,
]

/** A pack sold under `flower` is really pre-rolls; the weight is not comparable. */
const FLOWER_MULTIPACK = /\d+\s*(pk|pack)\b/i

const EXCLUDED_SUBCATEGORIES = new Set(["kief"])

/** True when a listing must not appear on the value board. */
export function isExcludedFromValue(listing: InventoryListing): boolean {
  const { name, subcategory, category } = listing.product
  if (subcategory && EXCLUDED_SUBCATEGORIES.has(subcategory.toLowerCase())) {
    return true
  }
  if (EXCLUDED_NAME_PATTERNS.some((re) => re.test(name))) return true
  if (category === "flower" && FLOWER_MULTIPACK.test(name)) return true
  return false
}

/**
 * Dollars per gram for a listing. Thin wrapper over the shared helper in
 * @/lib/utils so the page, the product card and the "cheapest per gram" sort
 * can never disagree about the arithmetic or about which inputs are valid.
 */
export function listingPricePerGram(listing: InventoryListing): number | null {
  return pricePerGram(listing.price, listing.product.weight_grams)
}

/**
 * Dollars per milligram of THC. Secondary detail only, never a ranking — it is
 * absent on roughly a quarter of flower and vape rows, and the cheapest rows
 * skew towards missing it, so ranking on it would compare a different product
 * set than the one on screen.
 *
 * Bounded to a plausible potency range per category, because `thc_percent` also
 * carries stray pack-milligram values.
 */
const PLAUSIBLE_THC: Record<ValueCategory, [number, number]> = {
  flower: [5, 40],
  vape: [30, 95],
  concentrate: [30, 95],
}

export function pricePerMgThc(listing: InventoryListing): number | null {
  const price = listing.price
  const grams = listing.product.weight_grams
  const thc = listing.thc_percent
  const category = listing.product.category
  if (price == null || price <= 0) return null
  if (grams == null || grams <= 0) return null
  if (thc == null || thc <= 0) return null
  if (!isValueCategory(category)) return null
  const [lo, hi] = PLAUSIBLE_THC[category]
  if (thc < lo || thc > hi) return null
  const mg = grams * 10 * thc // grams * 1000 * (thc/100)
  return mg > 0 ? price / mg : null
}

/** The band a weight falls in, or null when it sits outside all of them. */
export function bandFor(category: string, grams: number | null): SizeBand | null {
  if (!isValueCategory(category) || grams == null) return null
  return (
    SIZE_BANDS[category].find((b) => grams >= b.min && grams <= b.max) ?? null
  )
}

export interface ValueRow {
  listing: InventoryListing
  pricePerGram: number
  pricePerMgThc: number | null
  /** How far below the band's median this sits, as a whole percent. 0 when at or above. */
  percentBelowTypical: number
}

export interface ValueSection {
  band: SizeBand
  rows: ValueRow[]
  /** Median $/g across every qualifying listing in the band, before capping. */
  typicalPricePerGram: number
  /** Qualifying listings in the band, before the per-brand cap and row limit. */
  candidateCount: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Collapse to one row per product, keeping the cheapest listing.
 *
 * `current_inventory` is per (product, dispensary): flower alone has 1,068
 * listings across 879 products, so without this the same SKU can take three
 * slots in a top 10. The per-brand cap does not help — those rows share a brand
 * *and* a product.
 */
function cheapestPerProduct(listings: InventoryListing[]): InventoryListing[] {
  const best = new Map<string, InventoryListing>()
  for (const listing of listings) {
    const ppg = listingPricePerGram(listing)
    if (ppg == null) continue
    const key = listing.product.id
    const incumbent = best.get(key)
    if (!incumbent) {
      best.set(key, listing)
      continue
    }
    const incumbentPpg = listingPricePerGram(incumbent) ?? Infinity
    // Ties resolve on listing id so the winner is stable across revalidations.
    if (ppg < incumbentPpg || (ppg === incumbentPpg && listing.id < incumbent.id)) {
      best.set(key, listing)
    }
  }
  return [...best.values()]
}

/**
 * Deterministic ordering. The tiebreak matters more than it looks: four Growth
 * Industries kiefs price to exactly $3.00/g, and without an explicit tiebreak
 * Postgres row order decides who is "#1" and can reshuffle between
 * revalidations with no data change at all.
 */
function byValue(a: InventoryListing, b: InventoryListing): number {
  const ppgA = listingPricePerGram(a) ?? Infinity
  const ppgB = listingPricePerGram(b) ?? Infinity
  if (ppgA !== ppgB) return ppgA - ppgB
  const priceA = a.price ?? Infinity
  const priceB = b.price ?? Infinity
  if (priceA !== priceB) return priceA - priceB
  return a.product.id < b.product.id ? -1 : a.product.id > b.product.id ? 1 : 0
}

/** At most `MAX_PER_BRAND` rows per brand, preserving order. */
function capPerBrand(listings: InventoryListing[], max: number): InventoryListing[] {
  const seen = new Map<string, number>()
  const out: InventoryListing[] = []
  for (const listing of listings) {
    const brand = listing.product.brand_name || "—"
    const count = seen.get(brand) ?? 0
    if (count >= max) continue
    seen.set(brand, count + 1)
    out.push(listing)
  }
  return out
}

export interface RankOptions {
  rowsPerBand?: number
  maxPerBrand?: number
  minBandSize?: number
}

/**
 * Rank one category's listings into size-band sections, best value first.
 *
 * Returns sections in the order declared in SIZE_BANDS (smallest first), with
 * under-populated bands dropped entirely.
 */
export function rankByValue(
  listings: InventoryListing[],
  category: string,
  options: RankOptions = {}
): ValueSection[] {
  if (!isValueCategory(category)) return []
  const rowsPerBand = options.rowsPerBand ?? ROWS_PER_BAND
  const maxPerBrand = options.maxPerBrand ?? MAX_PER_BRAND
  const minBandSize = options.minBandSize ?? MIN_BAND_SIZE

  const eligible = cheapestPerProduct(
    listings.filter(
      (l) =>
        l.product.category === category &&
        !isExcludedFromValue(l) &&
        listingPricePerGram(l) != null
    )
  )

  const sections: ValueSection[] = []
  for (const band of SIZE_BANDS[category]) {
    const inBand = eligible.filter(
      (l) => bandFor(category, l.product.weight_grams)?.id === band.id
    )
    if (inBand.length < minBandSize) continue

    // Median over every candidate, not just the shown rows — the anchor has to
    // describe the market, not the top of the list.
    const typical = median(inBand.map((l) => listingPricePerGram(l) as number))

    const rows = capPerBrand([...inBand].sort(byValue), maxPerBrand)
      .slice(0, rowsPerBand)
      .map((listing) => {
        const ppg = listingPricePerGram(listing) as number
        return {
          listing,
          pricePerGram: ppg,
          pricePerMgThc: pricePerMgThc(listing),
          percentBelowTypical:
            typical > 0 && ppg < typical
              ? Math.round(((typical - ppg) / typical) * 100)
              : 0,
        }
      })

    sections.push({
      band,
      rows,
      typicalPricePerGram: typical,
      candidateCount: inBand.length,
    })
  }
  return sections
}

/** "$0.08 per mg THC" — spelled out, because the abbreviation is jargon. */
export function formatPricePerMgThc(value: number): string {
  return `$${value.toFixed(3)} per mg THC`
}

/**
 * The anchor a bare ratio needs. "$4.20/g" is trivia; "31% below the going rate
 * for eighths in RI" is a fact a shopper can act on without knowing the market.
 */
export function valueAnchor(row: ValueRow, band: SizeBand): string | null {
  if (row.percentBelowTypical < 5) return null
  return `${row.percentBelowTypical}% below the typical ${band.label.toLowerCase()} in RI`
}
