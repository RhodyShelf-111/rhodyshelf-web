import type { Metadata } from "next"

const SITE_NAME = "RhodyShelf"

/**
 * Per-page openGraph blocks REPLACE the root layout's wholesale (Next merges
 * metadata shallowly, nested objects are not deep-merged), which silently
 * drops og:site_name and og:locale — the source label chat apps show on link
 * unfurls. Build every page-level block through this helper so those fields
 * survive, and page metadata stays one consistent shape.
 */
export function pageOpenGraph(opts: {
  title: string
  description: string
  url: string
  images?: string[]
}): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: opts.title,
    description: opts.description,
    url: opts.url,
    ...(opts.images ? { images: opts.images } : {}),
  }
}
