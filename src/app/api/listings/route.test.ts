import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock the data layer so the route's branching (allowlist, slug resolution,
// error paths) is what's under test — not the DB.
const getInventoryByCategory = vi.fn()
const getInventoryByDispensary = vi.fn()
const getInventoryByBrand = vi.fn()
const getBrandBySlug = vi.fn()
const getDeals = vi.fn()
const getDrops = vi.fn()
const getDispensaryBySlug = vi.fn()

vi.mock("@/lib/queries/products", () => ({
  getInventoryByCategory: (...a: unknown[]) => getInventoryByCategory(...a),
  getInventoryByDispensary: (...a: unknown[]) => getInventoryByDispensary(...a),
  getInventoryByBrand: (...a: unknown[]) => getInventoryByBrand(...a),
  getBrandBySlug: (...a: unknown[]) => getBrandBySlug(...a),
  getDeals: (...a: unknown[]) => getDeals(...a),
  getDrops: (...a: unknown[]) => getDrops(...a),
  // The route builds its category allowlist from this at import time.
  HOMEPAGE_CATEGORIES: [
    { key: "flower", label: "Flower" },
    { key: "concentrate", label: "Concentrates" },
  ],
}))

vi.mock("@/lib/queries/dispensaries", () => ({
  getDispensaryBySlug: (...a: unknown[]) => getDispensaryBySlug(...a),
}))

import { GET } from "./route"

function req(query: string) {
  return new NextRequest(`http://localhost/api/listings${query}`)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("/api/listings", () => {
  it("returns the full set for a valid category, CDN-cacheable", async () => {
    getInventoryByCategory.mockResolvedValue([{ id: "l1" }, { id: "l2" }])
    const res = await GET(req("?scope=category&value=flower"))
    expect(res.status).toBe(200)
    expect(getInventoryByCategory).toHaveBeenCalledWith("flower")
    expect(res.headers.get("cache-control")).toMatch(/s-maxage/)
    expect((await res.json()).listings).toHaveLength(2)
  })

  it("rejects an unknown category with 400 no-store WITHOUT hitting the DB", async () => {
    const res = await GET(req("?scope=category&value=not-a-real-category"))
    expect(res.status).toBe(400)
    expect(res.headers.get("cache-control")).toBe("no-store")
    // The allowlist must short-circuit before the cached DB query, so a
    // random-value flood can't pump the cache full of empty results.
    expect(getInventoryByCategory).not.toHaveBeenCalled()
  })

  it("is case-sensitive on the category allowlist (Flower != flower)", async () => {
    const res = await GET(req("?scope=category&value=Flower"))
    expect(res.status).toBe(400)
    expect(getInventoryByCategory).not.toHaveBeenCalled()
  })

  it("resolves a dispensary slug to its id and returns its listings", async () => {
    getDispensaryBySlug.mockResolvedValue({ id: "disp-1", slug: "mother-earth" })
    getInventoryByDispensary.mockResolvedValue([{ id: "l1" }])
    const res = await GET(req("?scope=dispensary&value=mother-earth"))
    expect(res.status).toBe(200)
    expect(getDispensaryBySlug).toHaveBeenCalledWith("mother-earth")
    expect(getInventoryByDispensary).toHaveBeenCalledWith("disp-1")
    expect((await res.json()).listings).toHaveLength(1)
  })

  it("returns 404 no-store for an unknown dispensary slug", async () => {
    getDispensaryBySlug.mockResolvedValue(null)
    const res = await GET(req("?scope=dispensary&value=nope"))
    expect(res.status).toBe(404)
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(getInventoryByDispensary).not.toHaveBeenCalled()
  })

  it("resolves a brand slug to its canonical name and returns its listings", async () => {
    getBrandBySlug.mockResolvedValue({
      canonical_name: "Mother Earth Wellness",
      slug: "mother-earth-wellness",
    })
    getInventoryByBrand.mockResolvedValue([{ id: "l1" }, { id: "l2" }])
    const res = await GET(req("?scope=brand&value=mother-earth-wellness"))
    expect(res.status).toBe(200)
    expect(getBrandBySlug).toHaveBeenCalledWith("mother-earth-wellness")
    // The inventory query is keyed on the canonical name, never the raw slug.
    expect(getInventoryByBrand).toHaveBeenCalledWith("Mother Earth Wellness")
    expect(res.headers.get("cache-control")).toMatch(/s-maxage/)
    expect((await res.json()).listings).toHaveLength(2)
  })

  // The brands table is the allowlist for this scope: an unknown slug has to
  // stop before the cached inventory query, or a random-slug flood pumps the
  // data cache full of empty brands.
  it("returns 404 no-store for an unknown brand slug WITHOUT hitting inventory", async () => {
    getBrandBySlug.mockResolvedValue(null)
    const res = await GET(req("?scope=brand&value=nope"))
    expect(res.status).toBe(404)
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(getInventoryByBrand).not.toHaveBeenCalled()
  })

  // drops/deals are single cached sets with no caller-supplied key, so they
  // take no `value` at all — the missing-value guard must not reject them.
  it("serves the whole-site scopes without a value", async () => {
    getDrops.mockResolvedValue([{ id: "d1" }, { id: "d2" }, { id: "d3" }])
    getDeals.mockResolvedValue({ listings: [{ id: "x1" }], total: 412 })

    const drops = await GET(req("?scope=drops"))
    expect(drops.status).toBe(200)
    expect(drops.headers.get("cache-control")).toMatch(/s-maxage/)
    expect((await drops.json()).listings).toHaveLength(3)

    const deals = await GET(req("?scope=deals"))
    expect(deals.status).toBe(200)
    // getDeals returns { listings, total } — only the listings go on the wire.
    expect((await deals.json()).listings).toEqual([{ id: "x1" }])
  })

  it("400s a missing value", async () => {
    const res = await GET(req("?scope=category"))
    expect(res.status).toBe(400)
    expect(res.headers.get("cache-control")).toBe("no-store")
    // Missing value on a keyed scope must never fall through to a query.
    expect(getInventoryByCategory).not.toHaveBeenCalled()
  })

  it("400s an unknown scope", async () => {
    const res = await GET(req("?scope=bogus&value=flower"))
    expect(res.status).toBe(400)
  })

  it("degrades to 503 no-store (never cached) if the query throws", async () => {
    getInventoryByCategory.mockRejectedValue(new Error("db down"))
    const res = await GET(req("?scope=category&value=flower"))
    expect(res.status).toBe(503)
    expect(res.headers.get("cache-control")).toBe("no-store")
  })
})
