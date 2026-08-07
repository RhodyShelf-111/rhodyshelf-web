import { describe, it, expect, vi, beforeEach } from "vitest"

const getDispensaries = vi.fn()
const getBrands = vi.fn()
const getSitemapListings = vi.fn()

vi.mock("@/lib/queries/dispensaries", () => ({
  getDispensaries: () => getDispensaries(),
}))

vi.mock("@/lib/queries/products", () => ({
  getBrands: () => getBrands(),
  getSitemapListings: () => getSitemapListings(),
  HOMEPAGE_CATEGORIES: [
    { key: "flower", label: "Flower" },
    { key: "edible", label: "Edibles" },
  ],
}))

import sitemap from "./sitemap"
import { VALUE_CATEGORIES } from "@/lib/value-ranking"

beforeEach(() => {
  vi.clearAllMocks()
  getDispensaries.mockResolvedValue([{ slug: "mother-earth-pawtucket" }])
  getBrands.mockResolvedValue([{ slug: "good-green" }])
  getSitemapListings.mockResolvedValue([])
})

const urls = async () => (await sitemap()).map((e) => e.url)

describe("sitemap", () => {
  it("lists the best-value index", async () => {
    expect(await urls()).toContain("https://rhodyshelf.com/best-value")
  })

  // Regression: the per-category entries were built into a `valuePages` array
  // that was never spread into the returned list, so four indexable pages were
  // silently missing from the sitemap while looking fully implemented.
  it("lists every rankable category page", async () => {
    const all = await urls()
    for (const category of VALUE_CATEGORIES) {
      expect(all).toContain(`https://rhodyshelf.com/best-value/${category}`)
    }
  })

  it("does not invent a value page for a category that cannot be ranked", async () => {
    // Topicals and tinctures are dose-labelled like edibles but far too thin to
    // rank (43 and 14 live listings), so they stay out of VALUE_CATEGORIES and
    // must stay out of here. Pre-rolls are out for untrustworthy pack weights.
    const all = await urls()
    expect(all).not.toContain("https://rhodyshelf.com/best-value/topical")
    expect(all).not.toContain("https://rhodyshelf.com/best-value/tincture")
    expect(all).not.toContain("https://rhodyshelf.com/best-value/pre-roll")
  })

  it("still lists the pages that existed before", async () => {
    const all = await urls()
    expect(all).toContain("https://rhodyshelf.com/deals")
    expect(all).toContain("https://rhodyshelf.com/drops")
    expect(all).toContain("https://rhodyshelf.com/category/flower")
    expect(all).toContain("https://rhodyshelf.com/dispensary/mother-earth-pawtucket")
    expect(all).toContain("https://rhodyshelf.com/brand/good-green")
  })

  it("emits no duplicate URLs", async () => {
    const all = await urls()
    expect(new Set(all).size).toBe(all.length)
  })
})
