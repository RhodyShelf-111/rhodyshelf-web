import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SearchQuery } from "@/lib/types"

// unstable_cache is a pass-through here: what's under test is the query the
// data layer builds and what it does with the rows, not Next's data cache.
vi.mock("next/cache", () => ({
  unstable_cache: <T,>(fn: T) => fn,
}))

const from = vi.fn()
vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: () => ({ from: (table: string) => from(table) }),
}))

import {
  searchListings,
  getDeals,
  getListingById,
  SEARCH_PAGE_SIZE,
} from "./products"

type QueryCall = { method: string; args: unknown[] }
type Ctx = { table: string; select: string; calls: QueryCall[] }
type Result = { data?: unknown; count?: number; error?: unknown }
type Responder = (ctx: Ctx) => Result

/** Minimal stand-in for a PostgREST query builder: every filter/order call is
 *  recorded and chains, and awaiting it (or .range()/.maybeSingle()) hands the
 *  recorded calls to the test's responder. */
function fakeQuery(table: string, respond: Responder, seen: Ctx[]) {
  const calls: QueryCall[] = []
  const ctx: Ctx = { table, select: "", calls }
  const settle = () => Promise.resolve(respond(ctx))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = {}
  for (const m of ["eq", "gt", "lt", "in", "ilike", "or", "order", "limit"]) {
    q[m] = (...args: unknown[]) => {
      calls.push({ method: m, args })
      return q
    }
  }
  q.select = (...args: unknown[]) => {
    calls.push({ method: "select", args })
    ctx.select = String(args[0])
    seen.push(ctx)
    return q
  }
  q.range = (...args: unknown[]) => {
    calls.push({ method: "range", args })
    return settle()
  }
  q.maybeSingle = () => settle()
  q.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
    settle().then(res, rej)
  return q
}

/** Install a responder; returns the list of queries it saw, in order. */
function respondWith(respond: Responder): Ctx[] {
  const seen: Ctx[] = []
  from.mockImplementation((table: string) => fakeQuery(table, respond, seen))
  return seen
}

function argsOf(ctx: Ctx, method: string): unknown[][] {
  return ctx.calls.filter((c) => c.method === method).map((c) => c.args)
}

let seq = 0
function row(
  over: {
    id?: string
    category?: string
    thc?: number | null
    cbd?: number | null
    productId?: string
    dispensaryId?: string
  } = {}
) {
  const id = over.id ?? `l${++seq}`
  return {
    id,
    price: 10,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: over.thc === undefined ? 22.5 : over.thc,
    cbd_percent: over.cbd === undefined ? null : over.cbd,
    image_url: null,
    product_url: null,
    last_seen_at: "2026-08-06T13:15:00+00:00",
    product: {
      id: over.productId ?? `p-${id}`,
      name: `Product ${id}`,
      brand_id: null,
      brand_name: "Brand",
      category: over.category ?? "flower",
      subcategory: null,
      weight_grams: null,
      weight_display: null,
      strain_type: null,
      strain_name: null,
      image_url: null,
    },
    dispensary: {
      id: over.dispensaryId ?? `d-${id}`,
      name: "Shop",
      slug: "shop",
      city: null,
      menu_url: null,
    },
  }
}

/** The full-listing select carries potency; the id-only scan doesn't. */
const isFullListing = (ctx: Ctx) => ctx.select.includes("thc_percent")

function query(over: Partial<SearchQuery> = {}): SearchQuery {
  return { sort: "brand-asc", ...over }
}

beforeEach(() => {
  vi.clearAllMocks()
  seq = 0
})

