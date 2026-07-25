import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { CategoryRails, CARDS_PER_RAIL } from "./category-rails"
import { EAGER_IMAGE_COUNT } from "@/lib/image-priority"
import type { CategorySection, InventoryListing } from "@/lib/types"

function makeListing(id: string): InventoryListing {
  return {
    id,
    price: 25,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: null,
    cbd_percent: null,
    // A real image URL: the eager/lazy hints only exist on a rendered <img>.
    image_url: `https://images.dutchie.com/${id}`,
    product_url: null,
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: `p-${id}`,
      name: `Product ${id}`,
      brand_id: null,
      brand_name: "Acme Farms",
      category: "flower",
      subcategory: null,
      weight_grams: null,
      weight_display: null,
      strain_type: "hybrid",
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: "d1",
      name: "Test Dispensary",
      slug: "test-dispensary",
      city: "Providence",
      menu_url: null,
    },
  }
}

const SECTIONS: CategorySection[] = [
  {
    key: "flower",
    label: "Flower",
    count: 1105,
    listings: Array.from({ length: 12 }, (_, i) => makeListing(`flower-${i}`)),
  },
  {
    key: "vape",
    label: "Vapes",
    count: 630,
    listings: Array.from({ length: 12 }, (_, i) => makeListing(`vape-${i}`)),
  },
]

/** The horizontally scrolling card rail inside each section, in page order. */
function rails(): HTMLElement[] {
  return [...document.querySelectorAll("section .overflow-x-auto")].filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  )
}

describe("CategoryRails", () => {
  it("renders a section header per category with its true catalog count", () => {
    render(<CategoryRails sections={SECTIONS} />)
    expect(screen.getByRole("heading", { name: "Flower" })).toBeInTheDocument()
    expect(screen.getByText("1,105 products")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Vapes" })).toBeInTheDocument()
    expect(screen.getByText("630 products")).toBeInTheDocument()
  })

  it("shows CARDS_PER_RAIL cards regardless of how large the sample is", () => {
    render(<CategoryRails sections={SECTIONS} />)
    for (const rail of rails()) {
      expect(rail.children).toHaveLength(CARDS_PER_RAIL)
    }
  })

  it("links the section header and mobile CTA to the filtered search", () => {
    render(<CategoryRails sections={[SECTIONS[0]]} />)
    for (const link of [
      screen.getByRole("link", { name: /View all/ }),
      screen.getByRole("link", { name: /Browse all 1,105 Flower/ }),
    ]) {
      expect(link).toHaveAttribute("href", "/search?category=flower")
    }
  })

  // The first rail is the only one above the fold and holds the LCP candidate.
  // A lazy image isn't requested until layout runs the intersection observer,
  // so the hero card needs the eager/high-priority hint to be fetched while the
  // HTML is still parsing.
  it("hints the first rail's cards eager and high priority", () => {
    render(<CategoryRails sections={SECTIONS} />)
    const imgs = within(rails()[0]).getAllByRole("img")

    expect(imgs).toHaveLength(EAGER_IMAGE_COUNT)
    for (const img of imgs) {
      expect(img).toHaveAttribute("loading", "eager")
      expect(img).toHaveAttribute("fetchpriority", "high")
    }
  })

  it("leaves every later rail lazy so it can't compete with the LCP image", () => {
    render(<CategoryRails sections={SECTIONS} />)
    for (const img of within(rails()[1]).getAllByRole("img")) {
      expect(img).toHaveAttribute("loading", "lazy")
      expect(img).not.toHaveAttribute("fetchpriority", "high")
    }
  })

  // Regression: the cards used to be re-picked in a mount effect, so the browser
  // fetched the server-rendered images and then threw them away — ~29 of ~73
  // image requests per homepage load were wasted, and any eager hint landed on a
  // card that never painted. The rendered cards must be exactly the ones the
  // server sent, in order.
  it("renders the server's cards as-is, without re-picking them on mount", () => {
    render(<CategoryRails sections={SECTIONS} />)
    const rendered = within(rails()[0])
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt"))

    expect(rendered).toEqual(
      SECTIONS[0].listings.slice(0, CARDS_PER_RAIL).map((l) => l.product.name)
    )
  })
})
