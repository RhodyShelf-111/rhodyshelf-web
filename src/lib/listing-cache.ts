import type { InventoryListing } from "@/lib/types"

/**
 * In-memory (client-side) cache of listings the shopper has already loaded in a
 * grid, rail, or search result. Every product link is a `<ProductCard>` that
 * holds the full `InventoryListing`, so by the time someone clicks one the data
 * the quick-look drawer needs is already in the browser. The drawer reads it
 * from here and renders instantly instead of waiting on a server round-trip.
 *
 * Client-only: every accessor is guarded on `window` so importing this from a
 * server component can never turn the module-level Map into cross-request,
 * cross-user shared state on the Node server.
 *
 * Bounded and best-effort: it holds at most MAX_ENTRIES listings (FIFO
 * eviction) and is cleared on hard reload. A miss — a product the client never
 * carried, or one evicted during a long browsing session — is fine; the drawer
 * falls back to /api/product/[id].
 *
 * Freshness note: a cache hit renders whatever the card the shopper clicked was
 * already showing; it is not re-checked against the 24h / active-dispensary
 * window. That is intentional — the drawer mirrors the card, surfaces "Price
 * updated … ago · confirm at dispensary", and links to the canonical,
 * server-fresh full page.
 */
const MAX_ENTRIES = 1000
const listingCache = new Map<string, InventoryListing>()

export function rememberListing(listing: InventoryListing): void {
  if (typeof window === "undefined") return
  // Re-insert so the id moves to the newest position (recency for eviction).
  listingCache.delete(listing.id)
  listingCache.set(listing.id, listing)
  if (listingCache.size > MAX_ENTRIES) {
    // Map preserves insertion order, so the first key is the oldest.
    const oldest = listingCache.keys().next().value
    if (oldest !== undefined) listingCache.delete(oldest)
  }
}

export function getRememberedListing(id: string): InventoryListing | undefined {
  if (typeof window === "undefined") return undefined
  return listingCache.get(id)
}
