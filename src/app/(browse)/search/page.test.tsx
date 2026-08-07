import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"

const searchListings = vi.fn()
// Hoisted with the vi.mock factory that reads it.
const BROWSE_CATEGORIES = vi.hoisted(() => [
  { key: "flower", label: "Flower" },
  { key: "vape", label: "Vapes" },
])
vi.mock("@/lib/queries/products", () => ({
  searchListings: (...a: unknown[]) => searchListings(...a),
  getBrandNames: async () => [],
  getBrandNamesFor: async () => [],
  getBrandCountsFor: async () => ({}),
  // What getCategories() actually returns: raw distinct values, "other" and all.
  getCategories: async () => ["flower", "other", "vape"],
  HOMEPAGE_CATEGORIES: BROWSE_CATEGORIES,
  SEARCH_PAGE_SIZE: 96,
}))
vi.mock("@/lib/queries/dispensaries", () => ({ getDispensaries: async () => [] }))

// The results UI is covered by search-client.test.tsx; stub it so these tests
// are about what the PAGE decides — chiefly whether a failed query is flagged.
const handed = vi.fn()
vi.mock("./search-client", () => ({
  SearchClient: (props: Record<string, unknown>) => {
    handed(props)
    return <div data-testid="search-client" />
  },
}))

import SearchPage from "./page"

function run(params: Record<string, string> = {}) {
  return SearchPage({ searchParams: Promise.resolve(params) })
}

beforeEach(() => {
  vi.clearAllMocks()
  // The catch logs the real error for the server logs; keep runs quiet.
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe("SearchPage degraded results", () => {
  // Regression: the catch returned a bare empty page, which is byte-identical
  // to a genuine zero-result — so a DB blip had the site telling a shopper that
  // no Rhode Island dispensary carries gummies.
  it("flags a failed query instead of serving it as a zero-result", async () => {
    searchListings.mockRejectedValue(new Error("db down"))

    render(await run({ q: "gummies" }))

    expect(handed.mock.calls[0][0].degraded).toBe(true)
    // The count is the falsehood: don't assert one we never got.
    expect(
      screen.queryByText(/products across Rhode Island dispensaries/)
    ).not.toBeInTheDocument()
    // …but the query is still echoed back, so retyping stays possible.
    expect(
      screen.getByRole("heading", { level: 1, name: 'Results for "gummies"' })
    ).toBeInTheDocument()
  })

  it("still states the count for a genuine zero-result", async () => {
    searchListings.mockResolvedValue({ listings: [], total: 0, pageSize: 96 })

    render(await run({ q: "zzzzqqq" }))

    expect(handed.mock.calls[0][0].degraded).toBe(false)
    expect(
      screen.getByText("0 products across Rhode Island dispensaries")
    ).toBeInTheDocument()
  })

  it("hands the client the curated categories, not the raw distinct values", async () => {
    searchListings.mockResolvedValue({ listings: [], total: 0, pageSize: 96 })

    render(await run())

    const props = handed.mock.calls[0][0]
    // "other" is an internal catch-all with no landing page — it may seed the
    // filter facets, but never the no-results recovery chips.
    expect(props.browseCategories).toEqual(BROWSE_CATEGORIES)
    expect(props.categories).toContain("other")
  })
})
