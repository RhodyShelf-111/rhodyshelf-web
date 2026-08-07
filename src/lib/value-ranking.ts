import type { InventoryListing } from "@/lib/types"
import { isGramPriced, pricePerGram } from "@/lib/utils"
import {
  DOSE_MG,
  netWeightGrams,
  pricePerDose,
  thcMilligrams,
} from "@/lib/product-units"

/**
 * Ranking for /best-value — "most product per dollar", by price per gram.
 *
 * Three things about this data forced the shape below, all measured against
 * production rather than assumed:
 *
 * 1. `weight_grams` carries inconsistent units, so no category ranks on the raw
 *    column — every rate goes through @/lib/product-units, which resolves what
 *    a row's number actually means. Flower, vape and concentrate store real
 *    mass and rank per gram. Edibles store a THC dose and rank per 10mg THC,
 *    which is what "value" means for them; the ~110 live rows that store
 *    flower-equivalent grams instead are refused a rate there and so never
 *    reach this file. (Pre-rolls store real mass but are excluded for a
 *    separate reason — see VALUE_CATEGORIES.)
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
export const VALUE_CATEGORIES = [
  "flower",
  "vape",
  "concentrate",
  "edible",
] as const

export type ValueCategory = (typeof VALUE_CATEGORIES)[number]

/** What "one unit" is for a category — the thing its rate is per. */
export type ValueUnit = "gram" | "dose"

export const VALUE_UNIT: Record<ValueCategory, ValueUnit> = {
  flower: "gram",
  vape: "gram",
  concentrate: "gram",
  edible: "dose",
}

export function isValueCategory(c: string): c is ValueCategory {
  if (!(VALUE_CATEGORIES as readonly string[]).includes(c)) return false
  // Both gates for the gram categories, deliberately: widening
  // VALUE_CATEGORIES alone cannot make this page rank a category whose $/g the
  // product card refuses to print. Dose categories don't consult isGramPriced
  // (they aren't gram-priced by definition) — their gate is per row instead,
  // since only some edible rows carry a resolvable dose.
  return VALUE_UNIT[c as ValueCategory] === "dose" || isGramPriced(c)
}

