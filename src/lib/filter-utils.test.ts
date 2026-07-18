import { describe, it, expect } from "vitest"
import { applyFilters } from "./filter-utils"
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
      strain_type: null,
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: "d1",
      name: "Shop",
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
