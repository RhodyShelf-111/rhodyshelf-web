import { NextResponse, type NextRequest } from "next/server"
import { searchListings, SEARCH_PAGE_SIZE } from "@/lib/queries/products"
import { parseSearchQuery } from "@/lib/search-params"

/**
 * Load-more endpoint for /search. Same query shape and cache as the page,
 * so a given (filters, page) pair is computed once per revalidation window.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const raw: Record<string, string | undefined> = {}
  for (const key of ["q", "category", "brand", "dispensary", "sale", "sort"]) {
    raw[key] = sp.get(key) ?? undefined
  }
  const query = parseSearchQuery(raw)
  const page = Math.min(50, Math.max(1, Number(sp.get("page")) || 1))

  try {
    const result = await searchListings(query, page)
    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=600, stale-while-revalidate=1800",
      },
    })
  } catch (e) {
    console.error(e)
    // degrade this one response only — never CDN-cache the error path
    return NextResponse.json(
      { listings: [], total: 0, pageSize: SEARCH_PAGE_SIZE },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
