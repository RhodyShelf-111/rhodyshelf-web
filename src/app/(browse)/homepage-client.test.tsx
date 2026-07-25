import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { HomepageClient } from "./homepage-client"
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
    image_url: null,
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

function makeSections(idPrefix: string): CategorySection[] {
  return [
    {
      key: "flower",
      label: "Flower",
      count: 1105,
      listings: Array.from({ length: 12 }, (_, i) =>
        makeListing(`${idPrefix}-${i}`)
      ),
    },
  ]
}

/** The horizontally scrolling card rail inside the Flower section. */
function rail(): HTMLElement {
  const el = document.querySelector("section .overflow-x-auto")
  if (!(el instanceof HTMLElement)) throw new Error("rail not found")
  return el
}

describe("HomepageClient", () => {
  it("renders a section header with the true catalog count", () => {
    render(<HomepageClient sections={makeSections("a")} />)
    expect(screen.getByRole("heading", { name: "Flower" })).toBeInTheDocument()
    expect(screen.getByText("1,105 products")).toBeInTheDocument()
  })

  it("shows at most 6 cards per rail regardless of sample size", () => {
    render(<HomepageClient sections={makeSections("a")} />)
    expect(rail().children).toHaveLength(6)
  })

  it("links the section header and mobile CTA to the filtered search", () => {
    render(<HomepageClient sections={makeSections("a")} />)
    for (const link of [
      screen.getByRole("link", { name: /View all/ }),
      screen.getByRole("link", { name: /Browse all 1,105 Flower/ }),
    ]) {
      expect(link).toHaveAttribute("href", "/search?category=flower")
    }
  })

  // Regression: the mount-time shuffle swaps every card in the rail. That makes
  // the browser re-snap the scroll-snap container — the element it had snapped
  // to no longer exists, so it picks the nearest remaining target and scrolls
  // the rail forward a card, painting the homepage with a random subset of rails
  // already scrolled and their first card clipped. A layout effect must re-pin
  // each rail to the start whenever the shuffled cards commit.
  it("re-pins the rail to the start after the cards are shuffled", () => {
    const { rerender } = render(<HomepageClient sections={makeSections("a")} />)

    // Stand in for the browser's re-snap, which jsdom (no layout) never does.
    rail().scrollLeft = 240
    expect(rail().scrollLeft).toBe(240)

    // A new sections identity re-runs the shuffle, committing a fresh set of
    // cards — the same path the mount-time shuffle takes.
    rerender(<HomepageClient sections={makeSections("b")} />)

    expect(rail().scrollLeft).toBe(0)
  })
})
