import { describe, it, expect } from "vitest"
import {
  applyFilters,
  brandCountsFromIndex,
  brandNamesFromIndex,
  deriveFacetOptions,
} from "./filter-utils"
import type { DropListing, InventoryListing } from "@/lib/types"

let seq = 0
function makeListing(
  overrides: {
    name?: string
    brand?: string
    category?: string
    price?: number | null
    thc?: number | null
    discount?: number | null
    discountPercent?: number | null
    dispensarySlug?: string
    dispensaryName?: string
    strainType?: string | null
    grams?: number | null
  } = {}
): InventoryListing {
  seq += 1
  const price = overrides.price === undefined ? 20 : overrides.price
  // On-sale and discount-sort are computed from these two prices now (see
  // src/lib/discount.ts), so the overrides have to move original_price or they
  // describe a listing the app correctly refuses to call discounted.
  let originalPrice: number | null = null
  if (price != null && overrides.discountPercent != null) {
    originalPrice = price / (1 - overrides.discountPercent / 100)
  } else if (price != null && overrides.discount != null && overrides.discount > 0) {
    originalPrice = price + overrides.discount
  }
  return {
    id: `l${seq}`,
    price,
    original_price: originalPrice,
    discount_amount: overrides.discount ?? null,
    discount_percent: overrides.discountPercent ?? null,
    thc_percent: overrides.thc === undefined ? 20 : overrides.thc,
    cbd_percent: null,
    image_url: null,
    product_url: null,
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: `p${seq}`,
      name: overrides.name ?? `Product ${seq}`,
      brand_id: null,
      brand_name: overrides.brand ?? "BrandA",
      category: overrides.category ?? "flower",
      subcategory: null,
      weight_grams: overrides.grams ?? null,
      weight_display: null,
      strain_type: overrides.strainType ?? null,
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: `d-${overrides.dispensarySlug ?? "shop"}`,
      name: overrides.dispensaryName ?? "Shop",
      slug: overrides.dispensarySlug ?? "shop",
      city: null,
      menu_url: null,
    },
  }
}

describe("applyFilters", () => {
  it("matches category case-insensitively", () => {
    const listings = [
      makeListing({ category: "Flower" }),
      makeListing({ category: "edible" }),
    ]
    const out = applyFilters(listings, { category: "flower" })
    expect(out).toHaveLength(1)
    expect(out[0].product.category).toBe("Flower")
  })

  it("onSale keeps only discounted listings", () => {
    const listings = [
      makeListing({ discount: 5 }),
      makeListing({ discount: 0 }),
      makeListing(),
    ]
    expect(applyFilters(listings, { onSale: true })).toHaveLength(1)
  })

  it("maxPrice excludes unknown prices; minPrice treats them as 0", () => {
    const priced = makeListing({ price: 30 })
    const unpriced = makeListing({ price: null })
    expect(applyFilters([priced, unpriced], { maxPrice: 50 })).toEqual([priced])
    expect(applyFilters([priced, unpriced], { minPrice: 10 })).toEqual([priced])
  })

  it("search matches product name or brand", () => {
    const listings = [
      makeListing({ name: "Blue Dream 3.5g", brand: "BrandA" }),
      makeListing({ name: "Gummies", brand: "Dream Makers" }),
      makeListing({ name: "OG Kush", brand: "BrandC" }),
    ]
    expect(applyFilters(listings, { search: "dream" })).toHaveLength(2)
  })

  // The headline of the whole comparison: raw price says a $6 gram beats an
  // $88 ounce, when the ounce is $3.14/g — less than half the rate.
  it("unit-price-asc ranks by $/g, not by sticker price", () => {
    const ounce = makeListing({ price: 88, grams: 28 }) // $3.14/g
    const gram = makeListing({ price: 6, grams: 1 }) // $6.00/g
    const eighth = makeListing({ price: 28, grams: 3.5 }) // $8.00/g

    const out = applyFilters([gram, eighth, ounce], { sort: "unit-price-asc" })
    expect(out.map((l) => l.id)).toEqual([ounce.id, gram.id, eighth.id])
  })

  it("unit-price-asc sorts listings with no usable $/g last", () => {
    const noWeight = makeListing({ price: 5, grams: null })
    const zeroWeight = makeListing({ price: 5, grams: 0 })
    const real = makeListing({ price: 40, grams: 7 }) // $5.71/g

    const out = applyFilters([noWeight, zeroWeight, real], {
      sort: "unit-price-asc",
    })
    expect(out[0].id).toBe(real.id)
    expect(out.slice(1).map((l) => l.id).sort()).toEqual(
      [noWeight.id, zeroWeight.id].sort()
    )
  })

  it("price-asc sorts unknown prices last", () => {
    const listings = [
      makeListing({ price: null }),
      makeListing({ price: 15 }),
      makeListing({ price: 5 }),
    ]
    const out = applyFilters(listings, { sort: "price-asc" })
    expect(out.map((l) => l.price)).toEqual([5, 15, null])
  })

  it("discount-desc sorts by the computed percent, and sinks unverifiable rows", () => {
    const listings = [
      makeListing({ discountPercent: 10 }),
      makeListing({ discountPercent: 40 }),
      makeListing({ discountPercent: null }),
    ]
    const out = applyFilters(listings, { sort: "discount-desc" })
    expect(out.map((l) => l.discount_percent)).toEqual([40, 10, null])
  })

  // Regression: /deals ordered by the feed's discount_percent, so Slater
  // Center's Astropop — $7.00 down to $6.00, tagged 100% off — sorted above
  // every genuine markdown in the catalog.
  it("ignores a feed percent that the prices contradict", () => {
    const astropop = makeListing({ price: 6 })
    astropop.original_price = 7 // 14.3% real
    astropop.discount_percent = 100 // what the feed claimed
    const genuine = makeListing({ discountPercent: 44 })
    const out = applyFilters([astropop, genuine], { sort: "discount-desc" })
    expect(out[0]).toBe(genuine)
  })

  // Four live Rise Warwick rows carried discount_amount equal to the whole
  // price with original_price == price, so every one wore an On Sale badge.
  it("does not treat a whole-price discount_amount with no markdown as a sale", () => {
    const bogus = makeListing({ price: 50 })
    bogus.original_price = 50
    bogus.discount_amount = 50
    expect(applyFilters([bogus], { onSale: true })).toEqual([])
  })
})

