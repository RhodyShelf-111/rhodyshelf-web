import { describe, it, expect } from "vitest"
import type { InventoryListing } from "@/lib/types"
import {
  bandFor,
  isExcludedFromValue,
  isValueCategory,
  listingPricePerGram,
  pricePerMgThc,
  rankByValue,
  formatPricePerMgThc,
  valueAnchor,
  SIZE_BANDS,
  MIN_BAND_SIZE,
  VALUE_CATEGORIES,
} from "./value-ranking"
import { isGramPriced } from "./utils"

let seq = 0

function listing(over: {
  name?: string
  brand?: string
  category?: string
  subcategory?: string | null
  grams?: number | null
  price?: number | null
  thc?: number | null
  productId?: string
  id?: string
  shop?: string
}): InventoryListing {
  seq += 1
  const id = over.id ?? `l${seq}`
  return {
    id,
    price: over.price === undefined ? 35 : over.price,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: over.thc === undefined ? null : over.thc,
    cbd_percent: null,
    image_url: null,
    product_url: null,
    last_seen_at: "2026-08-06T00:00:00Z",
    product: {
      id: over.productId ?? `p${seq}`,
      name: over.name ?? `Product ${seq}`,
      brand_id: null,
      brand_name: over.brand ?? `Brand ${seq}`,
      category: over.category ?? "flower",
      subcategory: over.subcategory ?? null,
      weight_grams: over.grams === undefined ? 3.5 : over.grams,
      weight_display: null,
      strain_type: null,
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: over.shop ?? `d${seq}`,
      name: over.shop ?? "Mother Earth",
      slug: "mother-earth-pawtucket",
    } as InventoryListing["dispensary"],
  }
}

/** n eighths at a given $/g, each its own brand and product. */
function eighths(count: number, pricePer: number, prefix = "x"): InventoryListing[] {
  return Array.from({ length: count }, (_, i) =>
    listing({
      grams: 3.5,
      price: pricePer * 3.5,
      brand: `${prefix}Brand${i}`,
      productId: `${prefix}p${i}`,
      id: `${prefix}l${i}`,
    })
  )
}

// The page must never rank a category whose $/g the rest of the site refuses to
// print. If someone widens either list, this fails until both agree.
describe("agreement with the site-wide $/g gate", () => {
  it.each([...VALUE_CATEGORIES])("isGramPriced allows %s", (c) => {
    expect(isGramPriced(c)).toBe(true)
  })
})

describe("isValueCategory", () => {
  it.each(["flower", "vape", "concentrate"])("accepts %s", (c) => {
    expect(isValueCategory(c)).toBe(true)
  })

  // These carry THC-milligrams-as-mass in weight_grams, giving a $229 median
  // and a $35,000 max price-per-gram. They cannot be ranked on this axis.
  it.each(["edible", "topical", "tincture", "other", "pre-roll"])("rejects %s", (c) => {
    expect(isValueCategory(c)).toBe(false)
  })
})

describe("listingPricePerGram", () => {
  it("divides price by weight", () => {
    expect(listingPricePerGram(listing({ price: 35, grams: 3.5 }))).toBe(10)
  })

  it.each([
    ["null price", { price: null, grams: 3.5 }],
    ["zero price", { price: 0, grams: 3.5 }],
    ["null weight", { price: 35, grams: null }],
    ["zero weight", { price: 35, grams: 0 }],
    ["negative weight", { price: 35, grams: -1 }],
  ])("returns null for %s", (_label, over) => {
    expect(listingPricePerGram(listing(over))).toBeNull()
  })
})

describe("pricePerMgThc", () => {
  it("converts percent to milligrams", () => {
    // 3.5g at 20% THC = 700mg. $35 / 700 = $0.05
    const v = pricePerMgThc(listing({ price: 35, grams: 3.5, thc: 20 }))
    expect(v).toBeCloseTo(0.05, 5)
  })

  it("returns null when THC is missing", () => {
    expect(pricePerMgThc(listing({ thc: null }))).toBeNull()
  })

  // thc_percent also carries stray pack-milligram values, so a "51.4" on flower
  // is not a potency — it is a different unit that wandered into the column.
  it("rejects an implausible potency for the category", () => {
    expect(pricePerMgThc(listing({ category: "flower", thc: 51.4 }))).toBeNull()
    expect(pricePerMgThc(listing({ category: "flower", thc: 2 }))).toBeNull()
  })

  it("accepts a high potency on a category where it is plausible", () => {
    expect(
      pricePerMgThc(listing({ category: "vape", grams: 1, price: 40, thc: 85 }))
    ).not.toBeNull()
  })

  it("returns null for a category with no trustworthy weight", () => {
    expect(pricePerMgThc(listing({ category: "edible", thc: 20 }))).toBeNull()
  })
})

