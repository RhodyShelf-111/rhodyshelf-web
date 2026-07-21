import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryNavLink } from "./category-nav-link"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

beforeAll(() => {
  // Swallow the default anchor navigation after component handlers ran, so
  // jsdom doesn't log "Not implemented: navigation" for fall-through clicks.
  window.addEventListener("click", (e) => e.preventDefault())
})

beforeEach(() => push.mockClear())
afterEach(() => window.history.replaceState(null, "", "/"))

describe("CategoryNavLink", () => {
  it("keeps the clean canonical href for crawlers and new-tab clicks", () => {
    render(<CategoryNavLink href="/category/vape">Vapes</CategoryNavLink>)
    expect(screen.getByRole("link", { name: "Vapes" })).toHaveAttribute(
      "href",
      "/category/vape"
    )
  })

  it("carries the active filters across a plain left-click", () => {
    window.history.replaceState(
      null,
      "",
      "/category/flower?brand=Sweetspot&sale=true"
    )
    render(<CategoryNavLink href="/category/concentrate">Concentrates</CategoryNavLink>)

    fireEvent.click(screen.getByRole("link", { name: "Concentrates" }))

    expect(push).toHaveBeenCalledWith(
      "/category/concentrate?brand=Sweetspot&sale=true"
    )
  })

  it("leaves modifier clicks to the browser (new tab keeps the clean URL)", () => {
    window.history.replaceState(null, "", "/category/flower?brand=Sweetspot")
    render(<CategoryNavLink href="/category/vape">Vapes</CategoryNavLink>)

    fireEvent.click(screen.getByRole("link", { name: "Vapes" }), {
      metaKey: true,
    })

    expect(push).not.toHaveBeenCalled()
  })

  it("falls through to the plain link when there is nothing to carry", () => {
    window.history.replaceState(null, "", "/category/flower")
    render(<CategoryNavLink href="/category/vape">Vapes</CategoryNavLink>)

    fireEvent.click(screen.getByRole("link", { name: "Vapes" }))

    expect(push).not.toHaveBeenCalled()
  })
})
