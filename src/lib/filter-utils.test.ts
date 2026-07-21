import { describe, it, expect } from "vitest"
import {
  applyFilters,
  brandNamesFromIndex,
  deriveFacetOptions,
} from "./filter-utils"
import type { InventoryListing } from "@/lib/types"

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
  } = {}
): InventoryListing {
  seq += 1
  return {
    id: `l${seq}`,
    price: overrides.price === undefined ? 20 : overrides.price,
    original_price: null,
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
      weight_grams: null,
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

  it("price-asc sorts unknown prices last", () => {
    const listings = [
      makeListing({ price: null }),
      makeListing({ price: 15 }),
      makeListing({ price: 5 }),
    ]
    const out = applyFilters(listings, { sort: "price-asc" })
    expect(out.map((l) => l.price)).toEqual([5, 15, null])
  })

  it("discount-desc sorts by discount percent", () => {
    const listings = [
      makeListing({ discountPercent: 10 }),
      makeListing({ discountPercent: 40 }),
      makeListing({ discountPercent: null }),
    ]
    const out = applyFilters(listings, { sort: "discount-desc" })
    expect(out.map((l) => l.discount_percent)).toEqual([40, 10, null])
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
    { id: "1", category: "flower", brand: "Hi5", dispensary: "mother-earth" },
    { id: "2", category: "edible", brand: "Hi5", dispensary: "sweetspot" },
    { id: "3", category: "flower", brand: "Sweetspot", dispensary: "sweetspot" },
    { id: "4", category: "flower", brand: "Hi5", dispensary: "mother-earth" },
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
