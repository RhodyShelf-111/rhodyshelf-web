import { NextResponse, type NextRequest } from "next/server"
import {
  getInventoryByCategory,
  getInventoryByDispensary,
  HOMEPAGE_CATEGORIES,
} from "@/lib/queries/products"
import { getDispensaryBySlug } from "@/lib/queries/dispensaries"

const VALID_CATEGORIES = new Set<string>(HOMEPAGE_CATEGORIES.map((c) => c.key))

/**
 * Full listing set for one category or dispensary, from a single cached source
 * (getInventoryBy*). The category/dispensary pages server-render only the first
 * slice for fast paint, then the grid fetches the whole set here in ONE request
 * so client-side filtering has a complete, self-consistent snapshot — no
 * offset-pagination gaps across cache generations.
 *
 * Dispensary is resolved slug -> id (getDispensaryBySlug handles rows with a
 * null DB slug), then queried by id, so no active dispensary can end up empty.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const scope = sp.get("scope")
  const value = (sp.get("value") ?? "").trim()

  if (!value) {
    return NextResponse.json(
      { listings: [] },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }

  try {
    if (scope === "category") {
      // Allowlist the category so an arbitrary-`value` flood can't pump the
      // CDN and the getInventoryByCategory data cache full of empty results
      // (same guard the codebase applies to getListingById). no-store so the
      // rejection itself is never cached.
      if (!VALID_CATEGORIES.has(value)) {
        return NextResponse.json(
          { listings: [] },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        )
      }
      const listings = await getInventoryByCategory(value)
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

    if (scope === "dispensary") {
      const dispensary = await getDispensaryBySlug(value)
      if (!dispensary) {
        return NextResponse.json(
          { listings: [] },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        )
      }
      const listings = await getInventoryByDispensary(dispensary.id)
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

    return NextResponse.json(
      { listings: [] },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  } catch (e) {
    console.error(e)
    // Degrade this one response only — never CDN-cache the error path.
    return NextResponse.json(
      { listings: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
