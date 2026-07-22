import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MenuClient } from "./menu-client"
import type { ProductFilters } from "@/lib/types"

// ProductGrid drags in the full filter/sheet stack; the heading + URL-sync
// contracts are MenuClient's own, so stub the grid and capture its props.
interface CapturedGridProps {
  initialFilters: ProductFilters
  onFiltersChange?: (filters: ProductFilters) => void
  loadRest?: { total: number; scope: "category" | "dispensary"; value: string }
}
let gridProps: CapturedGridProps | undefined
vi.mock("@/components/product/product-grid", () => ({
  ProductGrid: (props: CapturedGridProps) => {
    gridProps = props
    return <div data-testid="grid" />
  },
}))

afterEach(() => {
  gridProps = undefined
  window.history.replaceState(null, "", "/")
})

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

describe("MenuClient URL filter sync", () => {
  it("hydrates the grid from the full filter param set (deep links + carried filters)", async () => {
    window.history.replaceState(
      null,
      "",
      "/category/flower?brand=Sweetspot&strainType=indica&minPrice=10&sale=true&sort=price-asc"
    )
    render(<MenuClient listings={[]} />)

    await waitFor(() =>
      expect(gridProps?.initialFilters).toEqual({
        brand: "Sweetspot",
        strainType: "indica",
        minPrice: 10,
        onSale: true,
        sort: "price-asc",
      })
    )
  })

  it("keeps the page default sort unless the URL overrides it", async () => {
    window.history.replaceState(null, "", "/deals?brand=Hi5")
    render(<MenuClient listings={[]} defaultSort="discount-desc" />)

    await waitFor(() =>
      expect(gridProps?.initialFilters).toEqual({
        brand: "Hi5",
        sort: "discount-desc",
      })
    )
  })

  it("writes filter changes into the URL, preserving foreign params", async () => {
    window.history.replaceState(null, "", "/category/flower?utm_source=ig")
    render(<MenuClient listings={[]} />)

    gridProps!.onFiltersChange!({ brand: "Hi5", onSale: true })

    const params = new URLSearchParams(window.location.search)
    expect(params.get("brand")).toBe("Hi5")
    expect(params.get("sale")).toBe("true")
    expect(params.get("utm_source")).toBe("ig")
    expect(window.location.pathname).toBe("/category/flower")

    // Clearing filters clears the URL back down to the foreign params.
    gridProps!.onFiltersChange!({})
    expect(window.location.search).toBe("?utm_source=ig")
  })

  it("does not serialize the page-default sort into the URL", async () => {
    window.history.replaceState(null, "", "/deals")
    render(<MenuClient listings={[]} defaultSort="discount-desc" />)

    gridProps!.onFiltersChange!({ sort: "discount-desc", brand: "Hi5" })
    expect(window.location.search).toBe("?brand=Hi5")
  })
})

describe("MenuClient progressive loading", () => {
  it("forwards loadRest to the grid so it can fetch the rest of the set", () => {
    render(
      <MenuClient
        listings={[]}
        loadRest={{ total: 500, scope: "category", value: "flower" }}
      />
    )
    expect(gridProps?.loadRest).toEqual({
      total: 500,
      scope: "category",
      value: "flower",
    })
  })

  it("leaves loadRest undefined when the host doesn't opt in", () => {
    render(<MenuClient listings={[]} />)
    expect(gridProps?.loadRest).toBeUndefined()
  })
})
