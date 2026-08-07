import { describe, it, expect, beforeAll, afterEach, vi } from "vitest"
import {
  act,
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react"
import { ProductGrid, countActiveFilters } from "./product-grid"
import type { InventoryListing } from "@/lib/types"

// Comfortably past FULL_SET_IDLE_MS (1s) in product-grid.tsx.
const PAST_IDLE_MS = 1500

beforeAll(() => {
  // Base UI's floating popup machinery expects these browser APIs; jsdom
  // ships neither.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver
})

function makeListing(
  id: string,
  brand: string,
  dispensaryName: string,
  category = "flower"
): InventoryListing {
  const slug = dispensaryName.toLowerCase().replace(/\s+/g, "-")
  return {
    id,
    price: 25,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: 21.4,
    cbd_percent: null,
    image_url: null,
    product_url: null,
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: `p-${id}`,
      name: `Product ${id}`,
      brand_id: null,
      brand_name: brand,
      category,
      subcategory: null,
      weight_grams: null,
      weight_display: null,
      strain_type: "hybrid",
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: `d-${slug}`,
      name: dispensaryName,
      slug,
      city: null,
      menu_url: null,
    },
  }
}

const listings = [
  makeListing("l1", "Hi5", "Mother Earth"),
  makeListing("l2", "Lovewell Farms", "Sweetspot Exeter"),
  makeListing("l3", "Sweetspot", "Sweetspot Exeter", "concentrate"),
]

function openFilterSheet() {
  fireEvent.click(screen.getByRole("button", { name: /^filters/i }))
  return screen.getByRole("dialog")
}

/**
 * The full-set fetch is deferred until there's a reason for it. Reaching for
 * the Filters control is the earliest signal — and what every real filter
 * change starts with — so most progressive-loading tests open with this.
 */
function reachForFilters() {
  fireEvent.pointerDown(screen.getByRole("button", { name: /^filters/i }), {
    button: 0,
    pointerId: 1,
  })
}

describe("ProductGrid mobile filter sheet", () => {
  it("shows a brand tapped in the sheet as selected immediately (regression: hidden sidebar twin unchecked it)", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    const radio = within(sheet).getByRole("radio", { name: "Hi5" })
    fireEvent.click(radio)

    expect(radio).toBeChecked()
    // The sidebar twin reflects the same state on re-render. It sits behind
    // the modal sheet (aria-hidden), so include hidden nodes in the query.
    const allHi5 = screen.getAllByRole("radio", { name: "Hi5", hidden: true })
    expect(allHi5).toHaveLength(2)
    for (const r of allHi5) expect(r).toBeChecked()
  })

  it("keeps the sheet's Show-results footer count live as filters change", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    expect(
      within(sheet).getByRole("button", { name: "Show 3 results" })
    ).toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole("radio", { name: "Hi5" }))

    expect(
      within(sheet).getByRole("button", { name: "Show 1 result" })
    ).toBeInTheDocument()
  })

  it("clears a filter when its radio is re-tapped", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    const radio = within(sheet).getByRole("radio", { name: "Hi5" })
    fireEvent.click(radio)
    expect(radio).toBeChecked()

    fireEvent.click(radio)
    expect(radio).not.toBeChecked()
  })

  it("shows a dispensary tapped in the sheet as selected immediately", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    const radio = within(sheet).getByRole("radio", { name: "Sweetspot Exeter" })
    fireEvent.click(radio)

    expect(radio).toBeChecked()
  })

  it("narrows the brand options to what the selected dispensary stocks", () => {
    render(<ProductGrid listings={listings} />)

    const sheet = openFilterSheet()
    // All three brands offered up front…
    expect(within(sheet).getByRole("radio", { name: "Hi5" })).toBeInTheDocument()

    fireEvent.click(
      within(sheet).getByRole("radio", { name: "Sweetspot Exeter" })
    )

    // …then only Sweetspot Exeter's brands remain; Hi5 (Mother Earth only)
    // would have produced an empty grid.
    expect(within(sheet).queryByRole("radio", { name: "Hi5" })).toBeNull()
    expect(
      within(sheet).getByRole("radio", { name: "Lovewell Farms" })
    ).toBeInTheDocument()
    expect(
      within(sheet).getByRole("radio", { name: "Sweetspot" })
    ).toBeInTheDocument()
    // The Brand section itself must not vanish even if narrowing left it
    // with few options.
    expect(within(sheet).getByText("Brand")).toBeInTheDocument()
  })
})

