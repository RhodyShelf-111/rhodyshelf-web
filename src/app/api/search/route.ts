import { NextResponse, type NextRequest } from "next/server"
import { searchListings } from "@/lib/queries/products"
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
  const page = Math.min(200, Math.max(1, Number(sp.get("page")) || 1))

  const result = await searchListings(query, page)
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=1800",
    },
  })
}
