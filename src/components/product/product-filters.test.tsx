import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { ProductFiltersPanel } from "./product-filters"
import type { Dispensary, ProductFilters } from "@/lib/types"

function makeDispensary(slug: string, name: string): Dispensary {
  return { id: `d-${slug}`, name, slug, city: null, menu_url: null }
}

const baseProps = {
  filters: {} as ProductFilters,
  categories: ["edible", "flower"],
  brands: ["Hi5", "Lovewell Farms"],
  dispensaries: [
    makeDispensary("mother-earth", "Mother Earth"),
    makeDispensary("sweetspot-exeter", "Sweetspot Exeter"),
  ],
  strainTypes: ["hybrid", "indica"],
  onFilterChange: () => {},
  onClear: () => {},
}

function radioNames(container: HTMLElement): Set<string> {
  return new Set(
    [...container.querySelectorAll<HTMLInputElement>("input[type=radio]")].map(
      (i) => i.name
    )
  )
}

describe("ProductFiltersPanel radio-group scoping", () => {
  it("keeps each section a single radio group within one panel", () => {
    const { container } = render(<ProductFiltersPanel {...baseProps} />)

    const brandRadios = [
      ...container.querySelectorAll<HTMLInputElement>("input[type=radio]"),
    ].filter((i) => i.name.endsWith("brand"))
    expect(brandRadios).toHaveLength(2)
    // Same group: checking one must natively uncheck the other.
    expect(new Set(brandRadios.map((i) => i.name)).size).toBe(1)
  })

  it("renders the full brand list — no 20-item cap (the container scrolls)", () => {
    const brands = Array.from({ length: 25 }, (_, i) =>
      `Brand ${String(i + 1).padStart(2, "0")}`
    )
    const { container } = render(
      <ProductFiltersPanel {...baseProps} brands={brands} />
    )
    const brandRadios = [
      ...container.querySelectorAll<HTMLInputElement>("input[type=radio]"),
    ].filter((i) => i.name.endsWith("brand"))
    expect(brandRadios).toHaveLength(25)
  })

  it("honors visibleSections over option-list length, so faceted narrowing can't blink a section out", () => {
    const { container, queryByText, getByText } = render(
      <ProductFiltersPanel
        {...baseProps}
        brands={["Only Brand"]}
        visibleSections={{ category: false, brand: true, dispensary: false }}
      />
    )
    expect(getByText("Brand")).toBeInTheDocument()
    expect(getByText("Only Brand")).toBeInTheDocument()
    expect(queryByText("Category")).toBeNull()
    expect(queryByText("Dispensary")).toBeNull()
    // Strain type + price + on-sale are unconditional.
    expect(
      container.querySelectorAll("input[type=radio]").length
    ).toBeGreaterThan(0)
  })

  it("uses distinct radio-group names across twin panel instances (regression: sheet selection clobbered by the hidden sidebar)", () => {
    // ProductGrid mounts the panel twice at once — a CSS-hidden desktop
    // sidebar and the mobile sheet. If both instances shared radio names,
    // the browser's one-checked-per-group rule would let the hidden twin
    // steal the checkedness of a radio tapped in the sheet.
    const first = render(<ProductFiltersPanel {...baseProps} />)
    const second = render(<ProductFiltersPanel {...baseProps} />)

    const firstNames = radioNames(first.container)
    const secondNames = radioNames(second.container)
    expect(firstNames.size).toBeGreaterThan(0)
    for (const name of firstNames) {
      expect(secondNames).not.toContain(name)
    }
  })
})
