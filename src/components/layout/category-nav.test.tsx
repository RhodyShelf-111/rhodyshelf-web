import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// products.ts (source of HOMEPAGE_CATEGORIES) transitively imports the
// server-only Supabase client; neutralize it for jsdom.
vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: vi.fn(),
}))

// CategoryNavLink calls useRouter, which needs an app-router context that
// jsdom renders don't have.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { CategoryNav } from "./category-nav"

describe("CategoryNav", () => {
  it("links every category so switching is one tap from any category page", () => {
    render(<CategoryNav activeSlug="flower" />)

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(7)
    expect(screen.getByRole("link", { name: /Edibles/ })).toHaveAttribute(
      "href",
      "/category/edible"
    )
    expect(screen.getByRole("link", { name: /Pre-Rolls/ })).toHaveAttribute(
      "href",
      "/category/pre-roll"
    )
    // The category you're on is still a link elsewhere in the set, but every
    // OTHER category must be reachable without leaving the page.
    expect(screen.getByRole("link", { name: /Vapes/ })).toHaveAttribute(
      "href",
      "/category/vape"
    )
  })

  it("marks the current category with aria-current for screen readers", () => {
    render(<CategoryNav activeSlug="flower" />)

    expect(screen.getByRole("link", { name: /Flower/ })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("link", { name: /Edibles/ })).not.toHaveAttribute(
      "aria-current"
    )
  })

  it("marks nothing active when no slug is given", () => {
    render(<CategoryNav />)
    expect(
      screen.queryByRole("link", { current: "page" })
    ).toBeNull()
  })
})
