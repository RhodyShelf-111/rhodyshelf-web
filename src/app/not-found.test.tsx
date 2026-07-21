import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// The real SiteHeader is a client component (router + localStorage hooks) and
// SiteFooter is an async server component that queries Supabase — neither
// renders in jsdom. Stub each with the single landmark it contributes so we can
// assert the root 404 is self-chromed exactly once (never doubled).
vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}))
vi.mock("@/components/layout/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}))

import NotFound from "./not-found"

describe("root not-found", () => {
  it("is self-chromed with exactly one header, footer, and main", () => {
    const { container } = render(<NotFound />)

    // The root boundary is the truly-unwrapped case (outside the (browse) group,
    // so it inherits no chrome). It must render its own header/footer — but
    // exactly once, never the doubled pair the (browse) 404 used to produce.
    expect(container.querySelectorAll("header")).toHaveLength(1)
    expect(container.querySelectorAll("footer")).toHaveLength(1)
    expect(container.querySelectorAll("main")).toHaveLength(1)

    expect(
      screen.getByRole("heading", { level: 1, name: /page not found/i })
    ).toBeInTheDocument()
  })
})
