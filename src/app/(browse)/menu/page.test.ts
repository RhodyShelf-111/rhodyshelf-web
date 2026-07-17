import { describe, it, expect, vi, beforeEach } from "vitest"
import MenuPage from "./page"
import { permanentRedirect } from "next/navigation"

// The real permanentRedirect throws a control-flow error Next catches at the
// framework layer; stub it so we can assert the target URL instead.
vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn(),
}))

const redirected = vi.mocked(permanentRedirect)

describe("MenuPage legacy redirect", () => {
  beforeEach(() => {
    redirected.mockClear()
  })

  it("maps legacy /menu params onto /search (search → q), dropping array values", async () => {
    await MenuPage({
      searchParams: Promise.resolve({
        // Repeated params arrive as arrays; the typeof-string guard must drop
        // them even for a KNOWN key (this is the branch under test).
        category: ["flower", "edible"],
        brand: "Lovewell Farms",
        dispensary: "sweetspot-exeter",
        search: "gummies",
        sale: "true",
      }),
    })
    expect(redirected).toHaveBeenCalledTimes(1)
    const target = new URL(redirected.mock.calls[0][0], "https://rhodyshelf.com")
    expect(target.pathname).toBe("/search")
    expect(target.searchParams.has("category")).toBe(false)
    expect(target.searchParams.get("brand")).toBe("Lovewell Farms")
    expect(target.searchParams.get("dispensary")).toBe("sweetspot-exeter")
    expect(target.searchParams.get("q")).toBe("gummies")
    expect(target.searchParams.get("sale")).toBe("true")
    expect(target.searchParams.has("search")).toBe(false)
  })

  it("redirects bare /menu to /search with no query string", async () => {
    await MenuPage({ searchParams: Promise.resolve({}) })
    expect(redirected).toHaveBeenCalledWith("/search")
  })
})
