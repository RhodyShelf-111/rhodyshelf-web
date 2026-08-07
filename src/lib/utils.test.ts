import { describe, it, expect } from "vitest"
import type { Product } from "./types"
import {
  formatPrice,
  formatRelativeTime,
  getFreshnessBadge,
  DROP_WINDOW_DAYS,
  slugify,
  getCategoryIcon,
  pricePerGram,
  formatPricePerGram,
  formatUnitPrice,
} from "./utils"

describe("formatPrice", () => {
  it("formats to two decimals with a dollar sign", () => {
    expect(formatPrice(10)).toBe("$10.00")
    expect(formatPrice(9.5)).toBe("$9.50")
  })

  it("returns null for missing prices", () => {
    expect(formatPrice(null)).toBeNull()
  })
})

describe("formatRelativeTime", () => {
  const minutesAgo = (m: number) =>
    new Date(Date.now() - m * 60_000).toISOString()

  it("buckets minutes, hours, days, and weeks", () => {
    expect(formatRelativeTime(minutesAgo(0))).toBe("just now")
    expect(formatRelativeTime(minutesAgo(12))).toBe("12m ago")
    expect(formatRelativeTime(minutesAgo(3 * 60))).toBe("3h ago")
    expect(formatRelativeTime(minutesAgo(30 * 60))).toBe("yesterday")
    expect(formatRelativeTime(minutesAgo(3 * 24 * 60))).toBe("3d ago")
    expect(formatRelativeTime(minutesAgo(15 * 24 * 60))).toBe("2w ago")
  })
})

