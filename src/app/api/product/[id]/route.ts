import { NextResponse } from "next/server"
import { getListingById } from "@/lib/queries/products"

export const runtime = "nodejs"

/**
 * Fallback data source for the quick-look drawer. The common path — clicking a
 * `<ProductCard>` — renders instantly from the listing already in the browser
 * (see listing-cache) and never reaches this handler. It is only hit on a cache
 * miss (e.g. a product URL opened without passing through a grid).
 * getListingById returns null for a missing OR malformed id, so both collapse
 * to a clean 404; found responses are CDN-cached briefly via s-maxage.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const listing = await getListingById(id)
    if (!listing) {
      return NextResponse.json(
        { listing: null },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      )
    }
    return NextResponse.json(
      { listing },
      {
        headers: {
          // Mirror the sibling public routes (api/search, api/search/suggest):
          // no browser cache, CDN caches briefly, serves stale while revalidating.
          "Cache-Control":
            "public, max-age=0, s-maxage=60, stale-while-revalidate=1800",
        },
      }
    )
  } catch (e) {
    console.error("[api/product/[id]]", e)
    return NextResponse.json(
      { listing: null },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
