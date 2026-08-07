import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { DropListing } from "@/lib/types"

const getDrops = vi.fn()
vi.mock("@/lib/queries/products", () => ({
  getDrops: (...a: unknown[]) => getDrops(...a),
}))

// Stub the grid host: these tests are about how much of the 14-day window the
// page serializes, not about how the grid renders it.
const handed = vi.fn()
const handedProps = vi.fn()
vi.mock("./drops-client", () => ({
  DropsClient: (props: { drops: DropListing[]; total?: number }) => {
    handed(props.drops)
    handedProps(props)
    return <div data-testid="drops-client" />
  },
}))

import DropsPage, { DROPS_SHOWN } from "./page"

function drops(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    dropped_at: "2026-08-01T12:00:00.000Z",
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("DropsPage payload", () => {
  // Regression: /drops handed its whole 14-day window (431 listings, each with
  // the full embedded product + dispensary) to a client component, so all of it
  // was serialized into the RSC payload — ~950 KB — to paint 50 cards. It was
  // the heaviest route on the site AND the one the nav prefetches.
  it("serializes at most DROPS_SHOWN listings, newest first", async () => {
    getDrops.mockResolvedValue(drops(431))
    render(await DropsPage())

    const sent = handed.mock.calls[0][0]
    expect(sent).toHaveLength(DROPS_SHOWN)
    // getDrops orders by dropped_at desc, so the cap must keep the fresh end.
    expect(sent[0].id).toBe("d0")
  })

  // The slice is a paint optimization, not a shorter window: the client fetches
  // the rest, so the description stays plain and filtering covers all 14 days.
  it("hands the client the true window size so it can fetch the rest", async () => {
    getDrops.mockResolvedValue(drops(431))
    render(await DropsPage())

    expect(handedProps.mock.calls[0][0].total).toBe(431)
    expect(screen.queryByText(/showing the newest/)).not.toBeInTheDocument()
    expect(
      screen.getByText("Products added in the last 14 days")
    ).toBeInTheDocument()
  })

  it("skips the follow-up fetch when the whole window fits", async () => {
    getDrops.mockResolvedValue(drops(20))
    render(await DropsPage())

    expect(handed.mock.calls[0][0]).toHaveLength(20)
    expect(handedProps.mock.calls[0][0].total).toBeUndefined()
    expect(
      screen.getByText("Products added in the last 14 days")
    ).toBeInTheDocument()
  })

  // The collection really does hold every drop in the window — the cap is a
  // payload decision, so it must not shrink what the structured data claims.
  it("reports the full window size in its JSON-LD, not the rendered cap", async () => {
    getDrops.mockResolvedValue(drops(431))
    const { container } = render(await DropsPage())

    const script = container.querySelector(
      'script[type="application/ld+json"]'
    )!
    const data = JSON.parse(script.textContent!)
    expect(data.mainEntity.numberOfItems).toBe(431)
  })

  it("renders the empty state instead of the grid when nothing dropped", async () => {
    getDrops.mockResolvedValue([])
    render(await DropsPage())

    expect(handed).not.toHaveBeenCalled()
    expect(
      screen.getByText("No new products in the last 14 days")
    ).toBeInTheDocument()
  })
})
