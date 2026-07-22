import { describe, it, expect, beforeAll, afterEach, vi } from "vitest"
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react"
import { ProductGrid } from "./product-grid"
import type { InventoryListing } from "@/lib/types"

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
  fireEvent.click(screen.getByRole("button", { name: /filters/i }))
  return screen.getByRole("dialog")
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

  it("keeps the first slice when the full-set fetch returns a non-ok response", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    vi.stubGlobal("fetch", fetchMock)

    render(
      <ProductGrid
        listings={[makeListing("l1", "Hi5", "Mother Earth")]}
        loadRest={{ total: 3, scope: "category", value: "flower" }}
      />
    )

    // Retries, then gives up; the slice stays usable, no perpetual loading row.
    await waitFor(() => expect(screen.queryByText(/Loading/)).toBeNull(), {
      timeout: 4000,
    })
    expect(screen.getByText("Product l1")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
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

    await waitFor(
      () => expect(screen.getByText("Product l2")).toBeInTheDocument(),
      { timeout: 4000 }
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("keeps the first slice when the full-set fetch throws every time", async () => {
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

    await waitFor(() => expect(screen.queryByText(/Loading/)).toBeNull(), {
      timeout: 4000,
    })
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

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(capturedSignal?.aborted).toBe(false)
    unmount()
    expect(capturedSignal?.aborted).toBe(true)
  })
})
