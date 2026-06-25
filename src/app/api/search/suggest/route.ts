import { NextResponse, type NextRequest } from "next/server"
import { getSuggestPool } from "@/lib/queries/products"
import type { Suggestion, SuggestionType } from "@/lib/types"

// Per-group caps; prefix matches always beat mid-string ones.
const LIMITS: Record<SuggestionType, number> = {
  product: 4,
  brand: 3,
  strain: 2,
}
const TOTAL = 8

/** Rank a pool against the (already lowercased) query: prefix matches first,
 *  then mid-string matches, both alphabetical (the pool is pre-sorted). */
function rank(pool: string[], q: string, limit: number): string[] {
  const starts: string[] = []
  const contains: string[] = []
  for (const value of pool) {
    const idx = value.toLowerCase().indexOf(q)
    if (idx === 0) starts.push(value)
    else if (idx > 0) contains.push(value)
  }
  return [...starts, ...contains].slice(0, limit)
}

/**
 * Typeahead for the search box. Matches the query against the cached suggestion
 * pool (product names, brands, strains) and returns a small, de-duplicated set.
 * Brand-only autocomplete used to live in the client; this adds products +
 * strains the placeholder has always promised, without shipping the catalog.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase()

  if (q.length < 1) {
    return NextResponse.json(
      { suggestions: [] },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  try {
    const pool = await getSuggestPool()

    const groups: [SuggestionType, string[]][] = [
      ["product", rank(pool.products, q, LIMITS.product)],
      ["brand", rank(pool.brands, q, LIMITS.brand)],
      ["strain", rank(pool.strains, q, LIMITS.strain)],
    ]

    const seen = new Set<string>()
    const suggestions: Suggestion[] = []
    for (const [type, values] of groups) {
      for (const value of values) {
        const key = value.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        suggestions.push({ type, value })
      }
    }

    return NextResponse.json(
      { suggestions: suggestions.slice(0, TOTAL) },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (e) {
    console.error(e)
    // degrade to no suggestions; never CDN-cache the error path
    return NextResponse.json(
      { suggestions: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
