import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { PriceComparisonPanel } from "./price-comparison"
import { buildPriceComparison } from "@/lib/price-comparison"
import type { InventoryListing } from "@/lib/types"

function make(
  id: string,
  price: number | null,
  dispensaryName: string,
  city: string | null = "Providence"
): InventoryListing {
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
      name: "OGKB V2",
      brand_id: null,
      brand_name: "A-1 Herb Co.",
      category: "flower",
      subcategory: null,
      weight_grams: 3.5,
      weight_display: "3.5g",
      strain_type: "hybrid",
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: `d-${id}`,
      name: dispensaryName,
      slug: dispensaryName.toLowerCase().replace(/\s+/g, "-"),
      city,
      menu_url: null,
    },
  }
}

/** The rendered rows, in display order. */
function rows() {
  return within(screen.getByRole("list")).getAllByRole("listitem")
}

const NEWPORT = make("newport", 35, "Newport Cannabis Co.", "Newport")
const OTHERS = [
  make("solar", 30, "Solar Cannabis Co. Warwick", "Warwick"),
  make("aura", 18, "Aura of Rhode Island", "Central Falls"),
]

describe("PriceComparisonPanel", () => {
  it("heads the panel with the dispensary count and the savings on offer", () => {
    render(
      <PriceComparisonPanel comparison={buildPriceComparison(NEWPORT, OTHERS)!} />
    )
    expect(
      screen.getByRole("heading", { name: "At 3 dispensaries" })
    ).toBeInTheDocument()
    expect(screen.getByText("Save $17.00")).toBeInTheDocument()
  })

  it("lists shops cheapest-first, marking the lowest and its saving", () => {
    render(
      <PriceComparisonPanel comparison={buildPriceComparison(NEWPORT, OTHERS)!} />
    )
    const [first, second, third] = rows()

    expect(within(first).getByText("Aura of Rhode Island")).toBeInTheDocument()
    expect(within(first).getByText("$18.00")).toBeInTheDocument()
    expect(within(first).getByText("−$17.00")).toBeInTheDocument()
    expect(within(first).getByText("Lowest")).toBeInTheDocument()

    expect(within(second).getByText("$30.00")).toBeInTheDocument()
    expect(within(third).getByText("$35.00")).toBeInTheDocument()
  })

  it("links other shops to their listing but never the row being viewed", () => {
    render(
      <PriceComparisonPanel comparison={buildPriceComparison(NEWPORT, OTHERS)!} />
    )
    const [first, , current] = rows()

    expect(within(first).getByRole("link")).toHaveAttribute(
      "href",
      "/product/aura"
    )
    expect(within(current).queryByRole("link")).not.toBeInTheDocument()
    expect(within(current).getByText(/You're viewing this/)).toBeInTheDocument()
  })

  it("omits the savings badge when the viewed listing is already cheapest", () => {
    const cheapest = make("cur", 18, "Aura of Rhode Island", "Central Falls")
    render(
      <PriceComparisonPanel
        comparison={
          buildPriceComparison(cheapest, [make("other", 30, "Solar", "Warwick")])!
        }
      />
    )
    expect(screen.queryByText(/^Save /)).not.toBeInTheDocument()
    expect(within(rows()[0]).getByText("Lowest")).toBeInTheDocument()
  })

  it("shows no price delta on a row that matches the viewed price", () => {
    const cur = make("cur", 20, "Shop A", "Providence")
    render(
      <PriceComparisonPanel
        comparison={buildPriceComparison(cur, [make("tie", 20, "Shop B", "Bristol")])!}
      />
    )
    expect(screen.queryByText(/[−+]\$/)).not.toBeInTheDocument()
  })

  it("falls back to 'See dispensary' for a shop with no price", () => {
    const cur = make("cur", 20, "Shop A", "Providence")
    render(
      <PriceComparisonPanel
        comparison={
          buildPriceComparison(cur, [make("np", null, "Shop B", "Bristol")])!
        }
      />
    )
    expect(screen.getByText("See dispensary")).toBeInTheDocument()
  })

  it("renders a shop with no city without an empty location line", () => {
    const cur = make("cur", 20, "Shop A", null)
    render(
      <PriceComparisonPanel
        comparison={buildPriceComparison(cur, [make("b", 30, "Shop B", "Bristol")])!}
      />
    )
    // Exactly one location line — the city-less shop renders none at all
    // rather than a stray ", RI".
    expect(screen.getAllByText(/, RI$/)).toHaveLength(1)
    expect(screen.getByText(/Bristol, RI/)).toBeInTheDocument()
    expect(screen.getByText(/You're viewing this/)).toBeInTheDocument()
  })
})
