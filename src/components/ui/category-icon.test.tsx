import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { CategoryIcon, getCategoryGlyph } from "./category-icon"

function svgFor(category: string | null | undefined, className?: string) {
  const { container } = render(
    <CategoryIcon category={category} className={className} />
  )
  const svg = container.querySelector("svg")
  if (!svg) throw new Error("CategoryIcon rendered no svg")
  return svg
}

describe("getCategoryGlyph", () => {
  it("resolves DB values and plural display aliases to the same glyph", () => {
    expect(getCategoryGlyph("concentrate")).toBe(getCategoryGlyph("concentrates"))
    expect(getCategoryGlyph("pre-roll")).toBe(getCategoryGlyph("pre-rolls"))
    expect(getCategoryGlyph("edible")).toBe(getCategoryGlyph("edibles"))
  })

  it("matches case-insensitively", () => {
    expect(getCategoryGlyph("Pre-Rolls")).toBe(getCategoryGlyph("pre-roll"))
    expect(getCategoryGlyph("FLOWER")).toBe(getCategoryGlyph("flower"))
  })

  it("gives distinct glyphs to distinct categories", () => {
    const keys = [
      "flower",
      "concentrate",
      "pre-roll",
      "vape",
      "edible",
      "tincture",
      "topical",
      "accessory",
    ]
    const glyphs = new Set(keys.map((k) => getCategoryGlyph(k)))
    expect(glyphs.size).toBe(keys.length)
  })

  it("falls back for unknown categories and for no category at all", () => {
    const fallback = getCategoryGlyph("other")
    expect(getCategoryGlyph("beverage")).toBe(fallback)
    expect(getCategoryGlyph("")).toBe(fallback)
    expect(getCategoryGlyph(null)).toBe(fallback)
    expect(getCategoryGlyph(undefined)).toBe(fallback)
  })

  // The lookup table is null-prototype on purpose. A plain object literal hands
  // back Object.prototype for "__proto__" and a function for "constructor" or
  // "toString" — and React throws on both, blanking the entire grid. Category
  // values come off the database, so this is reachable input.
  it("does not leak Object.prototype members for prototype-shaped keys", () => {
    const fallback = getCategoryGlyph("other")
    for (const key of ["__proto__", "constructor", "toString", "valueOf", "hasOwnProperty"]) {
      expect(getCategoryGlyph(key)).toBe(fallback)
    }
  })

  it("renders every prototype-shaped key without throwing", () => {
    for (const key of ["__proto__", "constructor", "toString"]) {
      expect(() => svgFor(key)).not.toThrow()
    }
  })
})

describe("CategoryIcon", () => {
  it("renders an svg on lucide's grid so it sits with the other card icons", () => {
    const svg = svgFor("flower")
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24")
    expect(svg.getAttribute("stroke")).toBe("currentColor")
    expect(svg.getAttribute("fill")).toBe("none")
  })

  it("is decorative — every call site already renders the category as text", () => {
    expect(svgFor("flower").getAttribute("aria-hidden")).toBe("true")
  })

  it("renders the hand-drawn pre-roll and vape glyphs, not a lucide import", () => {
    for (const category of ["pre-roll", "vape"]) {
      const svg = svgFor(category)
      expect(svg.querySelectorAll("path").length).toBeGreaterThan(0)
      // lucide stamps every icon it builds; these two are ours.
      expect(svg.getAttribute("class") ?? "").not.toContain("lucide-")
    }
  })

  it("carries a default size but lets the call site override it", () => {
    expect(svgFor("flower").getAttribute("class")).toContain("size-4")
    // The white-plate fallbacks depend on being able to pass both a bigger box
    // and a colour, since currentColor there would be white on white.
    const big = svgFor("flower", "size-16 text-product-plate-foreground")
    expect(big.getAttribute("class")).toContain("size-16")
    expect(big.getAttribute("class")).toContain("text-product-plate-foreground")
  })

  it("emits no emoji", () => {
    for (const category of ["flower", "pre-roll", "vape", "edible", "beverage"]) {
      expect(svgFor(category).textContent ?? "").toBe("")
    }
  })
})
