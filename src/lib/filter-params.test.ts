import { describe, it, expect } from "vitest"
import {
  carryFilterParams,
  filtersToParams,
  parseFilterParams,
} from "./filter-params"

describe("parseFilterParams", () => {
  it("reads every filter param", () => {
    const parsed = parseFilterParams(
      new URLSearchParams(
        "category=flower&brand=Hi5&dispensary=mother-earth&strainType=indica&minPrice=10&maxPrice=50&sale=true&search=gummies&sort=price-asc"
      )
    )
    expect(parsed).toEqual({
      category: "flower",
      brand: "Hi5",
      dispensary: "mother-earth",
      strainType: "indica",
      minPrice: 10,
      maxPrice: 50,
      onSale: true,
      search: "gummies",
      sort: "price-asc",
    })
  })

  it("drops invalid values instead of propagating them", () => {
    const parsed = parseFilterParams(
      new URLSearchParams("minPrice=abc&maxPrice=-5&sort=nonsense&sale=1")
    )
    expect(parsed.minPrice).toBeUndefined()
    expect(parsed.maxPrice).toBeUndefined()
    expect(parsed.sort).toBeUndefined()
    expect(parsed.onSale).toBeUndefined()
  })
})

describe("filtersToParams", () => {
  it("serializes only set filters", () => {
    const params = filtersToParams({ brand: "Hi5", onSale: true, minPrice: 0 })
    expect(params.toString()).toBe("brand=Hi5&minPrice=0&sale=true")
  })

  it("omits the page-default sort but keeps a chosen one", () => {
    expect(
      filtersToParams({ sort: "discount-desc" }, "discount-desc").toString()
    ).toBe("")
    expect(filtersToParams({ sort: "thc-desc" }, "discount-desc").get("sort")).toBe(
      "thc-desc"
    )
    expect(filtersToParams({ sort: "thc-desc" }).get("sort")).toBe("thc-desc")
  })

  it("round-trips through parseFilterParams", () => {
    const filters = {
      brand: "Lovewell Farms",
      dispensary: "sweetspot-exeter",
      strainType: "hybrid",
      maxPrice: 40,
      onSale: true,
      sort: "price-desc" as const,
    }
    expect(
      parseFilterParams(new URLSearchParams(filtersToParams(filters)))
    ).toMatchObject(filters)
  })
})

describe("carryFilterParams", () => {
  it("carries every filter except category (the destination path owns it)", () => {
    const carried = carryFilterParams(
      "?category=flower&brand=Sweetspot&sale=true&sort=price-asc"
    )
    const params = new URLSearchParams(carried)
    expect(params.get("category")).toBeNull()
    expect(params.get("brand")).toBe("Sweetspot")
    expect(params.get("sale")).toBe("true")
    expect(params.get("sort")).toBe("price-asc")
  })

  it("sanitizes garbage and ignores foreign params", () => {
    expect(carryFilterParams("?minPrice=abc&utm_source=ig&sort=bad")).toBe("")
  })

  it("returns an empty string when there is nothing to carry", () => {
    expect(carryFilterParams("")).toBe("")
    expect(carryFilterParams("?category=flower")).toBe("")
  })
})