export interface SizeBand {
  /** URL/DOM-safe identifier. */
  id: string
  /** Shopper-facing name. */
  label: string
  /** Inclusive range, in the category's own quantity — grams for the gram
   *  categories, total THC milligrams for the dose ones. */
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
  // Total THC milligrams per package, not grams. The bands are the real market
  // tiers: 228 live listings sit at or below 50mg (singles and small packs) and
  // 206 at the 100mg pack that dominates the shelf. Per-dose price falls hard
  // across them — median $13.50/10mg for the small ones against $2.00/10mg for
  // a 100mg pack — which is exactly why they cannot share one ranking.
  edible: [
    { id: "single", label: "Singles & small packs (up to 50mg)", min: 1, max: 50 },
    { id: "standard", label: "100mg packs", min: 51, max: 120 },
    { id: "large", label: "Large packs (200-500mg)", min: 121, max: 500 },
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
 * Stops one shop owning a whole section. Without this the 1g flower board was
 * nine rows from a single dispensary at an identical $6.00/g — technically the
 * cheapest, but it answers "who has a flat 1g price" rather than "what is good
 * value", and it hides every other shop's competing offer. Looser than the
 * brand cap so a section is never starved.
 */
export const MAX_PER_DISPENSARY = 3

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
 *
 * Reads the resolved net mass, never the raw column — `weight_grams` is a
 * different unit depending on the row.
 */
export function listingPricePerGram(listing: InventoryListing): number | null {
  return pricePerGram(listing.price, netWeightGrams(listing.product))
}

/**
 * The rate a listing is ranked and shown by, in its category's own unit:
 * dollars per gram, or dollars per 10mg THC. Null when the row carries no
 * resolvable quantity, which is the gate that keeps flower-equivalent edible
 * rows off the board entirely.
 */
export function listingUnitRate(listing: InventoryListing): number | null {
  const category = listing.product.category
  if (!isValueCategory(category)) return null
  return VALUE_UNIT[category] === "dose"
    ? pricePerDose(listing.price, listing.product)
    : listingPricePerGram(listing)
}

/**
 * The quantity that decides which band a listing falls in — grams, or total THC
 * milligrams. Same resolution as the rate, so a row can never rank in a band
 * whose quantity it doesn't actually have.
 */
export function bandQuantity(listing: InventoryListing): number | null {
  const category = listing.product.category
  if (!isValueCategory(category)) return null
  return VALUE_UNIT[category] === "dose"
    ? thcMilligrams(listing.product)
    : netWeightGrams(listing.product)
}

/** "$3.14/g" or "$1.20/10mg" — the rate label for a category's unit. */
export function formatUnitRate(rate: number, unit: ValueUnit): string {
  return unit === "dose"
    ? `$${rate.toFixed(2)}/${DOSE_MG}mg`
    : `$${rate.toFixed(2)}/g`
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
const PLAUSIBLE_THC: Partial<Record<ValueCategory, [number, number]>> = {
  flower: [5, 40],
  vape: [30, 95],
  concentrate: [30, 95],
}

export function pricePerMgThc(listing: InventoryListing): number | null {
  const price = listing.price
  const thc = listing.thc_percent
  const category = listing.product.category
  if (price == null || price <= 0) return null
  if (thc == null || thc <= 0) return null
  if (!isValueCategory(category)) return null
  // Dose categories have no percent-by-weight assay to work from, and their
  // primary rate is already per mg of THC — this would just restate it.
  const bounds = PLAUSIBLE_THC[category]
  if (!bounds) return null
  const grams = netWeightGrams(listing.product)
  if (grams == null || grams <= 0) return null
  const [lo, hi] = bounds
  if (thc < lo || thc > hi) return null
  const mg = grams * 10 * thc // grams * 1000 * (thc/100)
  return mg > 0 ? price / mg : null
}

/**
 * The band a quantity falls in, or null when it sits outside all of them. The
 * quantity is grams for gram categories and total THC milligrams for dose ones
 * — use `bandQuantity(listing)` to get the right one.
 */
export function bandFor(
  category: string,
  quantity: number | null
): SizeBand | null {
  if (!isValueCategory(category) || quantity == null) return null
  return (
    SIZE_BANDS[category].find(
      (b) => quantity >= b.min && quantity <= b.max
    ) ?? null
  )
}

export interface ValueRow {
  listing: InventoryListing
  /** The rate this row ranks on, in the section's unit. */
  unitRate: number
  pricePerMgThc: number | null
  /** How far below the band's median this sits, as a whole percent. 0 when at or above. */
  percentBelowTypical: number
}

export interface ValueSection {
  band: SizeBand
  unit: ValueUnit
  rows: ValueRow[]
  /** Median rate across every qualifying listing in the band, before capping. */
  typicalUnitRate: number
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
    const rate = listingUnitRate(listing)
    if (rate == null) continue
    const key = listing.product.id
    const incumbent = best.get(key)
    if (!incumbent) {
      best.set(key, listing)
      continue
    }
    const incumbentRate = listingUnitRate(incumbent) ?? Infinity
    // Ties resolve on listing id so the winner is stable across revalidations.
    if (
      rate < incumbentRate ||
      (rate === incumbentRate && listing.id < incumbent.id)
    ) {
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
  const ppgA = listingUnitRate(a) ?? Infinity
  const ppgB = listingUnitRate(b) ?? Infinity
  if (ppgA !== ppgB) return ppgA - ppgB
  const priceA = a.price ?? Infinity
  const priceB = b.price ?? Infinity
  if (priceA !== priceB) return priceA - priceB
  return a.product.id < b.product.id ? -1 : a.product.id > b.product.id ? 1 : 0
}

/**
 * At most `maxPerBrand` rows per brand and `maxPerDispensary` per shop,
 * preserving order. Both caps exist so a section shows the market rather than
 * one supplier's price list.
 */
function capDiversity(
  listings: InventoryListing[],
  maxPerBrand: number,
  maxPerDispensary: number
): InventoryListing[] {
  const byBrand = new Map<string, number>()
  const byShop = new Map<string, number>()
  const out: InventoryListing[] = []
  for (const listing of listings) {
    const brand = listing.product.brand_name || "—"
    const shop = listing.dispensary.id || listing.dispensary.name || "—"
    if ((byBrand.get(brand) ?? 0) >= maxPerBrand) continue
    if ((byShop.get(shop) ?? 0) >= maxPerDispensary) continue
    byBrand.set(brand, (byBrand.get(brand) ?? 0) + 1)
    byShop.set(shop, (byShop.get(shop) ?? 0) + 1)
    out.push(listing)
  }
  return out
}

export interface RankOptions {
  rowsPerBand?: number
  maxPerBrand?: number
  maxPerDispensary?: number
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
  const maxPerDispensary = options.maxPerDispensary ?? MAX_PER_DISPENSARY
  const minBandSize = options.minBandSize ?? MIN_BAND_SIZE

  const unit = VALUE_UNIT[category]
  const eligible = cheapestPerProduct(
    listings.filter(
      (l) =>
        l.product.category === category &&
        !isExcludedFromValue(l) &&
        listingUnitRate(l) != null
    )
  )

  const sections: ValueSection[] = []
  for (const band of SIZE_BANDS[category]) {
    const inBand = eligible.filter(
      (l) => bandFor(category, bandQuantity(l))?.id === band.id
    )
    if (inBand.length < minBandSize) continue

    // Median over every candidate, not just the shown rows — the anchor has to
    // describe the market, not the top of the list.
    const typical = median(inBand.map((l) => listingUnitRate(l) as number))

    const rows = capDiversity([...inBand].sort(byValue), maxPerBrand, maxPerDispensary)
      .slice(0, rowsPerBand)
      .map((listing) => {
        const rate = listingUnitRate(listing) as number
        return {
          listing,
          unitRate: rate,
          pricePerMgThc: pricePerMgThc(listing),
          percentBelowTypical:
            typical > 0 && rate < typical
              ? Math.round(((typical - rate) / typical) * 100)
              : 0,
        }
      })

    sections.push({
      band,
      unit,
      rows,
      typicalUnitRate: typical,
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
