import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Product } from "@/lib/types"
import { formatPricePerDose, netWeightGrams } from "@/lib/product-units"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price for display. Returns null for missing prices.
 */
export function formatPrice(price: number | null): string | null {
  if (price == null) return null
  return `$${price.toFixed(2)}`
}

/**
 * Categories whose unit of value is the gram AND whose `weight_grams` we can
 * trust to describe what the price buys.
 *
 * Edibles and tinctures are out because their `weight_grams` is derived from
 * the THC dose (a 100mg 10-pack lands as 0.1g), so dividing by it would print
 * "$180.00/g" on an $18 bag of gummies.
 *
 * Pre-rolls are out for a different reason: on multipacks the feeds are
 * inconsistent about whether `weight_grams` is the pack or one joint, and the
 * price is always the pack. Slater Center lists "Rollups 10-pack 0.5g" as 5.0g
 * ($10.00/g, right) and "King Sherb 10-pack 0.5g" as 0.5g ($100.00/g, wrong) in
 * the same menu — verified against live inventory, where ~33% of fresh pre-roll
 * listings would print a rate 3-10x the real one. On a site whose whole claim is
 * "here is the cheaper price", a confidently wrong rate is worse than none, and
 * no name parse fixes it: a third of the bad rows carry no pack marker at all.
 * Revisit if the sync ever normalizes pack weight.
 *
 * Plural aliases are included because the filter UI passes display names.
 */
const GRAM_PRICED_CATEGORIES = new Set([
  "flower",
  "concentrate",
  "concentrates",
  "vape",
  "vapes",
])

/**
 * Whether a $/g figure means anything for this category — the single gate for
 * both showing the rate and ranking by it. Sorting by a rate the card refuses
 * to print is the worse half: a mis-listed pack weight produces a falsely low
 * $/g, which puts that listing at the TOP of "best value per gram" with no
 * printed rate on the card to contradict it.
 */
export function isGramPriced(category: string | null | undefined): boolean {
  return GRAM_PRICED_CATEGORIES.has((category ?? "").trim().toLowerCase())
}

/**
 * Unit price of a listing, in dollars per gram. Null whenever the division
 * would be meaningless or misleading.
 *
 * Defensive about the inputs because they come straight off PostgREST, which
 * hands `numeric` columns back as strings, and because a 0g weight (seen on
 * accessory rows) would otherwise divide to Infinity.
 */
export function pricePerGram(
  price: number | string | null,
  weightGrams: number | string | null
): number | null {
  if (price == null || weightGrams == null) return null
  const dollars = Number(price)
  const grams = Number(weightGrams)
  // A free/negative price and a zero/negative weight are both data errors, not
  // bargains — say nothing rather than print "$0.00/g" or "$-Infinity/g".
  if (!Number.isFinite(dollars) || dollars <= 0) return null
  if (!Number.isFinite(grams) || grams <= 0) return null
  return dollars / grams
}

/**
 * The card/page unit-price label, e.g. "$3.14/g" — the one number that makes
 * two listings of different pack sizes comparable ($88.00/28g is less than half
 * the rate of $6.00/1g, and nothing on the card used to say so). Null for
 * categories the gram doesn't price.
 *
 * Takes the whole product now rather than a bare number, because "how many
 * grams is this" is a question only `product-units` can answer — the
 * `weight_grams` column means net mass on one row and THC milligrams on the
 * next. Edibles get their own rate from `formatUnitPrice` below.
 */
export function formatPricePerGram(
  price: number | string | null,
  product: Product
): string | null {
  if (!isGramPriced(product.category)) return null
  const perGram = pricePerGram(price, netWeightGrams(product))
  return perGram == null ? null : `${formatPrice(perGram)}/g`
}

/**
 * The unit-price label for ANY category — "$3.14/g" for the gram-priced ones,
 * "$1.20/10mg" for the dose-priced ones, null where neither means anything.
 *
 * One entry point so a surface can't accidentally print a per-gram rate for a
 * gummy pack: before this existed, the card's only question was "is this
 * gram-priced?", and the 705 live edible listings that answered no simply went
 * blank rather than getting the rate that actually compares them.
 */
export function formatUnitPrice(
  price: number | string | null,
  product: Product
): string | null {
  return formatPricePerGram(price, product) ?? formatPricePerDose(price, product)
}

/**
 * Compact relative time, e.g. "just now", "12m ago", "3h ago", "2d ago".
 * Used to show how fresh an inventory price is. Computed at render time, so on
 * ISR pages it is accurate to within the route's revalidate window.
 */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  const wks = Math.floor(days / 7)
  return `${wks}w ago`
}

/** How far back /drops looks. Mirrors the window getDrops() queries. */
export const DROP_WINDOW_DAYS = 14

/**
 * Freshness badge for a drop.
 *
 * The label states the actual age rather than a mood word. "Just Dropped"
 * covered days 0–3 and "New" covered days 8–14, so a card never said when its
 * product actually landed — and because /drops sorts newest-first, every card
 * in the opening screens read "Just Dropped", making the badge pure decoration
 * exactly where a shopper is looking. The colour still tiers by recency; only
 * the wording carries the date now.
 */
export function getFreshnessBadge(droppedAt: string): {
  label: string
  className: string
} | null {
  const days = Math.floor(
    (Date.now() - new Date(droppedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (days < 0 || days > DROP_WINDOW_DAYS) return null

  const label =
    days === 0
      ? "Dropped today"
      : days === 1
        ? "Dropped yesterday"
        : `Dropped ${days}d ago`

  if (days <= 3) {
    return {
      label,
      className: "bg-emerald-950/90 text-emerald-300 border border-emerald-900/60",
    }
  }
  if (days <= 7) {
    return {
      label,
      className: "bg-emerald-950/80 text-emerald-400 border border-emerald-900/50",
    }
  }
  return { label, className: "bg-muted text-muted-foreground border-border" }
}

/**
 * Generate a URL-safe slug from a name.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
