import { ProductDrawer } from "@/components/product/product-drawer"

// Intercepts client-side navigations to /product/[id] from anywhere in
// (browse) and renders the product as a quick-look drawer over the current
// page, instead of navigating away. `(.)` matches the same route-segment level
// because @modal is a slot, not a segment. A hard load / refresh / shared link
// is NOT intercepted and falls through to the full page at
// src/app/(browse)/product/[id]/page.tsx.
//
// This server component deliberately does NOT fetch the listing: the drawer is
// a client component that renders instantly from the listing already in memory
// (see product-drawer / listing-cache), and only fetches on a cache miss. That
// keeps the click-to-open path free of a blocking server round-trip.
export default async function ProductModal({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // key={id} so navigating between two product modals mounts a fresh drawer
  // (and re-reads the in-memory cache) instead of reusing stale state.
  return <ProductDrawer key={id} id={id} />
}
