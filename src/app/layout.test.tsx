import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

// next/font/google needs Next's build-time font loader, which isn't present
// under vitest — stub it to a plain object exposing the `.variable` the layout
// reads. globals.css is a side-effect import vitest treats as an empty module.
vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "--font-display" }),
}))

import RootLayout from "./layout"

// Regression: the root not-found (unmatched URLs + every in-group notFound())
// and its SiteFooter — which carries a marketing/social link — render OUTSIDE
// the (browse) route group, so an AgeGate mounted only in (browse)/layout.tsx
// left every 404 serving the footer with zero age affirmation. The gate must
// live in the root layout so it wraps every route.
describe("RootLayout", () => {
  // renderToStaticMarkup (not testing-library render): the layout returns a
  // full <html> document, and SSR string output sidesteps jsdom's <html>-in-a
  // -div nesting. It also captures exactly what a visitor receives before
  // hydration — the age gate must already be in that markup.
  //
  // The <footer> below is a stand-in for page content: this asserts the root
  // layout wraps its children with the gate ahead of them. That the root 404
  // actually inherits this layout is a Next.js routing property (no nested
  // not-found override), verified end-to-end against the dev server rather than
  // here.
  it("mounts the age gate at the root so every route — including the 404 footer — is age-affirmed", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <footer>marketing footer</footer>
      </RootLayout>
    )

    // AgeGate's pre-hydration markup: the modal overlay with its 21+ prompt.
    expect(html).toContain('id="age-gate"')
    expect(html).toContain("Are you 21 or older?")
    // And it renders ahead of the page content it gates (here, the footer).
    expect(html.indexOf("age-gate")).toBeLessThan(html.indexOf("marketing footer"))
  })
})
