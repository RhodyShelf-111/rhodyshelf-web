import { NextResponse, type NextRequest } from "next/server"
import { getUpvotedListings, SAVED_MAX } from "@/lib/queries/products"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolve the visitor's saved product ids (stored client-side) to current
 * listings. Read-only and per-visitor, so it is never CDN-cached.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ids") ?? ""
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, SAVED_MAX)

  if (ids.length === 0) {
    return NextResponse.json(
      { listings: [] },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  try {
    const listings = await getUpvotedListings(ids)
    return NextResponse.json(
      { listings },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (e) {
    console.error("[api/saved]", e)
    return NextResponse.json(
      { listings: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
