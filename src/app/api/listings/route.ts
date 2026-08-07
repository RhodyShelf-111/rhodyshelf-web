import type { InventoryListing } from "@/lib/types"
import { NextResponse, type NextRequest } from "next/server"
import {
  getBrandBySlug,
  getDeals,
  getDrops,
  getInventoryByBrand,
  getInventoryByCategory,
  getInventoryByDispensary,
  HOMEPAGE_CATEGORIES,
} from "@/lib/queries/products"
import { getDispensaryBySlug } from "@/lib/queries/dispensaries"

const VALID_CATEGORIES = new Set<string>(HOMEPAGE_CATEGORIES.map((c) => c.key))

/** The full set is a cached snapshot, so it can sit on the CDN: a short
 *  s-maxage keeps a menu sync visible quickly, the long SWR window means a cold
 *  edge never blocks a shopper on the DB. */
function fullSet(listings: InventoryListing[]) {
  return NextResponse.json(
    { listings },
    {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=600, stale-while-revalidate=1800",
      },
    }
  )
}

/** Every rejection is no-store: the rejection itself must never be cached. */
function reject(status: number) {
  return NextResponse.json(
    { listings: [] },
    { status, headers: { "Cache-Control": "no-store" } }
  )
}

/**
 * Full listing set for one scope, from a single cached source. The list pages
 * server-render only the first slice for fast paint, then the grid fetches the
 * whole set here in ONE request so client-side filtering has a complete,
 * self-consistent snapshot — no offset-pagination gaps across cache
 * generations.
 *
 * Scopes come in two shapes:
 *  - keyed (category, dispensary, brand): the caller supplies a value, so each
 *    one is bounded by an allowlist or a slug lookup before it can reach a
 *    cached query. An arbitrary-`value` flood must not be able to pump the CDN
 *    and the data cache full of empty results (the same guard the codebase
 *    applies to getListingById). Dispensary and brand resolve slug -> row, so
 *    the slug column IS the allowlist.
 *  - whole-site (drops, deals): one cached set each, no caller-supplied key, so
 *    there is nothing to allowlist and nothing to flood.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const scope = sp.get("scope")
  const value = (sp.get("value") ?? "").trim()

  try {
    if (scope === "drops") return fullSet(await getDrops())
    if (scope === "deals") return fullSet((await getDeals()).listings)

    // Everything below is keyed on a caller-supplied value.
    if (!value) return reject(400)

    if (scope === "category") {
      if (!VALID_CATEGORIES.has(value)) return reject(400)
      return fullSet(await getInventoryByCategory(value))
    }

    if (scope === "dispensary") {
      const dispensary = await getDispensaryBySlug(value)
      if (!dispensary) return reject(404)
      return fullSet(await getInventoryByDispensary(dispensary.id))
    }

    if (scope === "brand") {
      // Keyed on the brand SLUG, not the canonical name: the slug is what the
      // page URL already carries, and the lookup 404s an unknown one before the
      // cached inventory query runs.
      const brand = await getBrandBySlug(value)
      if (!brand) return reject(404)
      return fullSet(await getInventoryByBrand(brand.canonical_name))
    }

    return reject(400)
  } catch (e) {
    console.error(e)
    // Degrade this one response only — never CDN-cache the error path.
    return reject(503)
  }
}
