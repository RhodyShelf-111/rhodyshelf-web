import type { Product } from "@/lib/types"

/**
 * What `weight_grams` actually means, resolved per row.
 *
 * The column is a unit collision, not a dirty column: the sync writes the
 * number off `weight_display` divided by 1000 whenever the label is in
 * milligrams, and for a gummy pack that label is the TOTAL THC DOSE, not a
 * mass. Verified against the live catalog — every one of these carries
 * `weight_display = '100mg'` and `weight_grams = 0.1`:
 *
 *   "1:1 Grape Chews 10mg THC/10mg CBD 10-pack"      10mg x 10 = 100mg THC
 *   "Sour Tropic Mango Gummies - 5mg 20pk"            5mg x 20 = 100mg THC
 *   "Baja Razz [10pk] (100mg)"                                   100mg THC
 *
 * So 0.1 is not "a tenth of a gram of gummy", it is "100mg of THC" wearing a
 * mass costume — which is why edible $/g came out spanning $0.06 to $35,000
 * and why 705 live edible listings were locked out of value ranking entirely.
 *
 * The unit suffix alone is NOT the discriminator, though. Measured across the
 * live catalog, dose-priced rows use three different conventions and two of
 * them print as "mg":
 *
 *   1. THC milligrams / 1000   mg label, weight_grams < 1    ~570 live rows
 *      0.1 = "100mg" = 100mg THC. Corroborated by the names: every
 *      "5mg 20pk" and "10mg 10-pack" lands on exactly 0.1.
 *
 *   2. Flower-equivalent grams mg label, weight_grams >= 1   ~110 live rows
 *      3.33 = "3330mg". Not a mass and not a dose: 3.33g at RI's 30mg/g
 *      equivalence is 99.9mg THC, and the values are clean multiples of it
 *      (1.66 -> 50mg, 3.30/3.33 -> 100mg, 6.66 -> 200mg, 10.0 -> 300mg).
 *      "Gansett Green Apple Gummies - 20 pack" is 3.33 here, and 20 x 5mg is
 *      exactly the 100mg that implies.
 *
 *   3. Real net mass            g label, 4.3-250             ~18 live rows
 *      "250g" of cooking product. A mass, never a dose.
 *
 * Convention 2 is INTENTIONALLY REFUSED below rather than converted. The
 * 30mg/g reading is a strong inference, not a verified fact, and every rate on
 * this site is a number a shopper acts on — a confidently wrong $/dose is worse
 * than a blank one, which is the same call the pre-roll exclusion in
 * `isGramPriced` already makes. Resolve the conversion and this is a one-line
 * change; until then those rows simply carry no unit price.
 */

/** Categories where a milligram label is a THC dose rather than a net mass. */
const POTENCY_DOSED = new Set(["edible", "tincture", "topical"])

/**
 * A dose label at or above this many grams-equivalent (i.e. >= "1000mg") is
 * convention 2, not a dose. The real doses top out at a 500mg pack (0.5) and
 * the equivalence family starts at 1.5, so 1.0 splits them with room to spare —
 * and the handful of exactly-1.0 rows are genuinely ambiguous, so they fall on
 * the refusing side.
 */
const MAX_DOSE_GRAMS = 1

/** One standard dose. The industry compares edibles per 10mg, not per mg. */
export const DOSE_MG = 10

export interface ParsedWeight {
  value: number
  unit: "mg" | "g"
}

/**
 * Parse the label's magnitude and unit. Order matters: "100mg" also ends in
 * "g", so milligrams have to be tested first.
 */
export function parseWeightDisplay(
  display: string | null | undefined
): ParsedWeight | null {
  if (!display) return null
  const text = display.trim()
  const mg = /^([\d.]+)\s*mg$/i.exec(text)
  if (mg) {
    const value = Number(mg[1])
    return Number.isFinite(value) && value > 0 ? { value, unit: "mg" } : null
  }
  const g = /^([\d.]+)\s*g$/i.exec(text)
  if (g) {
    const value = Number(g[1])
    return Number.isFinite(value) && value > 0 ? { value, unit: "g" } : null
  }
  return null
}

function isPotencyDosed(category: string | null | undefined): boolean {
  return POTENCY_DOSED.has((category ?? "").trim().toLowerCase())
}

/**
 * Real net mass in grams, or null when the row doesn't carry one.
 *
 * Null is the honest answer for a 100mg gummy pack: the feed never tells us how
 * much the gummies weigh, only how much THC is in them. Returning
 * `weight_grams` there is what produced "$180.00/g" on an $18 bag.
 */
export function netWeightGrams(product: Product): number | null {
  const parsed = parseWeightDisplay(product.weight_display)
  if (parsed) {
    // A milligram label on a dose-priced category is potency, not mass.
    if (parsed.unit === "mg") {
      return isPotencyDosed(product.category) ? null : parsed.value / 1000
    }
    return parsed.value
  }
  // No parsable label. `weight_grams` is trustworthy as a mass only where the
  // category is never dose-labelled in the first place (55 live pre-rolls and
  // 9 vapes land here); for a dose-priced category we simply don't know.
  if (isPotencyDosed(product.category)) return null
  const raw = product.weight_grams == null ? NaN : Number(product.weight_grams)
  return Number.isFinite(raw) && raw > 0 ? raw : null
}

/**
 * Total THC milligrams in the package, or null when the row isn't dose-labelled
 * or its convention can't be told apart. This is the number `weight_grams` was
 * destroying by dividing by 1000.
 */
export function thcMilligrams(product: Product): number | null {
  if (!isPotencyDosed(product.category)) return null
  const parsed = parseWeightDisplay(product.weight_display)
  if (!parsed || parsed.unit !== "mg") return null
  // Convention 2: a "3330mg" label is 3.33 flower-equivalent grams, not a
  // 3,330mg dose. Refused rather than converted — see the header.
  if (parsed.value / 1000 >= MAX_DOSE_GRAMS) return null
  return parsed.value
}

/**
 * Dollars per 10mg THC — the edible equivalent of $/g, and the rate that makes
 * a 100mg 10-pack comparable to a 200mg bar.
 *
 * Defensive about the price for the same reason as `pricePerGram`: PostgREST
 * hands `numeric` back as a string, and a free/negative price is a data error
 * rather than an infinitely good deal.
 */
export function pricePerDose(
  price: number | string | null,
  product: Product
): number | null {
  const mg = thcMilligrams(product)
  if (mg == null) return null
  const dollars = price == null ? NaN : Number(price)
  if (!Number.isFinite(dollars) || dollars <= 0) return null
  return (dollars / mg) * DOSE_MG
}

/** "$1.20/10mg" — the card label, matching the shape of "$3.14/g". */
export function formatPricePerDose(
  price: number | string | null,
  product: Product
): string | null {
  const rate = pricePerDose(price, product)
  if (rate == null) return null
  return `$${rate.toFixed(2)}/${DOSE_MG}mg`
}
