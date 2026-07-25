import { describe, it, expect } from "vitest"
import {
  normalizeProductName,
  isSameProduct,
  buildPriceComparison,
} from "./price-comparison"
import type { InventoryListing } from "@/lib/types"

function make(
  opts: Partial<{
    id: string
    price: number | null
    name: string
    category: string
    weight: number | null
    dispensaryId: string
  }> = {}
): InventoryListing {
  const {
    id = "l1",
    price = 30,
    name = "OGKB V2",
    category = "flower",
    weight = 3.5,
    dispensaryId = "d1",
  } = opts
  return {
    id,
    price,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: null,
    cbd_percent: null,
    image_url: null,
    product_url: null,
    last_seen_at: "2026-07-25T12:00:00.000Z",
    product: {
      id: `p-${id}`,
      name,
      brand_id: null,
      brand_name: "A-1 Herb Co.",
      category,
      subcategory: null,
      weight_grams: weight,
      weight_display: weight != null ? `${weight}g` : null,
      strain_type: "hybrid",
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: dispensaryId,
      name: `Shop ${dispensaryId}`,
      slug: `shop-${dispensaryId}`,
      city: "Providence",
      menu_url: null,
    },
  }
}

describe("normalizeProductName", () => {
  it("ignores case, spacing, and punctuation", () => {
    expect(normalizeProductName("OGKB V2")).toBe("ogkbv2")
    expect(normalizeProductName("ogkb-v2")).toBe("ogkbv2")
    expect(normalizeProductName("O.G.K.B. v2 ")).toBe("ogkbv2")
  })
})

describe("isSameProduct", () => {
  it("matches the same name and size", () => {
    expect(isSameProduct(make(), make({ dispensaryId: "d2" }))).toBe(true)
  })

  it("rejects a different size", () => {
    expect(isSameProduct(make({ weight: 3.5 }), make({ weight: 7 }))).toBe(false)
  })

  it("rejects a different category with the same name", () => {
    expect(
      isSameProduct(make({ category: "flower" }), make({ category: "pre-roll" }))
    ).toBe(false)
  })

  it("treats numeric weights sent as strings as equal", () => {
    const a = make()
    const b = make({ dispensaryId: "d2" })
    // PostgREST returns `numeric` columns as strings.
    b.product.weight_grams = "3.5" as unknown as number
    expect(isSameProduct(a, b)).toBe(true)
  })

  it("matches two unsized listings but never an unsized against a sized one", () => {
    expect(isSameProduct(make({ weight: null }), make({ weight: null }))).toBe(true)
    expect(isSameProduct(make({ weight: null }), make({ weight: 3.5 }))).toBe(false)
  })
})

describe("buildPriceComparison", () => {
  it("returns null when no other dispensary carries the product", () => {
    const current = make()
    expect(buildPriceComparison(current, [])).toBeNull()
    // A different product at another shop is not a comparison.
    expect(
      buildPriceComparison(current, [
        make({ id: "l2", name: "Fritter Mintz", dispensaryId: "d2" }),
      ])
    ).toBeNull()
  })

  it("orders every dispensary by price and flags the cheapest", () => {
    const current = make({ id: "newport", price: 35, dispensaryId: "d-newport" })
    const result = buildPriceComparison(current, [
      make({ id: "solar", price: 30, dispensaryId: "d-solar" }),
      make({ id: "aura", price: 18, dispensaryId: "d-aura" }),
    ])!

    expect(result.rows.map((r) => r.listing.id)).toEqual([
      "aura",
      "solar",
      "newport",
    ])
    expect(result.rows.map((r) => r.isCheapest)).toEqual([true, false, false])
    expect(result.rows.find((r) => r.isCurrent)!.listing.id).toBe("newport")
    expect(result.savings).toBe(17)
    expect(result.currentIsCheapest).toBe(false)
  })

  it("reports the delta of each row against the current price", () => {
    const current = make({ id: "cur", price: 30, dispensaryId: "d1" })
    const result = buildPriceComparison(current, [
      make({ id: "cheap", price: 18, dispensaryId: "d2" }),
      make({ id: "dear", price: 35, dispensaryId: "d3" }),
    ])!
    const delta = (id: string) =>
      result.rows.find((r) => r.listing.id === id)!.delta
    expect(delta("cheap")).toBe(-12)
    expect(delta("cur")).toBe(0)
    expect(delta("dear")).toBe(5)
  })

  it("reports no savings when the current listing is already cheapest", () => {
    const current = make({ id: "cur", price: 18, dispensaryId: "d1" })
    const result = buildPriceComparison(current, [
      make({ id: "other", price: 30, dispensaryId: "d2" }),
    ])!
    expect(result.savings).toBeNull()
    expect(result.currentIsCheapest).toBe(true)
    expect(result.rows[0].isCurrent).toBe(true)
  })

  it("marks both shops cheapest when they tie at the lowest price", () => {
    const current = make({ id: "cur", price: 20, dispensaryId: "d1" })
    const result = buildPriceComparison(current, [
      make({ id: "tie", price: 20, dispensaryId: "d2" }),
    ])!
    expect(result.rows.every((r) => r.isCheapest)).toBe(true)
    expect(result.savings).toBeNull()
  })

  it("collapses one dispensary's duplicate listings to its cheaper row", () => {
    const current = make({ id: "cur", price: 30, dispensaryId: "d1" })
    const result = buildPriceComparison(current, [
      make({ id: "dup-dear", price: 28, dispensaryId: "d2" }),
      make({ id: "dup-cheap", price: 22, dispensaryId: "d2" }),
    ])!
    expect(result.rows).toHaveLength(2)
    expect(result.rows.map((r) => r.listing.id)).toEqual(["dup-cheap", "cur"])
  })

  it("keeps the current listing representing its own shop, not a sibling", () => {
    const current = make({ id: "cur", price: 30, dispensaryId: "d1" })
    const result = buildPriceComparison(current, [
      // Same shop, cheaper — must not displace the listing being viewed.
      make({ id: "sibling", price: 25, dispensaryId: "d1" }),
      make({ id: "other", price: 40, dispensaryId: "d2" }),
    ])!
    expect(result.rows.map((r) => r.listing.id)).toEqual(["cur", "other"])
  })

  it("sorts unpriced listings last and leaves their delta null", () => {
    const current = make({ id: "cur", price: 30, dispensaryId: "d1" })
    const result = buildPriceComparison(current, [
      make({ id: "noprice", price: null, dispensaryId: "d2" }),
      make({ id: "cheap", price: 12, dispensaryId: "d3" }),
    ])!
    expect(result.rows.map((r) => r.listing.id)).toEqual([
      "cheap",
      "cur",
      "noprice",
    ])
    const noprice = result.rows.find((r) => r.listing.id === "noprice")!
    expect(noprice.delta).toBeNull()
    expect(noprice.isCheapest).toBe(false)
  })

  it("reports no savings when the current listing has no price to beat", () => {
    const current = make({ id: "cur", price: null, dispensaryId: "d1" })
    const result = buildPriceComparison(current, [
      make({ id: "other", price: 20, dispensaryId: "d2" }),
    ])!
    expect(result.savings).toBeNull()
    expect(result.currentIsCheapest).toBe(true)
    expect(result.rows.find((r) => r.isCurrent)!.delta).toBeNull()
  })
})
