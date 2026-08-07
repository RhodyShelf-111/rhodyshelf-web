import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProductCard } from "./product-card"
import type { InventoryListing } from "@/lib/types"

function makeListing(): InventoryListing {
  return {
    id: "l1",
    price: 25,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: 21.4,
    cbd_percent: null,
    image_url: "https://images.example/pack.jpg",
    product_url: null,
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: "p1",
      name: "Blue Dream 3.5g",
      brand_id: null,
      brand_name: "Lovewell Farms",
      category: "flower",
      subcategory: null,
      weight_grams: null,
      weight_display: null,
      strain_type: null,
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: "d1",
      name: "Sweetspot Exeter",
      slug: "sweetspot-exeter",
      city: "Exeter",
      menu_url: null,
    },
  }
}

describe("ProductCard image plate", () => {
  // ~90% of dispensary-CDN packshots are opaque rectangles, not transparent
  // cutouts, so inset padding drew a visible frame around an image that already
  // had its own edges. The image fills the tile instead.
  it("renders the packshot edge to edge, with no inset padding", () => {
    render(<ProductCard listing={makeListing()} />)
    const img = screen.getByRole("img", { name: "Blue Dream 3.5g" })
    expect(img.className).not.toMatch(/(^|\s)p-\d/)
  })

  // Contain, never cover: cropping a package makes the SKU harder to recognize,
  // and ~45% of packshots aren't square so cover would crop most of the grid.
  it("scales the packshot to fit rather than cropping it", () => {
    render(<ProductCard listing={makeListing()} />)
    const img = screen.getByRole("img", { name: "Blue Dream 3.5g" })
    expect(img).toHaveClass("object-contain")
    expect(img).not.toHaveClass("object-cover")
  })

  // The one light surface in a dark-only UI, and deliberate: 62% of packshots
  // are shot on white and another 8% are cutouts drawn for white, so the muted
  // tile boxed the majority case in a visible frame. Asserted because it reads
  // as an oversight next to every other bg-muted surface.
  it("stands the packshot on a white plate, not the dark muted tile", () => {
    render(<ProductCard listing={makeListing()} />)
    const plate = screen.getByRole("img", { name: "Blue Dream 3.5g" })
      .parentElement!
    expect(plate).toHaveClass("bg-product-plate")
    expect(plate).not.toHaveClass("bg-muted")
  })

  // Regression: the plate carried the card's divider as border-b. aspect-ratio
  // sizes the BORDER box, so that 1px left the fill image a 210.25x209.25
  // content box; object-contain fitted the (square) packshot to 209.25 square
  // and centred it, painting 0.5px of white plate down each side — invisible on
  // a white packshot, a white hairline around every dark one. jsdom computes no
  // layout, so the invariant is asserted structurally: no border on the plate,
  // divider on the text block instead.
  it("puts no border on the square plate, so packshots fill it exactly", () => {
    render(<ProductCard listing={makeListing()} />)
    const plate = screen.getByRole("img", { name: "Blue Dream 3.5g" })
      .parentElement!
    expect(plate).toHaveClass("aspect-square")
    expect(plate.className).not.toMatch(/\bborder-b\b/)

    const textBlock = plate.nextElementSibling!
    expect(textBlock).toHaveClass("border-t")
  })
})

function withProduct(
  patch: Partial<InventoryListing["product"]>,
  listingPatch: Partial<InventoryListing> = {}
): InventoryListing {
  const listing = makeListing()
  return {
    ...listing,
    ...listingPatch,
    product: { ...listing.product, ...patch },
  }
}