describe("potency sanitation", () => {
  it("keeps a real percent-by-weight assay untouched", async () => {
    respondWith(() => ({ data: [row({ category: "flower", thc: 25.4 })] }))
    const { listings } = await getDeals()
    expect(listings[0].thc_percent).toBe(25.4)
  })

  it("drops a 100% claim — nothing is 100% cannabinoid", async () => {
    respondWith(() => ({
      data: [row({ category: "concentrate", thc: 100, cbd: 100 })],
    }))
    const { listings } = await getDeals()
    expect(listings[0].thc_percent).toBeNull()
    expect(listings[0].cbd_percent).toBeNull()
  })

  it("drops a 0, which means 'not assayed' rather than 'contains none'", async () => {
    respondWith(() => ({ data: [row({ category: "vape", thc: 0 })] }))
    expect((await getDeals()).listings[0].thc_percent).toBeNull()
  })

  it("drops potency on mg-dosed categories, however plausible it looks", async () => {
    // A 10mg gummy reporting "10.0" is the mg dose in the percent column, not
    // a 10% edible — the whole reason the raw value can't be shown or ranked.
    respondWith(() => ({
      data: [
        row({ id: "e1", category: "edible", thc: 10 }),
        row({ id: "t1", category: "topical", thc: 89.9, cbd: 31 }),
        row({ id: "a1", category: "accessory", thc: 5 }),
      ],
    }))
    const { listings } = await getDeals()
    expect(listings.map((l) => l.thc_percent)).toEqual([null, null, null])
    expect(listings[1].cbd_percent).toBeNull()
  })

  it("matches the category case-insensitively", async () => {
    respondWith(() => ({ data: [row({ category: "Flower", thc: 25.4 })] }))
    expect((await getDeals()).listings[0].thc_percent).toBe(25.4)
  })

  it("coerces a numeric that arrives as a string", async () => {
    respondWith(() => ({
      data: [row({ category: "flower", thc: "18.2" as unknown as number })],
    }))
    expect((await getDeals()).listings[0].thc_percent).toBe(18.2)
  })

  it("sanitizes the single-listing read too", async () => {
    respondWith(() => ({ data: row({ category: "edible", thc: 100 }) }))
    const listing = await getListingById("11111111-2222-3333-4444-555555555555")
    expect(listing?.thc_percent).toBeNull()
  })

  it("returns null for a listing that isn't there", async () => {
    respondWith(() => ({ data: null }))
    expect(
      await getListingById("11111111-2222-3333-4444-555555555555")
    ).toBeNull()
  })
})