describe("ProductGrid progressive loading", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function ok(rows: InventoryListing[]) {
    return { ok: true, json: async () => ({ listings: rows }) }
  }

  it("fetches the full set once from /api/listings and swaps it in", async () => {
    const full = [
      makeListing("l1", "Hi5", "Mother Earth"),
      makeListing("l2", "Aster", "Solar"),
      makeListing("l3", "Bloom", "Solar"),
    ]
    const fetchMock = vi.fn(async () => ok(full))
    vi.stubGlobal("fetch", fetchMock)

    // Server-rendered first slice is just l1; l2/l3 arrive from the full fetch.
    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )

    expect(screen.getByText("Product l1")).toBeInTheDocument()
    reachForFilters()

    await waitFor(() =>
      expect(screen.getByText("Product l3")).toBeInTheDocument()
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain(
      "/api/listings?scope=category&value=flower"
    )
    expect(screen.getByText(/of\s+3\s+products/)).toBeInTheDocument()
  })

  it("does not fetch when no loadRest is given", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    render(<ProductGrid listings={listings} />)

    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("resolves a dispensary scope to /api/listings by slug", async () => {
    const fetchMock = vi.fn(async () =>
      ok([makeListing("l1", "Hi5", "Mother Earth")])
    )
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{
          total: 1,
          scope: "dispensary",
          value: "mother-earth-pawtucket",
        }}
      />
    )
    reachForFilters()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain(
      "/api/listings?scope=dispensary&value=mother-earth-pawtucket"
    )
  })

  it("shows the filtered count, not the true total, once a filter narrows the set", async () => {
    const full = [
      makeListing("l1", "Hi5", "Mother Earth"),
      makeListing("l2", "Aster", "Solar"),
      makeListing("l3", "Bloom", "Solar"),
    ]
    const fetchMock = vi.fn(async () => ok(full))
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        initialFilters={{ brand: "Hi5" }}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // Only Hi5 matches, so the denominator is the filtered count — not restTotal.
    expect(screen.getByText(/of\s+1\s+products/)).toBeInTheDocument()
    expect(screen.queryByText(/of\s+3\s+products/)).toBeNull()
  })

  it("surfaces a retry and the honest total when the full-set fetch fails (never a silent truncation)", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )
    reachForFilters()

    // Retries, then gives up — but does NOT silently cap the menu: the slice
    // stays usable, a Retry appears, and the count still shows the true total
    // (of 3) so the shopper knows more products exist.
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument(),
      { timeout: 4000 }
    )
    expect(screen.getByText("Product l1")).toBeInTheDocument()
    expect(screen.getByText(/of\s+3\s+products/)).toBeInTheDocument()
    expect(screen.queryByText(/Loading/)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("recovers when the shopper taps Retry after a failed full-set fetch", async () => {
    let fail = true
    const fetchMock = vi.fn(async () => {
      if (fail) return { ok: false, json: async () => ({}) }
      return ok([
        makeListing("l1", "Hi5", "Mother Earth"),
        makeListing("l2", "Aster", "Solar"),
        makeListing("l3", "Bloom", "Solar"),
      ])
    })
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )
    reachForFilters()

    const retry = await screen.findByRole("button", { name: "Retry" }, { timeout: 4000 })
    fail = false // next fetch succeeds
    fireEvent.click(retry)

    await waitFor(() =>
      expect(screen.getByText("Product l3")).toBeInTheDocument()
    )
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
  })

  it("replaces the slice with an empty set when the category sold out (no stale rows)", async () => {
    const fetchMock = vi.fn(async () => ok([]))
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )
    reachForFilters()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // The stale slice row must not linger once the authoritative (empty) set
    // arrives.
    await waitFor(() =>
      expect(screen.queryByText("Product l1")).toBeNull()
    )
  })

  it("recovers on retry after a transient failure", async () => {
    let call = 0
    const fetchMock = vi.fn(async () => {
      call += 1
      if (call === 1) throw new Error("network blip")
      return ok([
        makeListing("l1", "Hi5", "Mother Earth"),
        makeListing("l2", "Aster", "Solar"),
      ])
    })
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 2, scope: "category", value: "flower" }}
      />
    )
    reachForFilters()

    await waitFor(
      () => expect(screen.getByText("Product l2")).toBeInTheDocument(),
      { timeout: 4000 }
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("surfaces a retry when the full-set fetch throws every time", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down")
    })
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )
    reachForFilters()

    await waitFor(
      () => expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument(),
      { timeout: 4000 }
    )
    expect(screen.getByText("Product l1")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("shows a loading row, not 'no products', when a filter matches nothing mid-load", async () => {
    // Never resolves → loadingRest stays true for the assertion window.
    const fetchMock = vi.fn(() => new Promise<never>(() => {}))
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        initialFilters={{ brand: "Nonexistent Brand" }}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )

    await waitFor(() =>
      expect(screen.getByText(/Loading all 3 products/)).toBeInTheDocument()
    )
    // The empty result set is still loading — must not read as a dead end.
    expect(screen.queryByText(/No products match/)).toBeNull()
  })

  it("aborts the in-flight fetch when the grid unmounts", async () => {
    let capturedSignal: AbortSignal | undefined
    const fetchMock = vi.fn((...args: unknown[]) => {
      capturedSignal = (args[1] as { signal?: AbortSignal } | undefined)?.signal
      return new Promise<never>(() => {}) // never resolves — stays in flight
    })
    vi.stubGlobal("fetch", fetchMock)

    const { unmount } = render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )
    reachForFilters()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(capturedSignal?.aborted).toBe(false)
    unmount()
    expect(capturedSignal?.aborted).toBe(true)
  })
})

