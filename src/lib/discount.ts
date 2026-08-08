/**
 * Discounts, derived rather than repeated.
 *
 * `current_inventory.discount_percent` and `.discount_amount` come straight off
 * the dispensary feeds, and both lie. Measured against live inventory on
 * 2026-08-08, two distinct ways:
 *
 *   - Astropop at Slater Center: price $6.00, original $7.00 — a 14.3% markdown
 *     — carrying `discount_percent = 100`. /deals orders by that column, so the
 *     single most wrong row in the catalog was guaranteed the top slot on the
 *     one page whose whole job is "we found you a deal".
 *   - Four Rise Warwick listings with `discount_amount` equal to the ENTIRE
 *     price ($50 off a $50 item) while `original_price == price`. No markdown
 *     exists, but every on-sale test in the app was `(discount_amount ?? 0) > 0`,
 *     so all four wore an "On Sale" badge.
 *
 * Only 5 of 4,460 fresh rows are wrong, which is exactly why this went unnoticed:
 * the error rate is 0.1%, and the ranking sorts the worst of it to the top.
 *
 * So nothing here reads those two columns. A discount is real only if the two
 * prices we can independently see disagree in the right direction, and the size
 * of it is arithmetic on those prices. If we can't verify it, we don't claim it.
 */

export interface VerifiedDiscount {
  /** The struck-through price. Always greater than the price paid. */
  originalPrice: number
  /** Money saved, in dollars. */
  amount: number
  /** 0–100, exclusive of 0. */
  percent: number
}

interface PricePair {
  price: number | null
  original_price: number | null
}

function usable(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

/**
 * The single source of truth for "is this on sale, and by how much".
 *
 * Returns null unless both prices are present, the original is positive, and it
 * is strictly greater than what you'd pay — which also makes the badge and the
 * struck-through price one decision instead of two that can disagree.
 */
export function verifiedDiscount(listing: PricePair): VerifiedDiscount | null {
  const { price, original_price: originalPrice } = listing
  if (!usable(price) || !usable(originalPrice)) return null
  // A non-positive original makes the percentage meaningless (and, at zero,
  // a division by zero). A markdown to a higher price is not a markdown.
  if (originalPrice <= 0 || originalPrice <= price) return null

  const amount = originalPrice - price
  return {
    originalPrice,
    amount,
    percent: (amount / originalPrice) * 100,
  }
}

/** Convenience for the many places that only need the yes/no. */
export function isOnSale(listing: PricePair): boolean {
  return verifiedDiscount(listing) !== null
}

/**
 * Sort comparator for "biggest markdown first", with a verified percentage.
 * Anything unverifiable sorts last rather than being silently treated as 0%,
 * so a feed that starts emitting nulls degrades into "no deals" rather than
 * "everything is a deal".
 */
export function byDiscountDesc(a: PricePair, b: PricePair): number {
  return (verifiedDiscount(b)?.percent ?? -1) - (verifiedDiscount(a)?.percent ?? -1)
}