describe("deriveFacetOptions", () => {
  const listings = [
    makeListing({
      brand: "Hi5",
      category: "edible",
      dispensarySlug: "mother-earth",
      dispensaryName: "Mother Earth",
      strainType: null,
    }),
    makeListing({
      brand: "Sweetspot",
      category: "flower",
      dispensarySlug: "sweetspot-exeter",
      dispensaryName: "Sweetspot Exeter",
      strainType: "indica",
    }),
    makeListing({
      brand: "Lovewell",
      category: "flower",
      dispensarySlug: "mother-earth",
      dispensaryName: "Mother Earth",
      strainType: "hybrid",
    }),
  ]

  it("narrows each facet by the OTHER active filters, never by its own", () => {
    const facets = deriveFacetOptions(listings, { dispensary: "mother-earth" })
    // Brands narrow to what Mother Earth stocks…
    expect(facets.brands).toEqual(["Hi5", "Lovewell"])
    expect(facets.categories).toEqual(["edible", "flower"])
    // …but the dispensary list itself stays complete (switching stays possible).
    expect(facets.dispensaries.map((d) => d.slug)).toEqual([
      "mother-earth",
      "sweetspot-exeter",
    ])
  })

  it("keeps the full brand list when only a brand is selected", () => {
    const facets = deriveFacetOptions(listings, { brand: "Hi5" })
    expect(facets.brands).toEqual(["Hi5", "Lovewell", "Sweetspot"])
  })

  it("compounds multiple other filters onto a facet", () => {
    const facets = deriveFacetOptions(listings, {
      category: "flower",
      dispensary: "mother-earth",
    })
    expect(facets.brands).toEqual(["Lovewell"])
    expect(facets.strainTypes).toEqual(["hybrid"])
  })

  it("keeps an orphaned selected value visible in its own facet", () => {
    // Sweetspot (the brand) isn't stocked at Mother Earth, but while selected
    // it must stay listed so the user can see and uncheck it.
    const facets = deriveFacetOptions(listings, {
      brand: "Sweetspot",
      dispensary: "mother-earth",
    })
    expect(facets.brands).toContain("Sweetspot")

    const facets2 = deriveFacetOptions(listings, {
      brand: "Hi5",
      dispensary: "sweetspot-exeter",
    })
    expect(facets2.dispensaries.map((d) => d.slug)).toContain(
      "sweetspot-exeter"
    )
  })

  it("drops null strain types and returns every facet sorted", () => {
    const facets = deriveFacetOptions(listings, {})
    expect(facets.strainTypes).toEqual(["hybrid", "indica"])
    expect(facets.brands).toEqual(["Hi5", "Lovewell", "Sweetspot"])
  })
})

