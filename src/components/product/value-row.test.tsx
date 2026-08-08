import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ValueRow } from "./value-row"
import type { SizeBand, ValueRow as ValueRowData } from "@/lib/value-ranking"

const BAND: SizeBand = { id: "eighth", label: "Eighth (3.5g)", min: 3, max: 4 }

function makeRow(dispensaryName: string, city: string | null): ValueRowData {
  return {
    unitRate: 5.71,
    pricePerMgThc: null,
    percentBelowTypical: 0,
    listing: {
      id: "l1",
      price: 20,
      original_price: null,
      discount_amount: null,
      discount_percent: null,
      thc_percent: 24.2,
      cbd_percent: null,
      image_url: null,
      product_url: null,
      last_seen_at: "2026-08-01T12:00:00.000Z",
      product: {
        id: "p1",
        name: "Super Boof",
        brand_id: null,
        brand_name: "Bayside Growers",
        category: "flower",
        subcategory: null,
        weight_grams: 3.5,
        weight_display: "3.5g",
        strain_type: "hybrid",
        strain_name: null,
        image_url: null,
      },
      dispensary: {
        id: "d1",
        name: dispensaryName,
        slug: "aura-of-rhode-island-central-falls",
        city,
        menu_url: null,
      },
    },
  }
}

describe("ValueRow dispensary label", () => {
  // This row squeezes name, brand and shop against a large $/g figure, so the
  // registered name clipped mid-word — the same reason the product card
  // abbreviates. Both surfaces read from one map.
  it("prints the short shop name, not the registered one", () => {
    render(
      <ValueRow
        row={makeRow("Aura of Rhode Island - Central Falls", "Central Falls")}
        band={BAND}
        rank={1}
      />
    )
    expect(screen.getByText("Aura")).toBeInTheDocument()
    expect(screen.queryByText(/Aura of Rhode Island/)).not.toBeInTheDocument()
  })

  // The link is read out of context by a screen reader, and the same SKU ranks
  // once per shop, so the accessible name keeps the full store.
  it("keeps the full name in the accessible name", () => {
    render(
      <ValueRow
        row={makeRow("Aura of Rhode Island - Central Falls", "Central Falls")}
        band={BAND}
        rank={1}
      />
    )
    const link = screen.getByRole("link")
    expect(link.getAttribute("aria-label")).toContain(
      "at Aura of Rhode Island - Central Falls"
    )
  })
})