describe("getFreshnessBadge", () => {
  const daysAgo = (d: number) =>
    // Half a day in, so floor() lands on d regardless of when the test runs.
    new Date(Date.now() - (d + 0.5) * 24 * 60 * 60 * 1000).toISOString()

  // The label used to be a mood word covering a multi-day span ("Just Dropped"
  // = days 0–3, "New" = days 8–14), so a card never said when its product
  // actually landed. Since /drops sorts newest-first, every card in the opening
  // screens read "Just Dropped" and the badge said nothing at all.
  it("states the actual age instead of a vague window", () => {
    expect(getFreshnessBadge(daysAgo(0))?.label).toBe("Dropped today")
    expect(getFreshnessBadge(daysAgo(1))?.label).toBe("Dropped yesterday")
    expect(getFreshnessBadge(daysAgo(2))?.label).toBe("Dropped 2d ago")
    expect(getFreshnessBadge(daysAgo(5))?.label).toBe("Dropped 5d ago")
    expect(getFreshnessBadge(daysAgo(13))?.label).toBe("Dropped 13d ago")
  })

  it("distinguishes every day inside the window", () => {
    const labels = Array.from(
      { length: DROP_WINDOW_DAYS + 1 },
      (_, d) => getFreshnessBadge(daysAgo(d))?.label
    )
    expect(labels.every(Boolean)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("still tiers the colour by recency at 3 and 7 days", () => {
    const tier = (d: number) => getFreshnessBadge(daysAgo(d))!.className
    expect(tier(0)).toBe(tier(3))
    expect(tier(4)).toBe(tier(7))
    expect(tier(8)).toBe(tier(DROP_WINDOW_DAYS))
    expect(new Set([tier(3), tier(4), tier(8)]).size).toBe(3)
  })

  it("returns no badge outside the drop window", () => {
    expect(getFreshnessBadge(daysAgo(DROP_WINDOW_DAYS))).not.toBeNull()
    expect(getFreshnessBadge(daysAgo(DROP_WINDOW_DAYS + 1))).toBeNull()
    expect(getFreshnessBadge(daysAgo(20))).toBeNull()
    // A future timestamp is bad data, not a drop.
    expect(getFreshnessBadge(daysAgo(-3))).toBeNull()
  })
})

describe("slugify", () => {
  it("collapses punctuation runs into single hyphens", () => {
    expect(slugify("Aura of Rhode Island - Central Falls")).toBe(
      "aura-of-rhode-island-central-falls"
    )
  })

  it("strips leading and trailing separators", () => {
    expect(slugify("  Solar Cannabis Co. ")).toBe("solar-cannabis-co")
  })
})

describe("getCategoryIcon", () => {
  it("resolves DB values and plural display aliases, case-insensitively", () => {
    expect(getCategoryIcon("flower")).toBe("🌿")
    expect(getCategoryIcon("Pre-Rolls")).toBe("🚬")
  })

  it("falls back to the leaf for unknown categories", () => {
    expect(getCategoryIcon("beverage")).toBe("🌿")
  })
})

describe("pricePerGram", () => {
  it("normalizes pack prices to a rate", () => {
    expect(pricePerGram(88, 28)).toBeCloseTo(3.142857)
    expect(pricePerGram(6, 1)).toBe(6)
    expect(pricePerGram(35, 14)).toBe(2.5)
  })

  // PostgREST hands `numeric` columns back as strings (see price-comparison.ts).
  it("accepts numeric strings from PostgREST", () => {
    expect(pricePerGram("35", "3.5")).toBe(10)
  })

  it("returns null for anything that can't be divided meaningfully", () => {
    expect(pricePerGram(null, 3.5)).toBeNull()
    expect(pricePerGram(35, null)).toBeNull()
    // 0g would divide to Infinity; a negative weight/price is bad data.
    expect(pricePerGram(35, 0)).toBeNull()
    expect(pricePerGram(35, -3.5)).toBeNull()
    expect(pricePerGram(0, 3.5)).toBeNull()
    expect(pricePerGram(-35, 3.5)).toBeNull()
    expect(pricePerGram("free", 3.5)).toBeNull()
    expect(pricePerGram(35, "one eighth")).toBeNull()
  })
})

/** Minimal Product for the unit-price helpers, which read the whole row now. */
function p(patch: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Test",
    brand_id: null,
    brand_name: "Brand",
    category: "flower",
    subcategory: null,
    weight_grams: null,
    weight_display: null,
    strain_type: null,
    strain_name: null,
    image_url: null,
    ...patch,
  }
}

describe("formatPricePerGram", () => {
  it("labels gram-priced categories, including plural display aliases", () => {
    expect(
      formatPricePerGram(88, p({ category: "flower", weight_display: "28g" }))
    ).toBe("$3.14/g")
    expect(
      formatPricePerGram(50, p({ category: "concentrate", weight_display: "1g" }))
    ).toBe("$50.00/g")
    expect(
      formatPricePerGram(50, p({ category: "Concentrates", weight_display: "1g" }))
    ).toBe("$50.00/g")
    expect(
      formatPricePerGram(25, p({ category: "vape", weight_display: "0.5g" }))
    ).toBe("$50.00/g")
  })

  // An edible's weight_grams is its THC dose (100mg → 0.1g), so $/g would read
  // "$180.00/g" on an $18 bag of gummies. Grams aren't the unit of value there.
  it("says nothing for categories the gram doesn't price", () => {
    expect(
      formatPricePerGram(18, p({ category: "edible", weight_display: "100mg" }))
    ).toBeNull()
    expect(
      formatPricePerGram(40, p({ category: "tincture", weight_display: "30mg" }))
    ).toBeNull()
    expect(formatPricePerGram(20, p({ category: "accessory" }))).toBeNull()
    expect(
      formatPricePerGram(20, p({ category: "", weight_display: "1g" }))
    ).toBeNull()
  })

  // Regression: pre-roll multipacks carry a per-unit weight against a pack
  // price, inconsistently and often with no pack marker in the name. Live
  // Slater Center rows: "King Sherb 10-pack 0.5g" is stored as 0.5g/$50, so a
  // rate would read "$100.00/g" for flower that actually costs $10.00/g — while
  // "Rollups 10-pack 0.5g" on the same menu is stored as 5.0g and would read
  // right. Say nothing rather than pick one of the two answers at random.
  it("says nothing for pre-rolls, whose pack weights can't be trusted", () => {
    expect(
      formatPricePerGram(50, p({ category: "pre-roll", weight_display: "0.5g" }))
    ).toBeNull()
    expect(
      formatPricePerGram(50, p({ category: "pre-roll", weight_display: "5g" }))
    ).toBeNull()
    expect(
      formatPricePerGram(20, p({ category: "Pre-Rolls", weight_display: "0.5g" }))
    ).toBeNull()
  })

  it("says nothing when the listing has no price or no weight", () => {
    expect(
      formatPricePerGram(null, p({ category: "flower", weight_display: "28g" }))
    ).toBeNull()
    expect(formatPricePerGram(88, p({ category: "flower" }))).toBeNull()
  })
})

// The whole point of the normalisation: an edible that could never carry a $/g
// now carries the rate that actually compares it to another edible.
describe("formatUnitPrice", () => {
  it("gives grams to gram categories and doses to edibles", () => {
    expect(
      formatUnitPrice(88, p({ category: "flower", weight_display: "28g" }))
    ).toBe("$3.14/g")
    // $18 for 100mg of THC = $1.80 per 10mg dose.
    expect(
      formatUnitPrice(18, p({ category: "edible", weight_display: "100mg" }))
    ).toBe("$1.80/10mg")
    expect(
      formatUnitPrice(40, p({ category: "tincture", weight_display: "200mg" }))
    ).toBe("$2.00/10mg")
  })

  // Convention 2: "3330mg" is 3.33 flower-equivalent grams, not a 3,330mg dose.
  // Converting it would print "$0.05/10mg" on a normal 100mg pack.
  it("refuses the flower-equivalent rows rather than inventing a rate", () => {
    expect(
      formatUnitPrice(18, p({ category: "edible", weight_display: "3330mg" }))
    ).toBeNull()
    expect(
      formatUnitPrice(6, p({ category: "edible", weight_display: "10000mg" }))
    ).toBeNull()
  })

  it("says nothing for categories with neither unit", () => {
    expect(formatUnitPrice(20, p({ category: "accessory" }))).toBeNull()
    expect(
      formatUnitPrice(50, p({ category: "pre-roll", weight_display: "0.5g" }))
    ).toBeNull()
  })
})