describe("brandNamesFromIndex", () => {
  const rows = [
    { id: "1", category: "flower", brand: "Hi5", dispensary: "mother-earth", onSale: false },
    { id: "2", category: "edible", brand: "Hi5", dispensary: "sweetspot", onSale: true },
    { id: "3", category: "flower", brand: "Sweetspot", dispensary: "sweetspot", onSale: false },
    { id: "4", category: "flower", brand: "Hi5", dispensary: "mother-earth", onSale: true },
  ]

  it("unscoped: unique brands, sorted", () => {
    expect(brandNamesFromIndex(rows)).toEqual(["Hi5", "Sweetspot"])
  })

  it("scopes by category case-insensitively (index stores lowercase)", () => {
    expect(brandNamesFromIndex(rows, { category: "Edible" })).toEqual(["Hi5"])
  })

  it("scopes by dispensary slug, and by both together", () => {
    expect(brandNamesFromIndex(rows, { dispensary: "sweetspot" })).toEqual([
      "Hi5",
      "Sweetspot",
    ])
    expect(
      brandNamesFromIndex(rows, { category: "flower", dispensary: "sweetspot" })
    ).toEqual(["Sweetspot"])
  })
})

describe("applyFilters — newest sort", () => {
  /** A drop: an inventory listing that also knows when it hit the shelf. */
  function makeDrop(
    lastSeen: string,
    droppedAt?: string
  ): InventoryListing | DropListing {
    const listing: InventoryListing = {
      ...makeListing(),
      last_seen_at: lastSeen,
    }
    return droppedAt ? { ...listing, dropped_at: droppedAt } : listing
  }

  const sorted = (listings: InventoryListing[]) =>
    applyFilters(listings, { sort: "newest" }).map((l) => l.id)

  it("falls back to last_seen_at for a plain listing", () => {
    const older = makeDrop("2026-07-10T12:00:00.000Z")
    const newer = makeDrop("2026-07-20T12:00:00.000Z")
    expect(sorted([older, newer])).toEqual([newer.id, older.id])
  })

  // Regression: "Newest" ranked by last_seen_at — when the scraper last
  // confirmed a listing, not when the product arrived. Every fresh listing
  // carries one of a couple of batch timestamps (827 drops spanned 2 distinct
  // hours; correlation with the real drop date was -0.009), so on /drops it was
  // sorting by scrape batch. It only stayed in drop order by luck: a
  // near-constant key plus a stable sort left the server's order untouched.
  it("ranks drops by when they dropped, not when they were last scraped", () => {
    // Same scrape batch, as production actually looks.
    const batch = "2026-07-25T04:00:00.000Z"
    const old = makeDrop(batch, "2026-07-12T09:00:00.000Z")
    const fresh = makeDrop(batch, "2026-07-25T09:00:00.000Z")
    const mid = makeDrop(batch, "2026-07-19T09:00:00.000Z")

    expect(sorted([old, fresh, mid])).toEqual([fresh.id, mid.id, old.id])
  })

  it("does not let a stale scrape outrank a newer drop", () => {
    const staleScrapeNewDrop = makeDrop(
      "2026-07-24T04:00:00.000Z",
      "2026-07-25T09:00:00.000Z"
    )
    const freshScrapeOldDrop = makeDrop(
      "2026-07-25T04:00:00.000Z",
      "2026-07-11T09:00:00.000Z"
    )
    expect(sorted([freshScrapeOldDrop, staleScrapeNewDrop])).toEqual([
      staleScrapeNewDrop.id,
      freshScrapeOldDrop.id,
    ])
  })

  it("sorts an unparseable timestamp last instead of scrambling the list", () => {
    const good = makeDrop("2026-07-20T12:00:00.000Z")
    const newer = makeDrop("2026-07-22T12:00:00.000Z")
    const broken = makeDrop("not-a-date")
    expect(sorted([good, broken, newer])).toEqual([newer.id, good.id, broken.id])
  })
})

