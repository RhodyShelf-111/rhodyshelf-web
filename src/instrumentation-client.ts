/**
 * Client-side instrumentation. Runs after the HTML loads and before React
 * hydrates, so the first pageview is recorded even if hydration is slow or
 * fails outright.
 *
 * This file, rather than a provider component in the root layout, is deliberate.
 * Every published PostHog App Router snippet tracks pageviews from a client
 * component calling `useSearchParams()`. Per Next's own docs
 * (`use-search-params.md`: "During production builds, a static page that calls
 * useSearchParams from a Client Component must be wrapped in a Suspense
 * boundary, otherwise the build fails"), and given every browse route here is
 * static or ISR, that pattern would turn a red build into the way we discover
 * the problem. `instrumentation-client` needs no client component and no
 * Suspense boundary.
 *
 * Next warns if this file takes longer than 16ms, so the work here is: read an
 * env var, register one listener, and kick off a dynamic import.
 */

import { initAnalytics, track, trackPageview, ANALYTICS_EVENTS } from "@/lib/analytics"

try {
  initAnalytics()

  // The initial load is not a router transition, so it needs its own pageview.
  if (typeof window !== "undefined") {
    trackPageview(window.location.pathname + window.location.search)
    registerBuyClickListener()
  }
} catch {
  // Instrumentation must never break the app. Next's docs call for exactly
  // this guard.
}

/**
 * One delegated listener for every outbound "Buy" link on the site, matched by
 * `data-track="buy"`.
 *
 * Delegation rather than an onClick per link because these anchors live in both
 * client components (product card, quick-look sheet) and server components
 * (product page, dispensary page) — a server component cannot carry a handler,
 * but it can render a data attribute.
 *
 * Capture phase is load-bearing: the product card's Buy anchor calls
 * `stopPropagation()` so the click does not also trigger the card's link, which
 * would prevent a bubble-phase listener on `document` from ever seeing it.
 */
function registerBuyClickListener(): void {
  document.addEventListener(
    "click",
    (event) => {
      try {
        const target = event.target
        if (!(target instanceof Element)) return
        const link = target.closest('[data-track="buy"]')
        if (!link) return
        track(ANALYTICS_EVENTS.BUY_CLICK, {
          dispensary: link.getAttribute("data-dispensary") ?? undefined,
          category: link.getAttribute("data-category") ?? undefined,
          surface: link.getAttribute("data-surface") ?? undefined,
        })
      } catch {
        // a failed measurement must never block the click itself
      }
    },
    { capture: true }
  )
}

/**
 * Fires at the start of every client-side navigation. `url` is the destination;
 * the browser's own location still points at the previous page here, which is
 * why the pageview passes the URL explicitly.
 */
export function onRouterTransitionStart(url: string): void {
  try {
    trackPageview(url)
  } catch {
    // never block a navigation
  }
}
