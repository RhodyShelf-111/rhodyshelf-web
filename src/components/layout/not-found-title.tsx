"use client"

import { useEffect } from "react"

// The not-found boundaries export `metadata.title = "Page not found"`, which
// Next applies to the SSR <title> (crawlers + first paint). But on hydration
// Next re-resolves metadata for the URL and, for a truly UNMATCHED URL, falls
// back to the root layout's default title ("RhodyShelf — ..."), so the browser
// tab reverts to reading like a real page. This pins the tab title after
// hydration so every 404 keeps "Page not found". Renders nothing.
export function NotFoundTitle() {
  useEffect(() => {
    document.title = "Page not found"
  }, [])
  return null
}
