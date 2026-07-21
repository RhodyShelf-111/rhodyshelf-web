import type { Metadata } from "next"
import { NotFoundContent } from "@/components/layout/not-found-content"

// Titles the 404 tab "Page not found" instead of inheriting the generic
// homepage title. This boundary's metadata wins over the throwing page's own
// generateMetadata, so every in-group 404 — unmatched URLs AND notFound() from
// product/brand/category/dispensary — now shows the same "Page not found"
// (verified in a production build), rather than e.g. /product/[id]'s
// "Product Not Found".
export const metadata: Metadata = {
  title: "Page not found",
}

// The (browse) group's 404 boundary. Both an in-group `notFound()` (e.g.
// /product/[badId]) and an unmatched URL under this group resolve here — and
// because the `@modal/[...catchAll]` slot keeps the (browse) layout matched for
// arbitrary paths, that layout already renders the SiteHeader/SiteFooter (and
// age gate) around this. So render ONLY the body: adding our own header/footer
// here is what produced the doubled chrome. The single surrounding chrome comes
// from `(browse)/layout.tsx`, whose <main> wraps this content.
export default function BrowseNotFound() {
  return <NotFoundContent />
}
