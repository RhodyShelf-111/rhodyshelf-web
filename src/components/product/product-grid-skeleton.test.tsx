import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProductGridSkeleton } from "./product-grid-skeleton"
import { ProductCard } from "./product-card"
import type { InventoryListing } from "@/lib/types"

/**
 * The skeleton exists to hold the real card's height. jsdom has no layout, so
 * these tests can't measure pixels — instead they pin the skeleton's reserved
 * rows to the height classes the REAL card renders, which is where the drift
 * actually happens. (The skeleton was 21px short per card because its rows were
 * h-3/h-4 guesses on a space-y-1.5 stack while the card renders 18/36/20/20/20
 * on space-y-1.)
 */

function makeListing(): InventoryListing {
  return {
    id: "l1",
    price: 42,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: 21.5,
    cbd_percent: null,
    image_url: null,
    // A buy URL so the real card renders its action row.
    product_url: "https://example.com/buy",
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: "p-l1",
      name: "Product One",
      brand_id: null,
      brand_name: "Acme Farms",
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
      name: "Test Dispensary",
      slug: "test-dispensary",
      city: "Providence",
      menu_url: null,
    },
  }
}

/** Every placeholder bar inside one skeleton card, in document order. */
function bars(): HTMLElement[] {
  return [...document.querySelectorAll('[data-slot="skeleton"]')].filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  )
}

function classes(el: Element): string[] {
  return el.className.split(/\s+/)
}

/** The unprefixed `h-*` token (ignores `min-h-*` and breakpoint variants). */
function height(el: Element): string | undefined {
  return classes(el).find((c) => /^h-/.test(c))
}

describe("ProductGridSkeleton", () => {
  it("renders `count` cards on the grid columns it was given", () => {
    render(<ProductGridSkeleton count={4} className="grid-cols-2" />)
    // One image plate + 7 text/action bars per card.
    expect(bars()).toHaveLength(4 * 8)
    const grid = document.querySelector('[aria-hidden="true"]')
    expect(classes(grid!)).toContain("grid-cols-2")
  })

  // The whole point of the component: the reserved rows are the real card's
  // rendered heights, measured at a 390px viewport. Change ProductCard's text
  // stack and this list has to move with it.
  it("reserves the real card's measured row heights", () => {
    render(<ProductGridSkeleton count={1} />)
    const [plate, ...rows] = bars()

    expect(classes(plate)).toContain("aspect-square")
    // Matches the real plate's hairline. Appearance only — aspect-square
    // resolves against the border box, so the border adds no height.
    expect(classes(plate)).toContain("border-b")

    expect(rows.map(height)).toEqual([
      "h-[18px]", //   category · strain   (text-[12px])
      "h-9", //        name, 2 lines       (min-h-[2.25rem])
      "h-[19.5px]", // brand               (text-[13px])
      "h-5", //        price               (text-sm)
      "h-[19.5px]", // $/g · THC           (text-[13px] min-h-[1rem])
      "h-[18px]", //   dispensary line     (text-[12px] + icon)
      "h-11", //       action row          (h-11 / sm:h-7)
    ])
  })

  it("uses the real card's stack gap and padding, not its own", () => {
    const { container } = render(<ProductGridSkeleton count={1} />)
    const content = container.querySelector(".flex-1")!
    // px-3 py-2.5 on the content box, space-y-1 between text rows — all three
    // copied from ProductCard. space-y-1.5 here cost 2px a row.
    expect(classes(content)).toEqual(
      expect.arrayContaining(["px-3", "py-2.5"])
    )
    expect(container.querySelector(".space-y-1")).not.toBeNull()
    expect(container.querySelector(".space-y-1\\.5")).toBeNull()
  })
})

describe("ProductGridSkeleton vs. the real ProductCard", () => {
  it("reserves the same two-line name height the card renders", () => {
    render(<ProductCard listing={makeListing()} />)
    const name = screen.getByRole("heading", { name: "Product One" })
    // h-9 == 2.25rem == the card's min-h-[2.25rem].
    expect(classes(name)).toContain("min-h-[2.25rem]")
  })

  it("reserves the card's 44px mobile action row, shrinking to 28px at sm+", () => {
    render(<ProductCard listing={makeListing()} />)
    const buy = screen.getByRole("link", { name: /^Buy / })
    expect(classes(buy)).toEqual(expect.arrayContaining(["h-11", "sm:h-7"]))

    render(<ProductGridSkeleton count={1} />)
    const action = bars().at(-1)!
    expect(classes(action)).toEqual(expect.arrayContaining(["h-11", "sm:h-7"]))
  })

  // Regression: the skeleton went sm:flex-row and folded the dispensary line
  // into the action row at sm+, but the real card keeps them stacked at every
  // breakpoint — so the desktop skeleton was a whole row short.
  it("keeps the dispensary line on its own row at every breakpoint", () => {
    const { container: card } = render(<ProductCard listing={makeListing()} />)
    const cardBottom = card.querySelector(".mt-auto")!
    expect(classes(cardBottom)).toContain("flex-col")
    expect(classes(cardBottom)).not.toContain("sm:flex-row")

    const { container: skeleton } = render(<ProductGridSkeleton count={1} />)
    const skeletonBottom = skeleton.querySelector(".mt-auto")!
    expect(classes(skeletonBottom)).toContain("flex-col")
    expect(classes(skeletonBottom)).not.toContain("sm:flex-row")
    // Same pt-2 / gap-2 as the card's bottom block.
    expect(classes(skeletonBottom)).toEqual(
      expect.arrayContaining(["pt-2", "gap-2"])
    )
    expect(classes(cardBottom)).toEqual(
      expect.arrayContaining(["pt-2", "gap-2"])
    )
  })
})
