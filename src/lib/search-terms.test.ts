import { describe, it, expect } from "vitest"
import {
  SEARCH_FIELDS,
  MAX_SEARCH_TOKENS,
  searchTokens,
  searchHaystack,
} from "./search-terms"

describe("searchTokens", () => {
  it("splits a query into the words that must all match", () => {
    expect(searchTokens("sativa vape")).toEqual(["sativa", "vape"])
    expect(searchTokens("hybrid pre-roll")).toEqual(["hybrid", "pre-roll"])
  })

  it("collapses stray whitespace instead of emitting empty tokens", () => {
    expect(searchTokens("  blue   dream \n")).toEqual(["blue", "dream"])
    expect(searchTokens("   ")).toEqual([])
    expect(searchTokens("")).toEqual([])
  })

  it("caps how many tokens one query can generate", () => {
    const many = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ")
    expect(searchTokens(many)).toHaveLength(MAX_SEARCH_TOKENS)
  })
})

describe("SEARCH_FIELDS", () => {
  // Regression: strain_type and category were missing, so "indica" (a
  // strain_type on 590 fresh listings, but in only 14 product names) returned
  // 2% of what the shopper asked for. Same for the rest of the vocabulary
  // people actually type.
  it("covers strain type and category, not just names and brands", () => {
    expect([...SEARCH_FIELDS]).toEqual([
      "name",
      "brand_name",
      "strain_name",
      "strain_type",
      "category",
    ])
  })
})

describe("searchHaystack", () => {
  const product = {
    name: "Joker Z",
    brand_name: "Appalachian Distillery",
    strain_name: "Jokerz",
    strain_type: "Indica",
    category: "vape",
  }

  it("lowercases every searchable field into one string", () => {
    const haystack = searchHaystack(product)
    for (const term of [
      "joker z",
      "appalachian",
      "jokerz",
      "indica",
      "vape",
    ]) {
      expect(haystack).toContain(term)
    }
  })

  it("skips missing fields rather than joining 'null' into the text", () => {
    const haystack = searchHaystack({
      ...product,
      strain_name: null,
      strain_type: null,
    })
    expect(haystack).not.toContain("null")
    expect(haystack).toContain("vape")
  })
})
