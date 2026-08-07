import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { InventoryListing } from "@/lib/types"

const getDeals = vi.fn()
vi.mock("@/lib/queries/products", () => ({
  getDeals: (...a: unknown[]) => getDeals(...a),
}))

// The grid is covered by product-grid.test.tsx; stub it so these tests are
// about what the PAGE hands it — i.e. how much data goes over the wire.
const handed = vi.fn()
const handedProps = vi.fn()
vi.mock("../menu/menu-client", () => ({
  MenuClient: (props: {
    listings: InventoryListing[]
    loadRest?: { total: number; scope: string; value?: string }
  }) => {
    handed(props.listings)
    handedProps(props)
    return <div data-testid="menu-client" />
  },
}))

import DealsPage, { DEALS_SHOWN } from "./page"

function deals(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `l${i}` }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("DealsPage payload", () => {
  // Regression: the page handed MenuClient the whole DEALS_CAP result (219
  // listings today, up to 400 on a heavy sale day) while the grid renders 50 at
  // a time — ~780 KB of RSC payload for cards nothing reaches without a tap.
  it("serializes at most DEALS_SHOWN listings, best discounts first", async () => {
    getDeals.mockResolvedValue({ listings: deals(400), total: 1287 })
    render(await DealsPage())

    const sent = handed.mock.calls[0][0]
    expect(sent).toHaveLength(DEALS_SHOWN)
    // Ordered by discount desc upstream, so the cap must keep the head.
    expect(sent[0].id).toBe("l0")
  })

  // The slice is a paint optimization, not a smaller catalog: the grid fetches
  // the rest itself, so the heading states the real number with no hedge and
  // filtering still runs over every deal.
  it("asks the grid for the rest, and states the true total unhedged", async () => {
    getDeals.mockResolvedValue({ listings: deals(400), total: 1287 })
    render(await DealsPage())

    expect(
      screen.getByText(/1,287 products on sale right now/)
    ).toBeInTheDocument()
    expect(screen.queryByText(/showing the top/)).not.toBeInTheDocument()
    expect(handedProps.mock.calls[0][0].loadRest).toEqual({
      total: 1287,
      scope: "deals",
    })
  })

  it("skips the follow-up fetch when the slice already holds everything", async () => {
    getDeals.mockResolvedValue({ listings: deals(12), total: 12 })
    render(await DealsPage())

    expect(handed.mock.calls[0][0]).toHaveLength(12)
    expect(handedProps.mock.calls[0][0].loadRest).toBeUndefined()
  })

  it("renders the empty state instead of the grid when there are no deals", async () => {
    getDeals.mockResolvedValue({ listings: [], total: 0 })
    render(await DealsPage())

    expect(handed).not.toHaveBeenCalled()
    expect(screen.getByText("No deals listed right now")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Browse all products" })).toHaveAttribute(
      "href",
      "/search"
    )
  })
})