describe("bandFor", () => {
  it("maps every rounding of the same physical eighth to one band", () => {
    // Live data stores this as 3.5 (602 rows), 3.54 (54) and 3.33 (9).
    for (const g of [3.33, 3.5, 3.54, 4.0]) {
      expect(bandFor("flower", g)?.id).toBe("eighth")
    }
  })

  it.each([
    [1.0, "gram"],
    [7.09, "quarter"],
    [14.17, "half"],
    [28, "ounce"],
  ])("bands flower %sg as %s", (grams, id) => {
    expect(bandFor("flower", grams as number)?.id).toBe(id)
  })

  it("returns null outside every band", () => {
    expect(bandFor("flower", 2.5)).toBeNull()
    expect(bandFor("flower", 100)).toBeNull()
  })

  it("returns null for a null weight or a non-value category", () => {
    expect(bandFor("flower", null)).toBeNull()
    expect(bandFor("edible", 3.5)).toBeNull()
  })

  it("has no overlapping ranges within a category", () => {
    for (const bands of Object.values(SIZE_BANDS)) {
      const sorted = [...bands].sort((a, b) => a.min - b.min)
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].min).toBeGreaterThan(sorted[i - 1].max)
      }
    }
  })
})

describe("isExcludedFromValue", () => {
  // Every name here is a real product from production. Ranking by raw $/g put
  // them at or near the top of their category, which is the bug this prevents.
  it.each([
    ["Deadhead OG Shake", "flower"],
    ["Powerplant Popcorn Oz", "flower"],
    ["70's Grass Kief", "concentrate"],
    ["Beach Essentials Bundle", "flower"],
    ["Cakeberry Brulee CBD", "flower"],
  ])("excludes %s", (name, category) => {
    expect(isExcludedFromValue(listing({ name, category }))).toBe(true)
  })

  // Only 9 of the 15 kief rows carry the subcategory; the unlabelled ones
  // include the cheapest concentrate on the site. Both paths must catch it.
  it("excludes kief by subcategory even when the name does not say so", () => {
    expect(
      isExcludedFromValue(
        listing({ name: "Strawberry Banana", subcategory: "kief" })
      )
    ).toBe(true)
  })

  it("excludes a pack miscategorised as flower", () => {
    expect(
      isExcludedFromValue(listing({ name: "Clementine Cake 3pk", category: "flower" }))
    ).toBe(true)
  })

  // A pre-roll pack is a legitimate product; only flower packs are mislabelled.
  // Only flower packs are mislabelled; the pattern must not fire on other
  // categories that legitimately sell multi-packs.
  it("keeps a pack in a non-flower category", () => {
    expect(
      isExcludedFromValue(
        listing({ name: "Pineapple Donut 5pk", category: "vape" })
      )
    ).toBe(false)
  })

  it("keeps an ordinary product", () => {
    expect(isExcludedFromValue(listing({ name: "Blue Dream" }))).toBe(false)
  })

  // Substring safety: these contain excluded words but are not those products.
  it.each(["Milkshake Cookies", "Trimmed Hedge OG"])(
    "does not exclude %s on a partial word match",
    (name) => {
      expect(isExcludedFromValue(listing({ name }))).toBe(false)
    }
  )
})