describe("ProductGrid deferred full-set fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  function ok(rows: InventoryListing[]) {
    return { ok: true, json: async () => ({ listings: rows }) }
  }

  const slice = [makeListing("l1", "Hi5", "Mother Earth")]
  const full = [
    makeListing("l1", "Hi5", "Mother Earth"),
    makeListing("l2", "Aster", "Solar"),
  ]

  function stubFetch() {
    const fetchMock = vi.fn(async () => ok(full))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("does not fetch the megabyte until the shopper needs it", async () => {
    const fetchMock = stubFetch()

    render(
      <ProductGrid
        listings={slice}
        loadRest={{ total: 500, scope: "category", value: "flower" }}
      />
    )

    // A shopper who lands, reads two rows and taps a card pays nothing for
    // /api/listings — the slice is already on screen.
    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText("Product l1")).toBeInTheDocument()
  })

  it("starts the fetch when the shopper reaches for the filter controls", async () => {
    const fetchMock = stubFetch()

    render(
      <ProductGrid
        listings={slice}
        loadRest={{ total: 2, scope: "category", value: "flower" }}
      />
    )
    reachForFilters()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it("fetches up front when the page is deep-linked with a filter", async () => {
    const fetchMock = stubFetch()

    // The slice can't answer a filter about the whole category, so there's
    // nothing to defer — no interaction here at all.
    render(
      <ProductGrid
        listings={slice}
        initialFilters={{ brand: "Hi5" }}
        loadRest={{ total: 2, scope: "category", value: "flower" }}
      />
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it("fetches up front when the page is deep-linked with a sort", async () => {
    const fetchMock = stubFetch()

    // Sorting the slice by price answers "cheapest in the slice", not
    // "cheapest in the category".
    render(
      <ProductGrid
        listings={slice}
        initialFilters={{ sort: "price-asc" }}
        loadRest={{ total: 2, scope: "category", value: "flower" }}
      />
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it("fetches when the shopper pages past the server-rendered slice", async () => {
    const fetchMock = stubFetch()

    render(
      <ProductGrid
        listings={slice}
        pageSize={1}
        loadRest={{ total: 2, scope: "category", value: "flower" }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Load more/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it("fetches on desktop without waiting, where the filter sidebar is already on screen", async () => {
    // Fake timers, and advance far short of FULL_SET_IDLE_MS: with real timers
    // the idle warm-up lands at ~1s, inside waitFor's default window, so the
    // assertion would pass even with the desktop branch gone.
    vi.useFakeTimers()
    const fetchMock = stubFetch()
    vi.stubGlobal("matchMedia", ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia)

    render(
      <ProductGrid
        listings={slice}
        loadRest={{ total: 2, scope: "category", value: "flower" }}
      />
    )

    // The sidebar's brand list is visible from the first paint — an
    // incomplete one there would be silently wrong.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("warms the full set in idle time for a shopper who lingers", async () => {
    vi.useFakeTimers()
    const fetchMock = stubFetch()

    render(
      <ProductGrid
        listings={slice}
        loadRest={{ total: 2, scope: "category", value: "flower" }}
      />
    )

    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAST_IDLE_MS)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("holds the idle warm-up until the page's own load event", async () => {
    vi.useFakeTimers()
    const fetchMock = stubFetch()
    // Still loading: the product images are the ones competing for the
    // connection, so the warm-up must not jump the queue.
    Object.defineProperty(document, "readyState", {
      value: "loading",
      configurable: true,
    })

    try {
      render(
        <ProductGrid
          listings={slice}
          loadRest={{ total: 2, scope: "category", value: "flower" }}
        />
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(PAST_IDLE_MS * 3)
      })
      expect(fetchMock).not.toHaveBeenCalled()

      await act(async () => {
        window.dispatchEvent(new Event("load"))
        await vi.advanceTimersByTimeAsync(PAST_IDLE_MS)
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      delete (document as { readyState?: unknown }).readyState
    }
  })

  it("uses requestIdleCallback for the warm-up where the browser has one", async () => {
    const fetchMock = stubFetch()
    let idleCallback: (() => void) | undefined
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
      idleCallback = cb
      return 7
    })
    vi.stubGlobal("cancelIdleCallback", vi.fn())

    render(
      <ProductGrid
        listings={slice}
        loadRest={{ total: 2, scope: "category", value: "flower" }}
      />
    )

    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => {
      idleCallback?.()
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})

describe("countActiveFilters", () => {
  it("counts the filters that actually narrow the grid", () => {
    expect(
      countActiveFilters({ brand: "Hi5", dispensary: "solar", onSale: true })
    ).toBe(3)
  })

  it("ignores unset, empty and false values", () => {
    expect(
      countActiveFilters({
        brand: undefined,
        search: "",
        onSale: false,
      })
    ).toBe(0)
  })

  it("does not count sort — it reorders, it doesn't filter", () => {
    expect(countActiveFilters({ sort: "price-asc" })).toBe(0)
    expect(countActiveFilters({ sort: "price-asc", brand: "Hi5" })).toBe(1)
  })
})

describe("ProductGrid result counts", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("announces the result count politely when a filter swaps the set", () => {
    render(<ProductGrid listings={listings} />)

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Showing 3 of 3 products")
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status).toHaveAttribute("aria-atomic", "true")

    // Filter from the always-mounted sidebar panel rather than the sheet: an
    // open modal aria-hides the page behind it, which would take the live
    // region out of the accessibility tree for the assertion.
    fireEvent.click(screen.getAllByRole("radio", { name: "Hi5" })[0])

    // Same node, new text — a screen reader reads the change out.
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 1 product")
  })

  it("counts 'Load more' against the server's total while the full set is outstanding", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<never>(() => {}))
    )

    render(
      <ProductGrid
        listings={listings}
        pageSize={1}
        loadRest={{ total: 500, scope: "category", value: "flower" }}
      />
    )

    // The slice holds 3 rows, but 500 exist — "2 remaining" would send the
    // shopper away thinking they'd seen the category.
    expect(
      screen.getByRole("button", { name: "Load more (499 remaining)" })
    ).toBeInTheDocument()
  })

  it("drops 'Load more' once the full set lands short of the server's estimate", async () => {
    // The count the server passed in is an estimate; paging off it must not
    // outlive the real snapshot, or the shopper is left tapping a button for
    // rows that don't exist.
    const full = [
      makeListing("l1", "Hi5", "Mother Earth"),
      makeListing("l2", "Aster", "Solar"),
    ]
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ listings: full }) }))
    )

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 500, scope: "category", value: "flower" }}
      />
    )

    expect(
      screen.getByRole("button", { name: "Load more (450 remaining)" })
    ).toBeInTheDocument()

    reachForFilters()

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Load more/ })).toBeNull()
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 2 of 2 products"
    )
  })

  it("does not treat a page's default sort as an active filter", () => {
    render(
      <ProductGrid listings={listings} initialFilters={{ sort: "price-asc" }} />
    )

    // No chip row, no badge on Filters: nothing has been filtered.
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull()
    expect(
      screen.getByRole("button", { name: /^filters$/i })
    ).toBeInTheDocument()
  })
})

