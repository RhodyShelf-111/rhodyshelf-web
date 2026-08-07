import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import type { InventoryListing, SearchQuery } from "@/lib/types"

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), refresh }),
}))

import { SearchClient } from "./search-client"

beforeAll(() => {
  // FilterBar's Base UI popup machinery expects these; jsdom ships neither.
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

beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
})
afterEach(() => vi.restoreAllMocks())

function makeListing(id: string, brand = "Acme Farms"): InventoryListing {
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
      brand_name: brand,
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
  }
}

// The canonical list the header/footer/homepage promote — mirrors what
// search/page.tsx hands down as `browseCategories`.
const BROWSE_CATEGORIES = [
  { key: "flower", label: "Flower" },
  { key: "concentrate", label: "Concentrates" },
  { key: "pre-roll", label: "Pre-Rolls" },
  { key: "vape", label: "Vapes" },
  { key: "edible", label: "Edibles" },
  { key: "topical", label: "Topicals" },
  { key: "accessory", label: "Accessories" },
] as const

function renderClient(
  overrides: Partial<React.ComponentProps<typeof SearchClient>> = {}
) {
  const query: SearchQuery = { sort: "brand-asc" }
  return render(
    <SearchClient
      query={query}
      initialListings={[]}
      total={0}
      pageSize={96}
      degraded={false}
      brands={[]}
      brandOptions={[]}
      brandCounts={{}}
      // What getCategories() actually returns: raw distinct values, including
      // the internal "other" bucket.
      categories={[
        "accessory",
        "concentrate",
        "edible",
        "flower",
        "other",
        "pre-roll",
        "topical",
        "vape",
      ]}
      browseCategories={BROWSE_CATEGORIES}
      dispensaries={[]}
      {...overrides}
    />
  )
}

