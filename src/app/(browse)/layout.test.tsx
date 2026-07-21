import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

// BrowseLayout pulls in SiteHeader (a client component that uses router hooks)
// and SiteFooter (an async server component that queries Supabase). Neither is
// relevant here, so stub them to nothing so the layout renders under the sync
// renderToStaticMarkup path.
vi.mock("@/components/layout/site-header", () => ({ SiteHeader: () => null }))
vi.mock("@/components/layout/site-footer", () => ({ SiteFooter: () => null }))

import BrowseLayout from "./layout"

// Regression companion to app/layout.test.tsx: the age gate is mounted exactly
// once, in the ROOT layout. If someone re-adds <AgeGate /> here, every browse
// route would render two overlays sharing id="age-gate" — a duplicate-id a11y
// break and a doubled focus trap. Lock the browse layout to zero gates so the
// root stays the single source.
describe("BrowseLayout", () => {
  it("does not mount its own age gate (the root layout is the single source)", () => {
    const html = renderToStaticMarkup(
      <BrowseLayout modal={null}>
        <div>page content</div>
      </BrowseLayout>
    )

    expect(html).not.toContain('id="age-gate"')
    expect(html).not.toContain("Are you 21 or older?")
    // Sanity: the layout's own chrome still rendered (skip link present).
    expect(html).toContain('href="#main"')
  })
})
