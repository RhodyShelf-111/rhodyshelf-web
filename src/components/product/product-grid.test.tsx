import { describe, it, expect, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { ProductGrid } from "./product-grid"
import type { InventoryListing } from "@/lib/types"

beforeAll(() => {
  // Base UI's floating popup machinery expects these browser APIs; jsdom
  // ships neither.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver
})

function makeListing(
  id: string,
  brand: string,
  dispensaryName: string,
  category = "flower"
): InventoryListing {
  const slug = dispensaryName.toLowerCase().replace(/\s+/g, "-")
  return {
    id,
    price: 25,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: 21.4,
    cbd_percent: null,
    image_url: null,
    product_url: null,
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: `p-${id}`,
      name: `Product ${id}`,
      brand_id: null,
      brand_name: brand,
      category,
      subcategory: null,
      weight_grams: null,
      weight_display: null,
      strain_type: "hybrid",
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: `d-${slug}`,
      name: dispensaryName,
      slug,
      city: null,
      menu_url: null,
    },
  }
}

const listings = [
  makeListing("l1", "Hi5", "Mother Earth"),
  makeListing("l2", "Lovewell Farms", "Sweetspot Exeter"),
  makeListing("l3", "Sweetspot", "Sweetspot Exeter", "concentrate"),
]

function openFilterSheet() {
  fireEvent.click(screen.getByRole("button", { name: /filters/i }))
  return screen.getByRole("dialog")
}

describe("ProductGrid mobile filter sheet", () => {
  it("shows a brand tapped in the sheet as selected immediately (regression: hidden sidebar twin unchecked it)", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    const radio = within(sheet).getByRole("radio", { name: "Hi5" })
    fireEvent.click(radio)

    expect(radio).toBeChecked()
    // The sidebar twin reflects the same state on re-render. It sits behind
    // the modal sheet (aria-hidden), so include hidden nodes in the query.
    const allHi5 = screen.getAllByRole("radio", { name: "Hi5", hidden: true })
    expect(allHi5).toHaveLength(2)
    for (const r of allHi5) expect(r).toBeChecked()
  })

  it("clears a filter when its radio is re-tapped", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    const radio = within(sheet).getByRole("radio", { name: "Hi5" })
    fireEvent.click(radio)
    expect(radio).toBeChecked()

    fireEvent.click(radio)
    expect(radio).not.toBeChecked()
  })

  it("shows a dispensary tapped in the sheet as selected immediately", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    const radio = within(sheet).getByRole("radio", { name: "Sweetspot Exeter" })
    fireEvent.click(radio)

    expect(radio).toBeChecked()
  })

  it("narrows the brand options to what the selected dispensary stocks", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    // All three brands offered up front…
    expect(within(sheet).getByRole("radio", { name: "Hi5" })).toBeInTheDocument()

    fireEvent.click(
      within(sheet).getByRole("radio", { name: "Sweetspot Exeter" })
    )

    // …then only Sweetspot Exeter's brands remain; Hi5 (Mother Earth only)
    // would have produced an empty grid.
    expect(within(sheet).queryByRole("radio", { name: "Hi5" })).toBeNull()
    expect(
      within(sheet).getByRole("radio", { name: "Lovewell Farms" })
    ).toBeInTheDocument()
    expect(
      within(sheet).getByRole("radio", { name: "Sweetspot" })
    ).toBeInTheDocument()
    // The Brand section itself must not vanish even if narrowing left it
    // with few options.
    expect(within(sheet).getByText("Brand")).toBeInTheDocument()
  })
})
