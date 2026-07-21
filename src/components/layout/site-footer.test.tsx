import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { DispensaryWithCounts } from "@/lib/types"

// Stub the query layer: the footer is a server component whose only data
// dependency is getDispensaries (Supabase + unstable_cache underneath).
vi.mock("@/lib/queries/dispensaries", () => ({
  getDispensaries: vi.fn(),
}))
// products.ts (source of HOMEPAGE_CATEGORIES) transitively imports the
// server-only Supabase client; neutralize it for jsdom.
vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: vi.fn(),
}))

import { SiteFooter } from "./site-footer"
import { getDispensaries } from "@/lib/queries/dispensaries"

const mockedGetDispensaries = vi.mocked(getDispensaries)

function makeDispensary(
  name: string,
  productCount: number
): DispensaryWithCounts {
  return {
    id: `d-${name}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    city: null,
    menu_url: null,
    product_count: productCount,
    deal_count: 0,
  }
}

describe("SiteFooter", () => {
  beforeEach(() => {
    mockedGetDispensaries.mockReset()
  })

  it("links all 7 categories and lists live dispensaries alphabetically, capped at 9", async () => {
    const dispensaries = [
      makeDispensary("Zen Leaf", 10),
      makeDispensary("Ghost Shop", 0), // no fresh products → hidden
      ...Array.from({ length: 9 }, (_, i) =>
        makeDispensary(`Shop ${String.fromCharCode(65 + i)}`, 5)
      ),
    ]
    mockedGetDispensaries.mockResolvedValue(dispensaries)

    render(await SiteFooter())

    // Category deep links come from HOMEPAGE_CATEGORIES.
    expect(screen.getByRole("link", { name: "Flower" })).toHaveAttribute(
      "href",
      "/category/flower"
    )
    expect(screen.getByRole("link", { name: "Pre-Rolls" })).toHaveAttribute(
      "href",
      "/category/pre-roll"
    )
    expect(screen.getByRole("link", { name: "Brands" })).toHaveAttribute(
      "href",
      "/brand"
    )
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about"
    )

    // 10 live shops sorted A→Z, sliced to 9: Shop A..I stay, Zen Leaf (last
    // alphabetically) and the zero-count shop drop out.
    expect(screen.getByRole("link", { name: "Shop A" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Shop I" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Zen Leaf" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Ghost Shop" })).toBeNull()
    expect(
      screen.getByRole("link", { name: "All dispensaries" })
    ).toHaveAttribute("href", "/dispensary")
  })

  it("links the Instagram profile with safe external-link attributes", async () => {
    mockedGetDispensaries.mockResolvedValue([])

    render(await SiteFooter())

    const instagram = screen.getByRole("link", { name: "Instagram" })
    expect(instagram).toHaveAttribute(
      "href",
      "https://www.instagram.com/rhodyshelf"
    )
    expect(instagram).toHaveAttribute("target", "_blank")
    // noopener guards the opener. rel="me" is an optional one-way identity
    // hint (microformats/IndieAuth, e.g. Mastodon verification) — it is NOT
    // what backs the sameAs claim; Google doesn't read rel="me" at all, and
    // Instagram emits no reciprocal link. The sameAs/href URL-match test in
    // social-links.test.tsx is what actually protects that association.
    // Tokenized because a substring check for "me" also matches rel="home".
    const rel = instagram.getAttribute("rel")!.split(/\s+/)
    expect(rel).toEqual(expect.arrayContaining(["me", "noopener", "noreferrer"]))
  })

  it("still renders navigation when the dispensary query fails", async () => {
    mockedGetDispensaries.mockRejectedValue(new Error("db down"))

    render(await SiteFooter())

    // The .catch(() => []) fallback keeps the footer alive: categories and the
    // index link render, just without per-dispensary links.
    expect(screen.getByRole("link", { name: "Edibles" })).toHaveAttribute(
      "href",
      "/category/edible"
    )
    expect(
      screen.getByRole("link", { name: "All dispensaries" })
    ).toBeInTheDocument()
  })
})
