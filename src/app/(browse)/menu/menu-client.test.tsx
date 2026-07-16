import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MenuClient } from "./menu-client"

// ProductGrid drags in the full filter/sheet stack; the heading contract is
// MenuClient's own, so stub the grid.
vi.mock("@/components/product/product-grid", () => ({
  ProductGrid: () => <div data-testid="grid" />,
}))

describe("MenuClient headingLabel", () => {
  it("renders an sr-only h2 — 'Products' by default, the page label when given", () => {
    const { unmount } = render(<MenuClient listings={[]} />)
    const fallback = screen.getByRole("heading", { level: 2 })
    expect(fallback).toHaveTextContent("Products")
    expect(fallback).toHaveClass("sr-only")
    unmount()

    render(<MenuClient listings={[]} headingLabel="Pre-Rolls" />)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Pre-Rolls"
    )
  })
})
