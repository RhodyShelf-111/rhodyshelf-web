import { describe, it, expect } from "vitest"
import type { Product } from "./types"
import {
  DOSE_MG,
  formatPricePerDose,
  netWeightGrams,
  parseWeightDisplay,
  pricePerDose,
  thcMilligrams,
} from "./product-units"

function p(patch: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Test",
    brand_id: null,
    brand_name: "Brand",
    category: "edible",
    subcategory: null,
    weight_grams: null,
    weight_display: null,
    strain_type: null,
    strain_name: null,
    image_url: null,
    ...patch,
  }
}

describe("parseWeightDisplay", () => {
  // "100mg" also ends in "g", so the mg branch has to be tested first or every
  // dose label parses as 100 grams.
  it("reads milligrams before grams", () => {
    expect(parseWeightDisplay("100mg")).toEqual({ value: 100, unit: "mg" })
    expect(parseWeightDisplay("3330mg")).toEqual({ value: 3330, unit: "mg" })
    expect(parseWeightDisplay("28g")).toEqual({ value: 28, unit: "g" })
    expect(parseWeightDisplay("3.5g")).toEqual({ value: 3.5, unit: "g" })
  })

  it("tolerates case and surrounding space", () => {
    expect(parseWeightDisplay(" 100 MG ")).toEqual({ value: 100, unit: "mg" })
    expect(parseWeightDisplay("3.5 G")).toEqual({ value: 3.5, unit: "g" })
  })

  it("returns null for anything it can't read", () => {
    expect(parseWeightDisplay(null)).toBeNull()
    expect(parseWeightDisplay("")).toBeNull()
    expect(parseWeightDisplay("1/8 oz")).toBeNull()
    expect(parseWeightDisplay("eighth")).toBeNull()
    expect(parseWeightDisplay("0g")).toBeNull()
  })
})

describe("netWeightGrams", () => {
  it("reads the label for gram-labelled rows", () => {
    expect(netWeightGrams(p({ category: "flower", weight_display: "28g" }))).toBe(28)
    expect(netWeightGrams(p({ category: "vape", weight_display: "0.5g" }))).toBe(0.5)
  })

  // The bug this module exists for: a 100mg gummy pack has no known mass, and
  // returning 0.1 made an $18 bag read "$180.00/g".
  it("refuses to invent a mass for a dose-labelled row", () => {
    expect(netWeightGrams(p({ category: "edible", weight_display: "100mg" }))).toBeNull()
    expect(netWeightGrams(p({ category: "tincture", weight_display: "200mg" }))).toBeNull()
    expect(netWeightGrams(p({ category: "topical", weight_display: "50mg" }))).toBeNull()
  })

  // 18 live edibles really are sold by mass, and those keep their grams.
  it("keeps a real mass on a gram-labelled edible", () => {
    expect(netWeightGrams(p({ category: "edible", weight_display: "250g" }))).toBe(250)
  })

  // 55 live pre-rolls and 9 vapes carry no label at all; weight_grams is a real
  // mass there because those categories are never dose-labelled.
  it("falls back to weight_grams only where the column can't be a dose", () => {
    expect(netWeightGrams(p({ category: "pre-roll", weight_grams: 1.5 }))).toBe(1.5)
    expect(netWeightGrams(p({ category: "edible", weight_grams: 0.1 }))).toBeNull()
  })

  it("rejects zero and negative masses rather than dividing by them", () => {
    expect(netWeightGrams(p({ category: "flower", weight_grams: 0 }))).toBeNull()
    expect(netWeightGrams(p({ category: "flower", weight_grams: -3 }))).toBeNull()
  })
})

describe("thcMilligrams", () => {
  it("reads the dose off a milligram label", () => {
    expect(thcMilligrams(p({ category: "edible", weight_display: "100mg" }))).toBe(100)
    expect(thcMilligrams(p({ category: "edible", weight_display: "5mg" }))).toBe(5)
    expect(thcMilligrams(p({ category: "tincture", weight_display: "500mg" }))).toBe(500)
  })

  // Convention 2. "3330mg" is 3.33 flower-equivalent grams — 99.9mg of THC at
  // RI's 30mg/g, not a 3,330mg dose. Reading it literally would rank a normal
  // 100mg pack as 33x better value than it is.
  it("refuses flower-equivalent rows instead of reading them as doses", () => {
    expect(thcMilligrams(p({ category: "edible", weight_display: "3330mg" }))).toBeNull()
    expect(thcMilligrams(p({ category: "edible", weight_display: "1660mg" }))).toBeNull()
    expect(thcMilligrams(p({ category: "edible", weight_display: "10000mg" }))).toBeNull()
    // The boundary itself is ambiguous, so it falls on the refusing side.
    expect(thcMilligrams(p({ category: "edible", weight_display: "1000mg" }))).toBeNull()
    // Just under it is a real dose and still resolves.
    expect(thcMilligrams(p({ category: "edible", weight_display: "999mg" }))).toBe(999)
  })

  it("says nothing for categories that aren't dose-priced", () => {
    expect(thcMilligrams(p({ category: "flower", weight_display: "3.5g" }))).toBeNull()
    expect(thcMilligrams(p({ category: "edible", weight_display: "250g" }))).toBeNull()
  })
})

describe("pricePerDose", () => {
  it("prices a package against its total THC, per 10mg", () => {
    // $18 for 100mg = $1.80 per 10mg.
    expect(pricePerDose(18, p({ weight_display: "100mg" }))).toBeCloseTo(1.8)
    // A 200mg bar at the same price is half the rate — the comparison the site
    // could not make before.
    expect(pricePerDose(18, p({ weight_display: "200mg" }))).toBeCloseTo(0.9)
    expect(DOSE_MG).toBe(10)
  })

  it("is defensive about the price the way pricePerGram is", () => {
    // PostgREST hands numerics back as strings.
    expect(pricePerDose("18", p({ weight_display: "100mg" }))).toBeCloseTo(1.8)
    expect(pricePerDose(null, p({ weight_display: "100mg" }))).toBeNull()
    expect(pricePerDose(0, p({ weight_display: "100mg" }))).toBeNull()
    expect(pricePerDose(-18, p({ weight_display: "100mg" }))).toBeNull()
    expect(pricePerDose("free", p({ weight_display: "100mg" }))).toBeNull()
  })

  it("says nothing when there is no resolvable dose", () => {
    expect(pricePerDose(18, p({ weight_display: "3330mg" }))).toBeNull()
    expect(pricePerDose(88, p({ category: "flower", weight_display: "28g" }))).toBeNull()
  })
})

describe("formatPricePerDose", () => {
  it("matches the shape of the $/g label", () => {
    expect(formatPricePerDose(18, p({ weight_display: "100mg" }))).toBe("$1.80/10mg")
    expect(formatPricePerDose(25, p({ weight_display: "100mg" }))).toBe("$2.50/10mg")
  })

  it("says nothing rather than printing a rate it can't stand behind", () => {
    expect(formatPricePerDose(18, p({ weight_display: "3330mg" }))).toBeNull()
  })
})
