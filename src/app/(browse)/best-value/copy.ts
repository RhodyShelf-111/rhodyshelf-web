import type { ValueCategory, ValueUnit } from "@/lib/value-ranking"

/**
 * Copy lives here so the wording is identical across the index page, the
 * category pages, their metadata, and the sitemap.
 *
 * The vocabulary distinction that matters, and which the pages must never blur:
 *   /deals      = discounted off its own usual price
 *   /best-value = cheapest per unit, discount or not
 */

/**
 * Stated on every page, verbatim. Ranking by price alone reads as a quality
 * judgement unless you say plainly that it isn't one — and the cheapest product
 * in a category is frequently the lowest grade, not the best buy.
 *
 * Takes the unit because edibles are not ranked per gram — saying so anyway
 * would describe a number the page isn't showing.
 */
export function valueDisclaimer(unit: ValueUnit): string {
  return unit === "dose"
    ? "Ranked on price per 10mg of THC, within each pack size. Not a quality ranking."
    : "Ranked on price per gram, within each size. Not a quality ranking."
}

/** The index page spans both units, so it names neither. */
export const VALUE_DISCLAIMER =
  "Ranked on price per unit, within each size. Not a quality ranking."

export const CATEGORY_COPY: Record<
  ValueCategory,
  {
    tab: string
    heading: string
    subheading: string
    title: string
    description: string
  }
> = {
  flower: {
    tab: "Flower",
    heading: "Best Value Flower",
    subheading: "The most flower per dollar in Rhode Island right now.",
    title: "Best Value Flower — Cheapest Per Gram in Rhode Island",
    description:
      "Rhode Island flower ranked by price per gram, compared within each size — eighths against eighths, ounces against ounces. Updated through the day.",
  },
  vape: {
    tab: "Vapes",
    heading: "Best Value Vapes",
    subheading: "The most cartridge per dollar in Rhode Island right now.",
    title: "Best Value Vape Carts — Cheapest Per Gram in Rhode Island",
    description:
      "Rhode Island vape cartridges ranked by price per gram, half-grams compared against half-grams and grams against grams. Updated through the day.",
  },
  concentrate: {
    tab: "Concentrates",
    heading: "Best Value Concentrates",
    subheading: "The most concentrate per dollar in Rhode Island right now.",
    title: "Best Value Concentrates — Cheapest Per Gram in Rhode Island",
    description:
      "Rhode Island concentrates ranked by price per gram, compared within each size. Updated through the day.",
  },
  // Edibles are the one category priced on potency rather than mass: what a
  // shopper buys is the THC, and a 100mg 10-pack only compares to a 200mg bar
  // once both are expressed per dose.
  edible: {
    tab: "Edibles",
    heading: "Best Value Edibles",
    subheading: "The most THC per dollar in Rhode Island right now.",
    title: "Best Value Edibles — Cheapest Per 10mg THC in Rhode Island",
    description:
      "Rhode Island edibles ranked by price per 10mg of THC, compared within each pack size — 100mg packs against 100mg packs. Updated through the day.",
  },
}

export const INDEX_COPY = {
  heading: "Best Value",
  subheading:
    "The most product per dollar across all nine Rhode Island dispensaries.",
  title: "Best Value Cannabis in Rhode Island — Cheapest Per Gram & Per Dose",
  description:
    "Cannabis ranked by price per gram across every Rhode Island dispensary menu, compared within each size — plus edibles ranked per 10mg of THC. Flower, vape cartridges, concentrates and edibles.",
}
