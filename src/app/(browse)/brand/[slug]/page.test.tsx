import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { InventoryListing } from "@/lib/types"

const getBrandBySlug = vi.fn()
const getInventoryByBrand = vi.fn()
vi.mock("@/lib/queries/products", () => ({
  getBrandBySlug: (...a: unknown[]) => getBrandBySlug(...a),
  getInventoryByBrand: (...a: unknown[]) => getInventoryByBrand(...a),
  getBrands: vi.fn(),
}))

// The grid is covered by product-grid.test.tsx; stub it so these tests are
// about what the PAGE hands it — i.e. how much data goes over the wire.
const handed = vi.fn()
const handedProps = vi.fn()
vi.mock("../../menu/menu-client", () => ({
  MenuClient: (props: {
    listings: InventoryListing[]
    loadRest?: { total: number; scope: string; value?: string }
  }) => {
    handed(props.listings)
    handedProps(props)
    return <div data-testid="menu-client" />
  },
}))

import BrandPage, { BRAND_LISTINGS_SHOWN } from "./page"

function listings(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `l${i}` }))
}

function renderBrand(count: number) {
  getBrandBySlug.mockResolvedValue({
    id: "b1",
    canonical_name: "Mother Earth Wellness",
    slug: "mother-earth-wellness",
    category: null,
  })
  getInventoryByBrand.mockResolvedValue(listings(count))
  return BrandPage({ params: Promise.resolve({ slug: "mother-earth-wellness" }) })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("BrandPage payload", () => {
  // Regression: a big brand runs 240-260 listings and every one was serialized
  // into the RSC payload (~720-840 KB) to render the 50 cards the grid shows.
  it("serializes at most BRAND_LISTINGS_SHOWN listings", async () => {
    render(await renderBrand(263))

    const sent = handed.mock.calls[0][0]
    expect(sent).toHaveLength(BRAND_LISTINGS_SHOWN)
    // Sorted A-Z upstream, so the cap keeps the front of the list.
    expect(sent[0].id).toBe("l0")
  })

  // Slicing the payload is not the same as the brand having fewer products, and
  // the grid fetches the rest — so the heading quotes the real catalog size flat,
  // with no "showing the first N" hedge.
  it("keeps the true total in the heading and asks the grid for the rest", async () => {
    render(await renderBrand(263))

    expect(
      screen.getByText(/263 products across Rhode Island/)
    ).toBeInTheDocument()
    expect(screen.queryByText(/showing the first/)).not.toBeInTheDocument()
    // Keyed on the slug the URL already carries, which the API allowlists.
    expect(handedProps.mock.calls[0][0].loadRest).toEqual({
      total: 263,
      scope: "brand",
      value: "mother-earth-wellness",
    })
  })

  it("skips the follow-up fetch when nothing is held back", async () => {
    render(await renderBrand(30))

    expect(handed.mock.calls[0][0]).toHaveLength(30)
    expect(screen.getByText(/30 products across Rhode Island/)).toBeInTheDocument()
    expect(handedProps.mock.calls[0][0].loadRest).toBeUndefined()
  })

  it("reports the full catalog size in its JSON-LD, not the rendered cap", async () => {
    const { container } = render(await renderBrand(263))

    const script = container.querySelector('script[type="application/ld+json"]')!
    const data = JSON.parse(script.textContent!)
    expect(data.mainEntity.numberOfItems).toBe(263)
  })

  it("renders the empty state instead of the grid when the brand has no stock", async () => {
    render(await renderBrand(0))

    expect(handed).not.toHaveBeenCalled()
    expect(
      screen.getByText("No products currently available")
    ).toBeInTheDocument()
  })
})