describe("SearchClient degraded state", () => {
  it("says the data was unreachable instead of 'No products match'", () => {
    renderClient({ degraded: true, query: { q: "gummies", sort: "brand-asc" } })

    expect(
      screen.getByText(/couldn't reach our menu data/i)
    ).toBeInTheDocument()
    // The falsehood this whole branch exists to prevent.
    expect(screen.queryByText(/No products match/i)).not.toBeInTheDocument()
  })

  it("suppresses the '0 products' count while degraded", () => {
    const { unmount } = renderClient()
    // Sanity-check the assertion below actually detects FilterBar: it leads
    // with "<n> products" and carries the mobile Filters trigger.
    expect(document.body.textContent).toMatch(/0\s*products/)
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument()
    unmount()

    renderClient({ degraded: true })

    // A hard 0 next to "we couldn't reach the data" is the same lie in a
    // smaller font.
    expect(document.body.textContent).not.toMatch(/0\s*products/)
    expect(
      screen.queryByRole("button", { name: "Filters" })
    ).not.toBeInTheDocument()
  })

  it("offers a real retry", () => {
    renderClient({ degraded: true })

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("only offers Clear all filters when something is actually filtered", () => {
    const { unmount } = renderClient({ degraded: true })
    expect(
      screen.queryByRole("button", { name: /clear all filters/i })
    ).not.toBeInTheDocument()
    unmount()

    renderClient({
      degraded: true,
      query: { category: "flower", sort: "brand-asc" },
    })
    expect(
      screen.getByRole("button", { name: /clear all filters/i })
    ).toBeInTheDocument()
  })
})

describe("SearchClient empty state", () => {
  /** The no-results block itself — FilterBar renders its own category chips. */
  function emptyBlock() {
    const el = screen.getByText("Try a different search or browse by category")
      .parentElement
    if (!el) throw new Error("empty state not found")
    return el
  }

  it("recovers into the seven merchandised categories, not the raw list", () => {
    renderClient({ query: { q: "zzzzqqq", sort: "brand-asc" } })

    expect(screen.getByText('No products match "zzzzqqq"')).toBeInTheDocument()
    const block = within(emptyBlock())
    // "other" is an internal catch-all with no landing page, and the old
    // alphabetical slice(0, 6) also dropped Vapes — one of the seven the
    // header, footer and homepage all promote.
    expect(block.getByRole("button", { name: "Vapes" })).toBeInTheDocument()
    expect(
      block.queryByRole("button", { name: /^other$/i })
    ).not.toBeInTheDocument()
    for (const c of BROWSE_CATEGORIES) {
      expect(block.getByRole("button", { name: c.label })).toBeInTheDocument()
    }
  })

  it("navigates to a chip's DB category key, not its display label", () => {
    renderClient({ query: { q: "zzzzqqq", sort: "brand-asc" } })

    fireEvent.click(within(emptyBlock()).getByRole("button", { name: "Pre-Rolls" }))

    expect(push).toHaveBeenCalledWith("/search?category=pre-roll", {
      scroll: false,
    })
  })
})

describe("SearchClient results heading", () => {
  it("bridges H1 → H3 with an sr-only H2 so heading nav doesn't skip a level", () => {
    renderClient({
      query: { q: "flower", sort: "brand-asc" },
      initialListings: [makeListing("l1")],
      total: 1,
    })

    const h2 = screen.getByRole("heading", { level: 2, name: "Search results" })
    expect(h2).toHaveClass("sr-only")
    // The product cards' own H3s now sit under it.
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(
      0
    )
  })

  it("does not render the results heading when there are no results", () => {
    renderClient({ query: { q: "zzzzqqq", sort: "brand-asc" } })

    expect(
      screen.queryByRole("heading", { level: 2, name: "Search results" })
    ).not.toBeInTheDocument()
  })
})

describe("SearchClient load more", () => {
  const listings = Array.from({ length: 2 }, (_, i) =>
    makeListing(`l${i}`, "Acme Farms")
  )

  function renderWithMore() {
    return renderClient({
      query: { q: "flower", sort: "brand-asc" },
      initialListings: listings,
      total: 50,
      pageSize: 2,
    })
  }

  it("appends the next page on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          listings: [makeListing("l9")],
          total: 50,
          pageSize: 2,
        }),
      })
    )
    renderWithMore()

    fireEvent.click(screen.getByRole("button", { name: /load more/i }))

    await waitFor(() =>
      expect(screen.getByText("Product l9")).toBeInTheDocument()
    )
    expect(
      screen.queryByText(/couldn't load more results/i)
    ).not.toBeInTheDocument()
  })

  // Regression: /api/search answers 503 with an empty page, and loadMore did
  // `if (!res.ok) return` — the label flickered Load more → Loading… → Load
  // more and the shopper had no way to tell a failure from "nothing there".
  it("surfaces a 503 as a failure with a retry, instead of silently resetting", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ listings: [], total: 0, pageSize: 2 }),
    })
    vi.stubGlobal("fetch", fetchMock)
    renderWithMore()

    fireEvent.click(screen.getByRole("button", { name: /load more/i }))

    await waitFor(() =>
      expect(screen.getByText(/couldn't load more results/i)).toBeInTheDocument()
    )
    const retry = screen.getByRole("button", { name: "Retry" })
    expect(retry).toBeInTheDocument()
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()

    // …and the retry is a real second attempt.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        listings: [makeListing("l9")],
        total: 50,
        pageSize: 2,
      }),
    })
    fireEvent.click(retry)
    await waitFor(() =>
      expect(screen.getByText("Product l9")).toBeInTheDocument()
    )
    expect(
      screen.queryByText(/couldn't load more results/i)
    ).not.toBeInTheDocument()
  })

  it("surfaces a network failure the same way", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    renderWithMore()

    fireEvent.click(screen.getByRole("button", { name: /load more/i }))

    await waitFor(() =>
      expect(screen.getByText(/couldn't load more results/i)).toBeInTheDocument()
    )
  })
})
