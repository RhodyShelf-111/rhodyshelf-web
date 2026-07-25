import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BrandGroup } from "./brand-group"
import { EAGER_IMAGE_COUNT } from "@/lib/image-priority"
import type { InventoryListing } from "@/lib/types"

/** Give a listing an image so ProductCard renders an <img> to inspect. */
function withImage(listing: InventoryListing): InventoryListing {
  return { ...listing, image_url: `https://images.dutchie.com/${listing.id}` }
}

function makeListing(id: string, brand: string, price: number | null): InventoryListing {
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
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: `p-${id}`,
      name: `Product ${id}`,
      brand_id: null,
      brand_name: brand,
      category: "flower",
      subcategory: null,
      weight_grams: null,
      weight_display: null,
      strain_type: "hybrid",
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: `d-${id}`,
      name: "Test Dispensary",
      slug: "test-dispensary",
      city: "Providence",
      menu_url: null,
    },
  }
}

/** The scroll rail is the sibling right after the brand header row. */
function railFor(brand: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: brand })
  const rail = heading.closest("div")?.parentElement?.nextElementSibling
  if (!(rail instanceof HTMLElement)) throw new Error("rail not found")
  return rail
}

describe("BrandGroup", () => {
  it("hints its leading cards eager only when it is the first group", () => {
    const listings = Array.from({ length: 8 }, (_, i) =>
      // A real image URL: the loading hints only exist on a rendered <img>.
      withImage(makeListing(String(i), "Acme Farms", 20 + i))
    )

    const { unmount } = render(
      <BrandGroup brandName="Acme Farms" listings={listings} eager />
    )
    const hinted = screen
      .getAllByRole("img")
      .filter((img) => img.getAttribute("loading") === "eager")
    expect(hinted).toHaveLength(EAGER_IMAGE_COUNT)
    for (const img of hinted) {
      expect(img).toHaveAttribute("fetchpriority", "high")
    }
    unmount()

    // Every later group stays lazy so it can't compete with the LCP image.
    render(<BrandGroup brandName="Acme Farms" listings={listings} />)
    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("loading", "lazy")
    }
  })

  it("renders the brand name, lowest price, and product count", () => {
    render(
      <BrandGroup
        brandName="Acme Farms"
        listings={[makeListing("1", "Acme Farms", 30), makeListing("2", "Acme Farms", 22)]}
      />
    )
    expect(screen.getByRole("heading", { name: "Acme Farms" })).toBeInTheDocument()
    expect(screen.getByText(/From \$22\.00 · 2 products/)).toBeInTheDocument()
  })

  it("omits the price prefix when no listing has a price", () => {
    render(
      <BrandGroup
        brandName="Acme Farms"
        listings={[makeListing("1", "Acme Farms", null)]}
      />
    )
    expect(screen.getByText("1 product")).toBeInTheDocument()
    expect(screen.queryByText(/From \$/)).not.toBeInTheDocument()
  })

  it("caps the rail at 10 cards but counts the full set", () => {
    const listings = Array.from({ length: 14 }, (_, i) =>
      makeListing(String(i), "Acme Farms", 20 + i)
    )
    render(<BrandGroup brandName="Acme Farms" listings={listings} />)
    expect(railFor("Acme Farms").children).toHaveLength(10)
    expect(screen.getByText(/14 products/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View all 14/ })).toBeInTheDocument()
  })

  // Regression: the rail bleeds to the viewport edge with a negative margin and
  // an equal padding, so the first card lines up under the brand heading. With
  // snap-x on the container and snap-start on the cards, the browser aligns the
  // first card to the SNAPPORT — the scrollport inset by scroll-padding. Left at
  // the default 0, that made it scroll the rail by exactly padding-left on load,
  // shoving the first card off the gutter and out from under the heading (only
  // on rails long enough to overflow). Every scroll-px step must therefore match
  // its px step at the same breakpoint.
  it("pairs each bleed padding step with an equal scroll-padding step", () => {
    render(
      <BrandGroup
        brandName="Acme Farms"
        listings={[makeListing("1", "Acme Farms", 20)]}
      />
    )
    const cls = railFor("Acme Farms").className

    expect(cls).toContain("snap-x")
    for (const [pad, scrollPad] of [
      ["px-4", "scroll-px-4"],
      ["sm:px-6", "sm:scroll-px-6"],
      ["lg:px-8", "lg:scroll-px-8"],
    ]) {
      expect(cls.split(/\s+/)).toContain(pad)
      expect(cls.split(/\s+/)).toContain(scrollPad)
    }
  })
})
