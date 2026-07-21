import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import BrowseNotFound, { metadata } from "./not-found"

// For the composed test below, the (browse) layout drags in a client SiteHeader
// and an async Supabase-querying SiteFooter — neither renders in jsdom. Stub each
// with the single landmark it contributes so we can render the REAL layout +
// not-found together and count the chrome. (AgeGate lives in the ROOT layout, not
// this one, so it isn't involved here.) These mocks don't touch the isolation
// test: BrowseNotFound imports neither.
vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}))
vi.mock("@/components/layout/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}))

import BrowseLayout from "./layout"

describe("(browse) not-found", () => {
  it("titles in-group 404s 'Page not found' (overrides the throwing page's own title)", () => {
    expect(metadata.title).toBe("Page not found")
  })

  it("renders the 404 body with no chrome of its own — the browse layout supplies the single header/footer", () => {
    const { container } = render(<BrowseNotFound />)

    // Regression guard for the doubled-chrome bug: this boundary renders INSIDE
    // the (browse) layout, which already renders exactly one SiteHeader +
    // SiteFooter + <main>. Re-adding any of that chrome here is precisely what
    // stacked two headers / two footers / two mains on every in-group 404
    // (unmatched URLs and product notFound()).
    expect(container.querySelectorAll("header")).toHaveLength(0)
    expect(container.querySelectorAll("footer")).toHaveLength(0)
    expect(container.querySelectorAll("main")).toHaveLength(0)

    // ...but it still shows the actual 404 message and the escape hatches.
    expect(
      screen.getByRole("heading", { level: 1, name: /page not found/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /browse all products/i })
    ).toHaveAttribute("href", "/search")
    expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute(
      "href",
      "/"
    )
  })

  it("composes with the (browse) layout to exactly one header, footer, and main", () => {
    // The real fix: the (browse) 404 must inherit the layout's single chrome.
    // Render the actual layout wrapping the actual not-found and assert the
    // composed tree has exactly one of each — catching a regression introduced
    // from EITHER side (chrome re-added to the boundary, OR a second header/
    // footer added to the layout), which the isolation test alone can't.
    const { container } = render(
      <BrowseLayout modal={null}>
        <BrowseNotFound />
      </BrowseLayout>
    )

    expect(container.querySelectorAll("header")).toHaveLength(1)
    expect(container.querySelectorAll("footer")).toHaveLength(1)
    expect(container.querySelectorAll("main")).toHaveLength(1)
    // The skip link is the (browse) layout's signature — exactly one confirms
    // the layout isn't itself doubled.
    expect(container.querySelectorAll('a[href="#main"]')).toHaveLength(1)
    // The 404 body renders inside that single chrome.
    expect(
      screen.getByRole("heading", { level: 1, name: /page not found/i })
    ).toBeInTheDocument()
  })
})
