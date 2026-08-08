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

describe("ProductCard stats line", () => {
  // The unit rate ("$3.14/g") used to share this line with THC. The card
  // already carries category, strain, name, brand, price, pack size, shop and
  // town in ~175px, and a second money figure directly under the first read as
  // clutter rather than as the comparison it was meant to be. The rate still
  // leads the product page and the /best-value rows.
  it("prints no per-gram rate next to the price", () => {
    render(
      <ProductCard
        listing={withProduct(
          { weight_grams: 28, weight_display: "28g" },
          { price: 88 }
        )}
      />
    )
    expect(screen.queryByText(/\$3\.14\/g/)).not.toBeInTheDocument()
    expect(screen.getByText("$88.00")).toBeInTheDocument()
  })

  // Same for the dose-priced categories — an edible's "$1.80/10mg" is off the
  // card too, so the rule is "no rate here", not "no rate we can't compute".
  it("prints no per-dose rate for an edible", () => {
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
    expect(screen.queryByText(/\/10mg/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\/g\b/)).not.toBeInTheDocument()
  })

  it("prints THC on a single truncating line", () => {
    render(
      <ProductCard
        listing={withProduct(
          { weight_grams: 28, weight_display: "28g" },
          { price: 88 }
        )}
      />
    )
    // truncate, not wrap: a long stat can never grow a second line and knock
    // its card out of its grid row.
    expect(screen.getByText("THC: 21.4%")).toHaveClass("truncate")
  })

  // Regression: the line reserved its height unconditionally, which made sense
  // while it also carried the unit rate. Potency is nulled at the read boundary
  // for everything but flower/pre-roll/vape/concentrate, so 44% of live
  // listings rendered a dead 19px band under the price. Alignment doesn't
  // depend on it — the grid stretches cards and the footer is bottom-pinned.
  it("renders no line at all when the listing reports no potency", () => {
    const { container } = render(
      <ProductCard
        listing={withProduct(
          { category: "accessory", weight_display: null },
          { price: 30, thc_percent: null }
        )}
      />
    )
    const blank = [...container.querySelectorAll("p")].filter(
      (p) => p.textContent?.trim() === ""
    )
    expect(blank).toHaveLength(0)
  })

  // The footer stays bottom-pinned, which is what actually keeps the shop line
  // and Buy button level across a row of unequal cards.
  it("pins the footer to the bottom so rows stay aligned without the spacer", () => {
    render(<ProductCard listing={makeListing()} />)
    const footer = screen.getByText("Sweetspot").closest("div")!.parentElement!
    expect(footer).toHaveClass("mt-auto")
  })
})

describe("ProductCard dispensary line", () => {
  function atShop(name: string, city: string | null): InventoryListing {
    const listing = makeListing()
    return { ...listing, dispensary: { ...listing.dispensary, name, city } }
  }

  // The registered name is the licence, not the label: "Aura of Rhode Island -
  // Central Falls" truncated to "Aura of Rhode I…" on a grid card. The short
  // name fits whole.
  it("abbreviates the store name", () => {
    render(
      <ProductCard
        listing={atShop("Aura of Rhode Island - Central Falls", "Central Falls")}
      />
    )
    expect(screen.getByText("Aura")).toBeInTheDocument()
    expect(screen.queryByText(/Aura of Rhode Island/)).not.toBeInTheDocument()
  })

  // The town used to ride along as "· Woonsocket". A grid tile already carries
  // category, strain, name, brand, price, pack size and shop; the town is on
  // the product page, one tap away, where there's room for it.
  it("prints no town beside the shop", () => {
    render(<ProductCard listing={atShop("Reef Wellness", "Woonsocket")} />)
    expect(screen.getByText("Reef")).toBeInTheDocument()
    expect(screen.queryByText(/Woonsocket/)).not.toBeInTheDocument()
  })

  // The full name is still the data — analytics keys off it, and a screen
  // reader reading the Buy link out of context needs the real store.
  it("keeps the full name on the buy link and its analytics attribute", () => {
    render(
      <ProductCard
        listing={{
          ...atShop("Solar Cannabis Co. Warwick", "Warwick"),
          product_url: "https://shop.example/p/1",
        }}
      />
    )
    const buy = screen.getByRole("link", { name: /Buy Blue Dream/ })
    expect(buy).toHaveAttribute("data-dispensary", "Solar Cannabis Co. Warwick")
    expect(buy.getAttribute("aria-label")).toContain("Solar Cannabis Co. Warwick")
    expect(screen.getByText("Solar")).toBeInTheDocument()
  })

  // The card's own link is what a screen reader announces, and the same SKU
  // ranks once per shop on /search and /category. Without the shop in the
  // accessible name, four adjacent links read identically and there is no way
  // to tell which one opens which store.
  it("names the shop in the card link, so sibling cards don't announce alike", () => {
    const { unmount } = render(
      <ProductCard listing={atShop("Solar Cannabis Co. Warwick", "Warwick")} />
    )
    const first = screen.getByRole("link", {
      name: "Blue Dream 3.5g by Lovewell Farms at Solar Cannabis Co. Warwick",
    })
    expect(first).toHaveAttribute("href", "/product/l1")
    unmount()

    // Same product, different shop: the accessible names must differ.
    render(<ProductCard listing={atShop("Reef Wellness", "Woonsocket")} />)
    expect(
      screen.getByRole("link", {
        name: "Blue Dream 3.5g by Lovewell Farms at Reef Wellness",
      })
    ).toBeInTheDocument()
  })

  // The where-line shares the Buy + upvote row at sm+, and only there. On mobile
  // the actions are 44px touch targets and three of them inline on a ~175px card
  // leaves the shop name ~15px, so it takes its own full-width row first.
  it("folds the where-line into the action row at sm+, but not on mobile", () => {
    render(
      <ProductCard
        listing={atShop("Aura of Rhode Island - Central Falls", "Central Falls")}
      />
    )
    const whereLine = screen.getByText("Aura").closest("div")!
    const footer = whereLine.parentElement!.className
    expect(footer).toMatch(/sm:flex-row/)
    expect(footer).toMatch(/flex-col/)
  })

  // A product carried at several stores can't be labelled with one of them, so
  // /saved shows the count instead of any single (short) name.
  it("shows a count instead of a store name when several carry it", () => {
    render(
      <ProductCard
        listing={atShop("Reef Wellness", "Woonsocket")}
        stock={{ inStock: true, dispensaryCount: 3 }}
      />
    )
    expect(screen.getByText("3 dispensaries")).toBeInTheDocument()
    expect(screen.queryByText("Reef")).not.toBeInTheDocument()
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