describe("searchListings sort", () => {
  it("ranks THC only over rows whose potency survives sanitation", async () => {
    const seen = respondWith(() => ({ data: [], count: 0 }))
    await searchListings(query({ sort: "thc-desc" }), 1)

    const q = seen[0]
    expect(argsOf(q, "in")).toContainEqual([
      "product.category",
      ["flower", "pre-roll", "vape", "concentrate"],
    ])
    expect(argsOf(q, "gt")).toContainEqual(["thc_percent", 0])
    expect(argsOf(q, "lt")).toContainEqual(["thc_percent", 100])
    expect(argsOf(q, "order")).toContainEqual([
      "thc_percent",
      { ascending: false, nullsFirst: false },
    ])
  })

  it("still ranks when the pinned category has a real assay", async () => {
    const seen = respondWith(() => ({ data: [], count: 0 }))
    await searchListings(query({ sort: "thc-desc", category: "Pre-Roll" }), 1)
    expect(argsOf(seen[0], "lt")).toContainEqual(["thc_percent", 100])
  })

  it("keeps the rows instead of answering 'no results' for a mg-dosed category", async () => {
    const seen = respondWith(() => ({ data: [row({ category: "edible" })], count: 1 }))
    const page = await searchListings(
      query({ sort: "thc-desc", category: "edible" }),
      1
    )

    const q = seen[0]
    expect(argsOf(q, "in")).toHaveLength(0)
    expect(
      argsOf(q, "order").some(([col]) => col === "thc_percent")
    ).toBe(false)
    expect(argsOf(q, "order")).toContainEqual([
      "product(brand_name)",
      { ascending: true },
    ])
    expect(page.total).toBe(1)
  })

  it("falls back to the default order when a search has no rankable row at all", async () => {
    // "gummy" matches 47 real listings and not one of them carries an assay,
    // so the potency rank keeps none — and "No products found" over 47 real
    // matches reads as "we don't carry that". The pinned-category form of this
    // is caught up front; a q/brand/dispensary filter can only be found by
    // running the query and seeing it come back empty.
    const seen = respondWith((ctx) =>
      argsOf(ctx, "in").some(([col]) => col === "product.category")
        ? { data: [], count: 0 }
        : { data: [row({ category: "edible", thc: 100 })], count: 47 }
    )
    const page = await searchListings(query({ sort: "thc-desc", q: "gummy" }), 1)

    expect(page.total).toBe(47)
    expect(page.listings).toHaveLength(1)
    expect(seen).toHaveLength(2)
    // the retry drops the potency restriction entirely
    expect(argsOf(seen[1], "in")).toHaveLength(0)
    expect(
      argsOf(seen[1], "gt").some(([col]) => col === "thc_percent")
    ).toBe(false)
    expect(argsOf(seen[1], "lt")).toHaveLength(0)
    expect(argsOf(seen[1], "order")).toContainEqual([
      "product(brand_name)",
      { ascending: true },
    ])
  })

  it("keeps the potency ranking when it costs no rows", async () => {
    // Same count either way, so the ranking narrows nothing and is kept. The
    // unranked twin still runs — that comparison is how we know it was free.
    const seen = respondWith(() => ({ data: [row()], count: 2373 }))
    const page = await searchListings(query({ sort: "thc-desc" }), 1)
    expect(page.total).toBe(2373)
    expect(page.listings).toHaveLength(1)
    expect(seen).toHaveLength(2)
    expect(
      argsOf(seen[0], "in").some(([col]) => col === "product.category")
    ).toBe(true)
  })

  // The regression this guard exists for: the rank narrows the SAME query that
  // carries count:"exact", so left alone a sort silently retires 46% of the
  // catalog AND reports the smaller number as the site's inventory.
  it("abandons the ranking rather than shrink the reported total", async () => {
    const seen = respondWith((ctx) =>
      argsOf(ctx, "in").some(([col]) => col === "product.category")
        ? { data: [row()], count: 2373 } // ranked: 46% of the catalog gone
        : { data: [row(), row()], count: 4367 } // the truth
    )
    const page = await searchListings(query({ sort: "thc-desc" }), 1)

    expect(page.total).toBe(4367)
    expect(seen).toHaveLength(2)
    // The returned page is the unranked one — no potency restriction on it.
    expect(argsOf(seen[1], "in")).toHaveLength(0)
    expect(argsOf(seen[1], "lt")).toHaveLength(0)
  })

  it("doesn't retry a non-potency sort that legitimately matched nothing", async () => {
    const seen = respondWith(() => ({ data: [], count: 0 }))
    await searchListings(query({ sort: "price-asc", q: "nothing" }), 1)
    expect(seen).toHaveLength(1)
  })

  it.each([
    ["price-asc", ["price", { ascending: true, nullsFirst: false }]],
    ["price-desc", ["price", { ascending: false, nullsFirst: false }]],
    ["name-asc", ["product(name)", { ascending: true }]],
    ["brand-asc", ["product(brand_name)", { ascending: true }]],
    ["discount-desc", ["product(brand_name)", { ascending: true }]],
  ] as const)("orders %s in Postgres", async (sort, expected) => {
    const seen = respondWith(() => ({ data: [], count: 0 }))
    await searchListings(query({ sort: sort as SearchQuery["sort"] }), 1)
    expect(argsOf(seen[0], "order")).toContainEqual(expected)
  })

  it("never orders by the scrape batch timestamp", async () => {
    const seen = respondWith(() => ({ data: [], count: 0 }))
    await searchListings(query({ sort: "newest" }), 1)
    for (const q of seen) {
      expect(argsOf(q, "order").some(([col]) => col === "last_seen_at")).toBe(
        false
      )
    }
  })
})

describe("searchListings paging", () => {
  it("treats a range past the end as an empty page, not an error", async () => {
    respondWith(() => ({
      data: null,
      count: 12,
      error: { code: "PGRST103", message: "range not satisfiable" },
    }))
    const page = await searchListings(query(), 9)
    expect(page).toEqual({ listings: [], total: 12, pageSize: SEARCH_PAGE_SIZE })
  })

  it("throws any other error so it never gets cached", async () => {
    respondWith(() => ({ error: { code: "42P01", message: "boom" } }))
    await expect(searchListings(query(), 1)).rejects.toThrow(
      "searchListings: boom"
    )
  })

  it("sanitizes the rows it returns", async () => {
    respondWith(() => ({
      data: [row({ category: "edible", thc: 100 })],
      count: 1,
    }))
    const page = await searchListings(query(), 1)
    expect(page.listings[0].thc_percent).toBeNull()
  })
})

