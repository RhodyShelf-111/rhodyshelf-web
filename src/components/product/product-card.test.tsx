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