describe("ProductGrid touch targets", () => {
  it("removes the filter when the chip's label is tapped, not just its ×", () => {
    render(<ProductGrid listings={listings} initialFilters={{ brand: "Hi5" }} />)

    const chip = screen.getByRole("button", { name: "Remove Hi5 filter" })
    // 44px tall on mobile, back to the compact chip from sm up.
    expect(chip).toHaveClass("h-11", "sm:h-auto")

    fireEvent.click(chip)
    expect(screen.queryByRole("button", { name: "Remove Hi5 filter" })).toBeNull()
  })

  it("gives 'Clear all' and 'Load more' thumb-sized targets on mobile", () => {
    // Sweetspot Exeter stocks two of the three listings, so with pageSize 1
    // both the chip row and a "Load more" are on screen at once.
    render(
      <ProductGrid
        listings={listings}
        pageSize={1}
        initialFilters={{ dispensary: "sweetspot-exeter" }}
      />
    )

    expect(screen.getByRole("button", { name: "Clear all" })).toHaveClass(
      "min-h-11"
    )
    // The size variant's h-8 must lose to the mobile override.
    const loadMore = screen.getByRole("button", { name: /Load more/ })
    expect(loadMore).toHaveClass("h-11", "sm:h-8")
    expect(loadMore).not.toHaveClass("h-8")
  })

  it("keeps the controls row reachable with a sticky bar under the header", () => {
    render(<ProductGrid listings={listings} />)

    const row = screen.getByRole("status").parentElement
    // top-16 clears the 64px site header; lg:static hands the job back to the
    // desktop sidebar layout.
    expect(row).toHaveClass("sticky", "top-16", "lg:static")
  })
})