describe("ProductCard unit price", () => {
  // A price-comparison site that prints "$88.00 / 28g" next to "$6.00 / 1g"
  // and never divides is asking the shopper to do the arithmetic: the 28g pack
  // is $3.14/g, less than half the rate of the "cheaper" gram.
  it("normalizes the price to $/g so two pack sizes can be compared", () => {
    render(
      <ProductCard
        listing={withProduct(
          { weight_grams: 28, weight_display: "28g" },
          { price: 88 }
        )}
      />
    )
    expect(screen.getByText(/\$3\.14\/g/)).toBeInTheDocument()
  })

  // The card reserves fixed heights on the name and THC lines so grid rows stay
  // even; the unit price shares the THC line rather than adding one.
  it("shares the reserved stats line with THC instead of adding a line", () => {
    render(
      <ProductCard
        listing={withProduct(
          { weight_grams: 28, weight_display: "28g" },
          { price: 88 }
        )}
      />
    )
    const stats = screen.getByText("$3.14/g · THC: 21.4%")
    expect(stats.className).toMatch(/min-h-\[1rem\]/)
    // nowrap, so a card carrying both facts can never grow a second line.
    expect(stats).toHaveClass("truncate")
  })

  // An edible's weight_grams is its THC dose (100mg → 0.1g), so $/g would read
  // "$180.00/g" on an $18 bag of gummies.
  // An edible has no per-gram rate — its weight_grams is the THC dose — but it
  // does have a per-dose one, which is the number that compares it to the pack
  // beside it. $18 for 100mg of THC is $1.80 per 10mg.
  it("prices an edible per dose instead of per gram", () => {
    render(
      <ProductCard
        listing={withProduct(
          {
            category: "edible",
            weight_grams: 0.1,
            weight_display: "100mg",
          },
          { price: 18 }
        )}
      />
    )
    expect(screen.queryByText(/\/g\b/)).not.toBeInTheDocument()
    expect(screen.getByText(/\$1\.80\/10mg/)).toBeInTheDocument()
  })

  // The flower-equivalent rows carry no resolvable dose, so the card falls
  // silent rather than printing a rate 33x better than reality.
  it("prints no rate for a flower-equivalent edible row", () => {
    render(
      <ProductCard
        listing={withProduct(
          {
            category: "edible",
            weight_grams: 3.33,
            weight_display: "3330mg",
          },
          { price: 18 }
        )}
      />
    )
    expect(screen.queryByText(/\/10mg/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\/g\b/)).not.toBeInTheDocument()
  })
})

describe("ProductCard dispensary line", () => {
  function atShop(name: string, city: string | null): InventoryListing {
    const listing = makeListing()
    return { ...listing, dispensary: { ...listing.dispensary, name, city } }
  }

  // "Reef Wellness" and "Sweetspot" are an hour apart; the card used to give a
  // truncated store name and no town at all.
  it("shows the town when the store name doesn't already say it", () => {
    render(<ProductCard listing={atShop("Reef Wellness", "Woonsocket")} />)
    expect(screen.getByText("· Woonsocket")).toBeInTheDocument()
  })

  it("doesn't repeat a town the store name already carries", () => {
    render(<ProductCard listing={atShop("Newport Cannabis Co.", "Newport")} />)
    expect(screen.queryByText(/· Newport/)).not.toBeInTheDocument()
  })

  // The where-line shares the Buy + upvote row at sm+, and only there. On mobile
  // the actions are 44px touch targets and three of them inline on a ~175px card
  // leaves the shop name ~15px, so it takes its own full-width row first.
  it("folds the where-line into the action row at sm+, but not on mobile", () => {
    render(<ProductCard listing={atShop("Aura of Rhode Island", "Central Falls")} />)
    const whereLine = screen.getByText("Aura of Rhode Island").closest("div")!
    const footer = whereLine.parentElement!.className
    expect(footer).toMatch(/sm:flex-row/)
    expect(footer).toMatch(/flex-col/)
  })

  // The multi-shop label on /saved names no single store, so no town applies.
  it("adds no town to a multi-dispensary count", () => {
    render(
      <ProductCard
        listing={atShop("Reef Wellness", "Woonsocket")}
        stock={{ inStock: true, dispensaryCount: 3 }}
      />
    )
    expect(screen.getByText("3 dispensaries")).toBeInTheDocument()
    expect(screen.queryByText("· Woonsocket")).not.toBeInTheDocument()
  })
})

describe("ProductCard eager (LCP hint)", () => {
  it("eager cards load the image eagerly with high fetch priority; default cards stay lazy", () => {
    const { unmount } = render(<ProductCard listing={makeListing()} eager />)
    const eagerImg = screen.getByRole("img", { name: "Blue Dream 3.5g" })
    expect(eagerImg).toHaveAttribute("loading", "eager")
    expect(eagerImg).toHaveAttribute("fetchpriority", "high")
    unmount()

    render(<ProductCard listing={makeListing()} />)
    const lazyImg = screen.getByRole("img", { name: "Blue Dream 3.5g" })
    // next/image falls back to its lazy default when no eager hint is passed.
    expect(lazyImg).toHaveAttribute("loading", "lazy")
    expect(lazyImg).not.toHaveAttribute("fetchpriority", "high")
  })
})