describe("searchListings 'newest'", () => {
  // Two dispensaries carry the same product; ids are deliberately out of
  // alphabetical order so a UUID-order regression can't pass.
  const scan = [
    { id: "c", product_id: "p1", dispensary_id: "d1" },
    { id: "a", product_id: "p2", dispensary_id: "d1" },
    { id: "b", product_id: "p3", dispensary_id: "d1" },
    { id: "d", product_id: "p9", dispensary_id: "d1" }, // no drop record
  ]
  const drops = [
    { product_id: "p1", dispensary_id: "d1", dropped_at: "2026-08-01T00:00:00+00:00" },
    { product_id: "p2", dispensary_id: "d1", dropped_at: "2026-08-05T00:00:00+00:00" },
    { product_id: "p3", dispensary_id: "d1", dropped_at: "2026-07-01T00:00:00+00:00" },
  ]

  function newestResponder(extraDrops: typeof drops = []): Responder {
    return (ctx) => {
      if (ctx.table === "product_drops") return { data: [...drops, ...extraDrops] }
      if (!isFullListing(ctx)) return { data: scan }
      // page fetch: PostgREST returns an `in` filter unordered, so hand the
      // rows back scrambled and let the ranking put them right.
      const ids = (argsOf(ctx, "in")[0]?.[1] ?? []) as string[]
      return { data: [...ids].reverse().map((id) => row({ id })) }
    }
  }

  it("orders by real drop date, with undated rows last", async () => {
    respondWith(newestResponder())
    const page = await searchListings(query({ sort: "newest" }), 1)
    expect(page.listings.map((l) => l.id)).toEqual(["a", "c", "b", "d"])
    expect(page.total).toBe(4)
  })

  it("prefers the most recent drop when a pair dropped twice", async () => {
    // p3 was purged and re-listed today — that is the arrival a shopper means.
    respondWith(
      newestResponder([
        {
          product_id: "p3",
          dispensary_id: "d1",
          dropped_at: "2026-08-06T00:00:00+00:00",
        },
      ])
    )
    const page = await searchListings(query({ sort: "newest" }), 1)
    expect(page.listings.map((l) => l.id)).toEqual(["b", "a", "c", "d"])
  })

  it("applies the search filters to the ranking scan", async () => {
    const seen = respondWith(newestResponder())
    await searchListings(
      query({ sort: "newest", category: "flower", dispensary: "shop" }),
      1
    )
    const idScan = seen.find((c) => c.table === "current_inventory" && !isFullListing(c))!
    expect(argsOf(idScan, "ilike")).toContainEqual(["product.category", "flower"])
    expect(argsOf(idScan, "eq")).toContainEqual(["dispensary.slug", "shop"])
  })

  it("reports the whole filtered total and returns an empty page past the end", async () => {
    const seen = respondWith(newestResponder())
    const page = await searchListings(query({ sort: "newest" }), 2)
    expect(page).toEqual({ listings: [], total: 4, pageSize: SEARCH_PAGE_SIZE })
    // no point fetching full rows for a page with no ids in it
    expect(seen.some(isFullListing)).toBe(false)
  })

  it("drops an id whose listing went stale between the scan and the fetch", async () => {
    respondWith((ctx) => {
      if (ctx.table === "product_drops") return { data: drops }
      if (!isFullListing(ctx)) return { data: scan }
      return { data: [row({ id: "a" })] }
    })
    const page = await searchListings(query({ sort: "newest" }), 1)
    expect(page.listings.map((l) => l.id)).toEqual(["a"])
    // the total still counts every match — one missing row isn't a smaller set
    expect(page.total).toBe(4)
  })

  it("sanitizes the page it returns", async () => {
    respondWith((ctx) => {
      if (ctx.table === "product_drops") return { data: drops }
      if (!isFullListing(ctx)) return { data: [scan[0]] }
      return { data: [row({ id: "c", category: "edible", thc: 100 })] }
    })
    const page = await searchListings(query({ sort: "newest" }), 1)
    expect(page.listings[0].thc_percent).toBeNull()
  })

  it("throws if the drop index can't be read", async () => {
    respondWith((ctx) =>
      ctx.table === "product_drops"
        ? { error: { message: "drops down" } }
        : { data: scan }
    )
    await expect(searchListings(query({ sort: "newest" }), 1)).rejects.toThrow(
      "getDropIndex: drops down"
    )
  })

  it("throws if the ranking scan can't be read", async () => {
    respondWith((ctx) =>
      ctx.table === "product_drops"
        ? { data: drops }
        : { error: { message: "scan down" } }
    )
    await expect(searchListings(query({ sort: "newest" }), 1)).rejects.toThrow(
      "getNewestSearchIds: scan down"
    )
  })
})