describe("rankByValue", () => {
  it("returns nothing for a category it cannot rank", () => {
    expect(rankByValue(eighths(30, 10), "edible")).toEqual([])
  })

  it("drops a band with too few products to describe a market", () => {
    const sections = rankByValue(eighths(MIN_BAND_SIZE - 1, 10), "flower")
    expect(sections).toEqual([])
  })

  it("keeps a band exactly at the minimum", () => {
    const sections = rankByValue(eighths(MIN_BAND_SIZE, 10), "flower")
    expect(sections).toHaveLength(1)
    expect(sections[0].band.id).toBe("eighth")
  })

  it("orders rows cheapest per gram first", () => {
    const pool = [...eighths(MIN_BAND_SIZE, 10), listing({ grams: 3.5, price: 7, brand: "Cheap", productId: "cheap" })]
    const [section] = rankByValue(pool, "flower")
    expect(section.rows[0].listing.product.brand_name).toBe("Cheap")
    expect(section.rows[0].pricePerGram).toBe(2)
  })

  it("caps a brand at two rows so one brand cannot own a section", () => {
    const hog = Array.from({ length: 5 }, (_, i) =>
      listing({ grams: 3.5, price: 7, brand: "Hog", productId: `hog${i}`, id: `hog${i}` })
    )
    const [section] = rankByValue([...eighths(MIN_BAND_SIZE, 10), ...hog], "flower")
    const hogRows = section.rows.filter((r) => r.listing.product.brand_name === "Hog")
    expect(hogRows).toHaveLength(2)
  })

  // current_inventory is per (product, dispensary): flower has 1,068 listings
  // across 879 products, so the same SKU at three shops would take three slots.
  it("collapses one product sold at several shops to its cheapest listing", () => {
    const shops = [
      listing({ grams: 3.5, price: 42, productId: "same", brand: "Same", id: "a" }),
      listing({ grams: 3.5, price: 28, productId: "same", brand: "Same", id: "b" }),
      listing({ grams: 3.5, price: 35, productId: "same", brand: "Same", id: "c" }),
    ]
    const [section] = rankByValue([...eighths(MIN_BAND_SIZE, 10), ...shops], "flower")
    const rows = section.rows.filter((r) => r.listing.product.id === "same")
    expect(rows).toHaveLength(1)
    expect(rows[0].listing.id).toBe("b")
  })

  it("excludes bulk grades from the ranking, not just from display", () => {
    const shake = listing({
      name: "Deadhead OG Shake",
      grams: 3.5,
      price: 3.5,
      brand: "Bayside",
      productId: "shake",
    })
    const [section] = rankByValue([...eighths(MIN_BAND_SIZE, 10), shake], "flower")
    expect(section.rows.some((r) => r.listing.product.id === "shake")).toBe(false)
  })

  // Four Growth Industries kiefs price to exactly $3.00/g in production. With no
  // explicit tiebreak, row order decides "#1" and can reshuffle on revalidation.
  it("is deterministic when several products tie on price per gram", () => {
    const tied = Array.from({ length: 4 }, (_, i) =>
      listing({
        grams: 3.5,
        price: 10.5,
        brand: `Tie${i}`,
        productId: `tie${3 - i}`,
        id: `tie${i}`,
      })
    )
    const once = rankByValue([...eighths(MIN_BAND_SIZE, 10), ...tied], "flower")
    const twice = rankByValue(
      [...tied.slice().reverse(), ...eighths(MIN_BAND_SIZE, 10)],
      "flower"
    )
    expect(once[0].rows.map((r) => r.listing.product.id)).toEqual(
      twice[0].rows.map((r) => r.listing.product.id)
    )
  })

  // Regression: the live 1g flower board was nine rows from one dispensary at an
  // identical $6.00/g — the cheapest, but it answered "who has a flat 1g price"
  // rather than "what is good value", and buried every competing shop.
  it("caps a single dispensary so one shop cannot own a section", () => {
    const oneShop = Array.from({ length: 8 }, (_, i) =>
      listing({
        grams: 3.5,
        price: 7,
        brand: `Cheap${i}`,
        productId: `cheap${i}`,
        id: `cheap${i}`,
        shop: "Aura",
      })
    )
    const [section] = rankByValue([...eighths(MIN_BAND_SIZE, 10), ...oneShop], "flower")
    const fromAura = section.rows.filter((r) => r.listing.dispensary.id === "Aura")
    expect(fromAura).toHaveLength(3)
  })

  it("still surfaces other shops once one shop hits its cap", () => {
    const aura = Array.from({ length: 6 }, (_, i) =>
      listing({ grams: 3.5, price: 7, brand: `A${i}`, productId: `a${i}`, shop: "Aura" })
    )
    const rival = listing({
      grams: 3.5,
      price: 8,
      brand: "Rival",
      productId: "rival",
      shop: "Newport",
    })
    const [section] = rankByValue([...eighths(MIN_BAND_SIZE, 10), ...aura, rival], "flower")
    expect(section.rows.some((r) => r.listing.dispensary.id === "Newport")).toBe(true)
  })

  it("reports the band median over all candidates, not just shown rows", () => {
    const [section] = rankByValue(eighths(MIN_BAND_SIZE, 10), "flower")
    expect(section.typicalPricePerGram).toBe(10)
    expect(section.candidateCount).toBe(MIN_BAND_SIZE)
  })

  it("measures each row against the band median", () => {
    const cheap = listing({ grams: 3.5, price: 17.5, brand: "Cheap", productId: "cheap" })
    const [section] = rankByValue([...eighths(MIN_BAND_SIZE, 10), cheap], "flower")
    // $5/g against a $10/g median.
    expect(section.rows[0].percentBelowTypical).toBe(50)
  })

  it("reports zero for a row at or above the typical price", () => {
    const [section] = rankByValue(eighths(MIN_BAND_SIZE, 10), "flower")
    expect(section.rows.every((r) => r.percentBelowTypical === 0)).toBe(true)
  })

  it("limits rows per band", () => {
    const [section] = rankByValue(eighths(60, 10), "flower", { rowsPerBand: 3 })
    expect(section.rows).toHaveLength(3)
  })

  it("returns bands smallest-first, matching the declared order", () => {
    const sections = rankByValue(
      [
        ...eighths(MIN_BAND_SIZE, 10),
        ...Array.from({ length: MIN_BAND_SIZE }, (_, i) =>
          listing({ grams: 28, price: 200, brand: `Oz${i}`, productId: `oz${i}` })
        ),
      ],
      "flower"
    )
    expect(sections.map((s) => s.band.id)).toEqual(["eighth", "ounce"])
  })

  it("ignores listings from other categories in the same pool", () => {
    const vapes = Array.from({ length: 30 }, (_, i) =>
      listing({ category: "vape", grams: 1, price: 40, brand: `V${i}`, productId: `v${i}` })
    )
    const sections = rankByValue([...eighths(MIN_BAND_SIZE, 10), ...vapes], "flower")
    expect(sections).toHaveLength(1)
    expect(sections[0].rows.every((r) => r.listing.product.category === "flower")).toBe(true)
  })

  it("survives a pool with no usable prices at all", () => {
    const junk = Array.from({ length: 30 }, (_, i) =>
      listing({ price: null, brand: `J${i}`, productId: `j${i}` })
    )
    expect(rankByValue(junk, "flower")).toEqual([])
  })

  it("carries price per mg THC through when it is trustworthy, null when not", () => {
    const withThc = listing({ grams: 3.5, price: 17.5, thc: 25, brand: "T", productId: "t" })
    const [section] = rankByValue([...eighths(MIN_BAND_SIZE, 10), withThc], "flower")
    expect(section.rows[0].pricePerMgThc).toBeGreaterThan(0)
    expect(section.rows[1].pricePerMgThc).toBeNull()
  })
})

describe("formatting", () => {
  // "per mg THC" is spelled out because the abbreviation is analyst vocabulary.
  it("spells out the THC unit", () => {
    expect(formatPricePerMgThc(0.0823)).toBe("$0.082 per mg THC")
  })
})

describe("valueAnchor", () => {
  const band = SIZE_BANDS.flower[1]

  it("states the saving against the market, not a bare ratio", () => {
    const row = { percentBelowTypical: 31 } as never
    expect(valueAnchor(row, band)).toBe("31% below the typical eighths (3.5g) in RI")
  })

  // A 2% difference is noise, and dressing it up as a deal erodes trust.
  it("says nothing when the difference is not worth claiming", () => {
    expect(valueAnchor({ percentBelowTypical: 4 } as never, band)).toBeNull()
    expect(valueAnchor({ percentBelowTypical: 0 } as never, band)).toBeNull()
  })

  it("claims a saving right at the threshold", () => {
    expect(valueAnchor({ percentBelowTypical: 5 } as never, band)).toContain("5%")
  })
})
