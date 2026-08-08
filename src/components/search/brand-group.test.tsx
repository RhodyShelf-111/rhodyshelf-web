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
      <BrandGroup brandName="Acme Farms" listings={listings} href="/search?brand=Acme+Farms" eager />
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
    render(<BrandGroup brandName="Acme Farms" listings={listings} href="/search?brand=Acme+Farms" />)
    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("loading", "lazy")
    }
  })

  // Regression: this heading is the same rail header the homepage renders, but
  // it was the one instance missing font-heading — so /search's rails came out
  // in the body face while the homepage's were in Space Grotesk, at an
  // identical size and weight.
  it("sets the rail heading in the display face, like the homepage rails", () => {
    render(
      <BrandGroup
        brandName="Acme Farms"
        listings={[makeListing("1", "Acme Farms", 20)]}
        href="/search?brand=Acme+Farms"
      />
    )
    const cls = screen
      .getByRole("heading", { name: "Acme Farms" })
      .className.split(/\s+/)
    expect(cls).toContain("font-heading")
    expect(cls).toContain("text-[17px]")
    // 600, not 700: font-bold is reserved for the page h1 and the wordmark, so
    // a section rail heading matching the homepage rails is font-semibold.
    expect(cls).toContain("font-semibold")
    expect(cls).not.toContain("font-bold")
  })

  // The rail slot is a fixed 208px (w-52) at every breakpoint. Left on the
  // card's responsive-grid default (50vw → 25vw) the browser resolves 25vw of a
  // wide desktop and downloads a 640px source for a 208px card.
  it("tells each card its real 208px slot width", () => {
    const listings = Array.from({ length: 3 }, (_, i) =>
      withImage(makeListing(String(i), "Acme Farms", 20 + i))
    )
    render(
      <BrandGroup brandName="Acme Farms" listings={listings} href="/search?brand=Acme+Farms" />
    )
    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("sizes", "208px")
    }
  })

  it("renders the brand name, lowest price, and product count", () => {
    render(
      <BrandGroup
        brandName="Acme Farms"
        listings={[makeListing("1", "Acme Farms", 30), makeListing("2", "Acme Farms", 22)]}
        href="/search?brand=Acme+Farms"
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
        href="/search?brand=Acme+Farms"
      />
    )
    expect(screen.getByText("1 product")).toBeInTheDocument()
    expect(screen.queryByText(/From \$/)).not.toBeInTheDocument()
  })

  // Regression: the group labelled itself by counting the listings it was
  // handed — but that's one loaded page (96 rows), so any brand with a bigger
  // share was undercounted. Under a Concentrate filter, a brand showing
  // "9 products" really had 36.
  it("labels itself with the server's true count, not the loaded page", () => {
    const loadedPage = Array.from({ length: 9 }, (_, i) =>
      makeListing(String(i), "Mother Earth Wellness", 35)
    )
    render(
      <BrandGroup
        brandName="Mother Earth Wellness"
        listings={loadedPage}
        totalCount={36}
        href="/search?category=concentrate&brand=Mother+Earth+Wellness"
      />
    )
    expect(screen.getByText(/36 products/)).toBeInTheDocument()
    expect(screen.queryByText(/9 products/)).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /View all 36/ })
    ).toBeInTheDocument()
  })

  // Regression: "View all" hardcoded /search?brand=X, dropping the active
  // category — so the destination held every product of that brand, not the
  // set the count described.
  it("sends View all to the href it was given, filters and all", () => {
    render(
      <BrandGroup
        brandName="Mother Earth Wellness"
        listings={[makeListing("1", "Mother Earth Wellness", 35)]}
        totalCount={36}
        href="/search?category=concentrate&brand=Mother+Earth+Wellness"
      />
    )
    expect(screen.getByRole("link", { name: /View all/ })).toHaveAttribute(
      "href",
      "/search?category=concentrate&brand=Mother+Earth+Wellness"
    )
  })

  it("thousands-separates a large count", () => {
    render(
      <BrandGroup
        brandName="Acme Farms"
        listings={[makeListing("1", "Acme Farms", 20)]}
        totalCount={1234}
        href="/search?brand=Acme+Farms"
      />
    )
    expect(screen.getByText(/1,234 products/)).toBeInTheDocument()
  })

  it("caps the rail at 10 cards but counts the full set", () => {
    const listings = Array.from({ length: 14 }, (_, i) =>
      makeListing(String(i), "Acme Farms", 20 + i)
    )
    render(<BrandGroup brandName="Acme Farms" listings={listings} href="/search?brand=Acme+Farms" />)
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
        href="/search?brand=Acme+Farms"
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

  // --rail-gutter drives two things that both have to land on the rail's own
  // content edge: the inset of the scrollbar track, and the ramp of the
  // edge-fade mask. The mask is only self-disabling at the ends — first and
  // last cards never dimmed — because that ramp is exactly the rail's padding,
  // so a gutter step that drifts from its px-* step breaks both at once.
  it("declares a --rail-gutter matching each padding step, and the fade that uses it", () => {
    render(
      <BrandGroup
        brandName="Acme Farms"
        listings={[makeListing("1", "Acme Farms", 20)]}
        href="/search?brand=Acme+Farms"
      />
    )
    const cls = railFor("Acme Farms").className.split(/\s+/)

    expect(cls).toContain("rail-fade")
    expect(cls).toContain("scrollbar-subtle")
    for (const [pad, gutter] of [
      ["px-4", "[--rail-gutter:1rem]"],
      ["sm:px-6", "sm:[--rail-gutter:1.5rem]"],
      ["lg:px-8", "lg:[--rail-gutter:2rem]"],
    ]) {
      expect(cls).toContain(pad)
      expect(cls).toContain(gutter)
    }
  })
})
