import { describe, it, expect } from "vitest"
import { verifiedDiscount, isOnSale, byDiscountDesc } from "./discount"

describe("verifiedDiscount", () => {
  it("computes the markdown from the two prices", () => {
    expect(verifiedDiscount({ price: 30, original_price: 50 })).toEqual({
      originalPrice: 50,
      amount: 20,
      percent: 40,
    })
  })

  // The live bug: Slater Center's Astropop shipped discount_percent = 100 on a
  // $7.00 -> $6.00 markdown, and /deals ordered by that column, so the most
  // wrong row in the catalog held the top slot on the deals page.
  it("ignores a feed percentage that contradicts the prices", () => {
    const astropop = {
      price: 6,
      original_price: 7,
      discount_percent: 100,
      discount_amount: 1,
    }
    const d = verifiedDiscount(astropop)
    expect(d).not.toBeNull()
    expect(d!.percent).toBeCloseTo(14.2857, 3)
    expect(d!.amount).toBe(1)
  })

  // The other live shape: four Rise Warwick rows carried discount_amount equal
  // to the whole price with original_price == price. Every on-sale test in the
  // app was `(discount_amount ?? 0) > 0`, so all four claimed a sale.
  it("refuses a sale when the prices are equal, whatever the feed says", () => {
    expect(
      verifiedDiscount({
        price: 50,
        original_price: 50,
        discount_amount: 50,
      } as never)
    ).toBeNull()
  })

  it("refuses a markdown that goes the wrong way", () => {
    expect(verifiedDiscount({ price: 60, original_price: 50 })).toBeNull()
  })

  it("refuses when either price is missing", () => {
    expect(verifiedDiscount({ price: null, original_price: 50 })).toBeNull()
    expect(verifiedDiscount({ price: 30, original_price: null })).toBeNull()
    expect(verifiedDiscount({ price: null, original_price: null })).toBeNull()
  })

  // A zero original would divide by zero and report Infinity% off.
  it("refuses a non-positive original price", () => {
    expect(verifiedDiscount({ price: 0, original_price: 0 })).toBeNull()
    expect(verifiedDiscount({ price: -5, original_price: -1 })).toBeNull()
  })

  it("refuses non-finite prices rather than rendering NaN", () => {
    expect(verifiedDiscount({ price: NaN, original_price: 50 })).toBeNull()
    expect(verifiedDiscount({ price: 10, original_price: Infinity })).toBeNull()
  })

  it("never reports 100% off unless the item is genuinely free", () => {
    expect(verifiedDiscount({ price: 0.01, original_price: 100 })!.percent).toBeLessThan(100)
    expect(verifiedDiscount({ price: 0, original_price: 100 })!.percent).toBe(100)
  })
})

describe("isOnSale", () => {
  it("agrees with verifiedDiscount so a badge and a strikethrough can't disagree", () => {
    for (const listing of [
      { price: 30, original_price: 50 },
      { price: 50, original_price: 50 },
      { price: null, original_price: 50 },
      { price: 60, original_price: 50 },
    ]) {
      expect(isOnSale(listing)).toBe(verifiedDiscount(listing) !== null)
    }
  })
})

describe("byDiscountDesc", () => {
  it("orders by the computed percentage, not the feed's", () => {
    const astropop = { price: 6, original_price: 7 } // 14.3%
    const real = { price: 25, original_price: 45 } // 44.4%
    expect([astropop, real].sort(byDiscountDesc)[0]).toBe(real)
  })

  it("sinks unverifiable rows below every real markdown", () => {
    const bogus = { price: 50, original_price: 50 }
    const smallest = { price: 99, original_price: 100 } // 1%
    expect([bogus, smallest].sort(byDiscountDesc)).toEqual([smallest, bogus])
  })
})
