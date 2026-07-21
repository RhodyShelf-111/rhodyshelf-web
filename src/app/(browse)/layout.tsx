import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

// No request APIs here (no cookies/headers) so every browse route stays
// static/ISR-cacheable. The age gate is mounted once in the root layout (so
// unmatched-URL 404s and the root not-found are gated too, not just browse
// routes) and reads its cookie client-side.
//
// `modal` is a parallel-route slot (@modal). It renders the product quick-look
// drawer when a card is clicked via client-side navigation, overlaying the
// current page so the brand/menu grid behind it stays mounted (scroll, filters,
// and "Load more" count preserved). A hard load / refresh / shared link skips
// the interception and renders the full /product/[id] page instead.
export default function BrowseLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {modal}
      <SiteFooter />
    </>
  )
}
