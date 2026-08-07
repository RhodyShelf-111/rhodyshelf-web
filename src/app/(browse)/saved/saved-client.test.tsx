import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import type { UpvotedListing } from "@/lib/types"

// The saved list itself is localStorage-backed and memoized module-side; these
// tests are about what the page SAYS when the lookup fails, so drive the id
// list directly and leave the storage hook's own caching out of it.
const saved = vi.hoisted(() => ({ ids: [] as string[] }))
vi.mock("@/hooks/use-upvotes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-upvotes")>()),
  useSavedProductIds: () => saved.ids,
}))

import { SavedClient } from "./saved-client"

const IDS = ["p-one", "p-two"]

function makeUpvoted(id: string, inStock = true): UpvotedListing {
  return {
    id: `l-${id}`,
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
      id,
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
      id: `d-${id}`,
      name: "Test Dispensary",
      slug: "test-dispensary",
      city: "Providence",
      menu_url: null,
    },
    inStock,
    dispensaryCount: inStock ? 1 : 0,
  }
}

beforeEach(() => {
  saved.ids = [...IDS]
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("SavedClient load failure", () => {
  // Regression: /api/saved answers 503 with `{ listings: [] }`, and the client
  // collapsed that into an empty list — so a transient DB error announced that
  // the visitor's entire saved list had been delisted from every Rhode Island
  // menu, while it sat intact in localStorage the whole time.
  it("never claims the saved products left the catalog when the fetch 503s", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ listings: [] }),
      })
    )
    render(<SavedClient />)

    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load your saved products/i)
      ).toBeInTheDocument()
    )
    expect(screen.getByText(/safe on this device/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/no longer in our Rhode Island catalog/i)
    ).not.toBeInTheDocument()
  })

  it("treats a network failure the same way", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    render(<SavedClient />)

    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load your saved products/i)
      ).toBeInTheDocument()
    )
  })

  it("still reports how many products are saved on this device", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    render(<SavedClient />)

    await waitFor(() =>
      expect(
        screen.getByText("2 products saved on this device")
      ).toBeInTheDocument()
    )
  })

  it("retries for real, and recovers", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ listings: [makeUpvoted(IDS[0])] }),
      })
    vi.stubGlobal("fetch", fetchMock)
    render(<SavedClient />)

    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load your saved products/i)
      ).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    await waitFor(() =>
      expect(screen.getByText(`Product ${IDS[0]}`)).toBeInTheDocument()
    )
    expect(
      screen.queryByText(/couldn't load your saved products/i)
    ).not.toBeInTheDocument()
  })

  // A 200 that resolves nothing is the ONLY case that genuinely means "gone
  // from the catalog" — keep the original copy for it.
  it("keeps the delisted copy for a successful lookup that resolves nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ listings: [] }) })
    )
    render(<SavedClient />)

    await waitFor(() =>
      expect(
        screen.getByText(/no longer in our Rhode Island catalog/i)
      ).toBeInTheDocument()
    )
    expect(
      screen.queryByText(/couldn't load your saved products/i)
    ).not.toBeInTheDocument()
  })

  it("keeps the last good list on screen when a refetch fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ listings: [makeUpvoted(IDS[0])] }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const { rerender } = render(<SavedClient />)

    await waitFor(() =>
      expect(screen.getByText(`Product ${IDS[0]}`)).toBeInTheDocument()
    )

    // Saving another product triggers a refetch that fails — the cards that
    // did load stay put instead of collapsing into an error page.
    fetchMock.mockRejectedValue(new Error("offline"))
    saved.ids = [...IDS, "p-three"]
    rerender(<SavedClient />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.getByText(`Product ${IDS[0]}`)).toBeInTheDocument()
    expect(
      screen.queryByText(/couldn't load your saved products/i)
    ).not.toBeInTheDocument()
  })
})

describe("SavedClient loading placeholder", () => {
  /** ProductGridSkeleton marks its grid aria-hidden. */
  function skeletonGrid(container: HTMLElement) {
    const grid = container.querySelector('[aria-hidden="true"]')
    if (!grid) throw new Error("skeleton grid not rendered")
    return grid
  }

  // Regression: the bespoke skeleton was ~150px shorter than a real card, so
  // the page jumped ~150px per row the moment /api/saved resolved — and it
  // always drew 10 regardless of how many products were actually saved.
  it("draws one height-matched placeholder per saved id", () => {
    // Never resolves — holds the component in its loading state.
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})))
    const { container } = render(<SavedClient />)

    const grid = skeletonGrid(container)
    expect(grid.children).toHaveLength(IDS.length)
    // The shared skeleton reserves the real card's bottom row (a 44px touch
    // target on mobile); the hand-rolled one had no such row at all.
    expect(grid.innerHTML).toContain("h-11")
  })

  it("caps the placeholder at 12 for a long saved list", () => {
    saved.ids = Array.from({ length: 40 }, (_, i) => `id-${i}`)
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})))
    const { container } = render(<SavedClient />)

    expect(skeletonGrid(container).children).toHaveLength(12)
  })
})