describe("applyFilters — free-text search", () => {
  // Regression: search matched only name and brand, as one whole-query
  // substring. So "indica" (a strain_type on 590 fresh listings but in only 14
  // product names) returned almost nothing, and any two-word query found
  // nothing unless that exact phrase sat in a product name.
  const catalog = [
    makeListing({ name: "Joker Z", brand: "Appalachian", category: "vape", strainType: "indica" }),
    makeListing({ name: "Garlic Jam", brand: "Fire Ganja", category: "vape", strainType: "sativa" }),
    makeListing({ name: "Mothballs", brand: "&Shine", category: "pre-roll", strainType: "indica" }),
    makeListing({ name: "Blue Dream", brand: "BrandC", category: "flower", strainType: "hybrid" }),
  ]
  const names = (search: string) =>
    applyFilters(catalog, { search }).map((l) => l.product.name)

  it("matches a strain type, not just names and brands", () => {
    expect(names("indica").sort()).toEqual(["Joker Z", "Mothballs"])
  })

  it("matches a category", () => {
    expect(names("vape").sort()).toEqual(["Garlic Jam", "Joker Z"])
  })

  it("requires every word of a multi-word query to match somewhere", () => {
    expect(names("sativa vape")).toEqual(["Garlic Jam"])
    expect(names("indica pre-roll")).toEqual(["Mothballs"])
    // Both words must land — "sativa" and "pre-roll" never co-occur.
    expect(names("sativa pre-roll")).toEqual([])
  })

  it("still matches a plain name or brand", () => {
    expect(names("blue dream")).toEqual(["Blue Dream"])
    expect(names("fire ganja")).toEqual(["Garlic Jam"])
  })

  it("is case-insensitive across fields", () => {
    expect(names("INDICA").sort()).toEqual(["Joker Z", "Mothballs"])
  })
})

describe("brandCountsFromIndex", () => {
  // Regression: the brand-grouped rows labelled themselves by counting the
  // cards they'd rendered, but that's one loaded page (96 rows) — so a brand
  // with a bigger share was undercounted. Under a Concentrate filter "Mother
  // Earth Wellness · 9 products" was really 36, and "View all 9" then dropped
  // the category and landed on all 265 of their products.
  const rows = [
    { id: "1", category: "concentrate", brand: "MEW", dispensary: "mother-earth", onSale: false },
    { id: "2", category: "concentrate", brand: "MEW", dispensary: "mother-earth", onSale: true },
    { id: "3", category: "concentrate", brand: "MEW", dispensary: "sweetspot", onSale: false },
    { id: "4", category: "flower", brand: "MEW", dispensary: "mother-earth", onSale: false },
    { id: "5", category: "concentrate", brand: "Evergreen", dispensary: "mother-earth", onSale: false },
  ]

  it("counts every listing per brand when unscoped", () => {
    expect(brandCountsFromIndex(rows)).toEqual({ MEW: 4, Evergreen: 1 })
  })

  it("counts within the active category, not the whole catalog", () => {
    expect(brandCountsFromIndex(rows, { category: "concentrate" })).toEqual({
      MEW: 3,
      Evergreen: 1,
    })
  })

  it("matches the category case-insensitively (the index stores lowercase)", () => {
    expect(brandCountsFromIndex(rows, { category: "Concentrate" })).toEqual({
      MEW: 3,
      Evergreen: 1,
    })
  })

  it("narrows by dispensary and by sale, and compounds them with category", () => {
    expect(brandCountsFromIndex(rows, { dispensary: "sweetspot" })).toEqual({ MEW: 1 })
    expect(brandCountsFromIndex(rows, { onSale: true })).toEqual({ MEW: 1 })
    expect(
      brandCountsFromIndex(rows, { category: "concentrate", dispensary: "mother-earth" })
    ).toEqual({ MEW: 2, Evergreen: 1 })
  })

  it("drops brands with nothing in scope rather than reporting zero", () => {
    expect(brandCountsFromIndex(rows, { category: "flower" })).toEqual({ MEW: 1 })
  })
})
