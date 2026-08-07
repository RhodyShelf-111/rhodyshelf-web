import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// The 404 body's only data dependency; products.ts transitively imports the
// server-only Supabase client, so the whole module is stubbed for jsdom.
vi.mock("@/lib/queries/products", () => ({
  getBrandNames: vi.fn(),
}))
// HeroSearch is a client component that reaches for the app router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import ProductNotFound from "./not-found"
import { getBrandNames } from "@/lib/queries/products"

const mockedGetBrandNames = vi.mocked(getBrandNames)

describe("product 404", () => {
  beforeEach(() => {
    mockedGetBrandNames.mockReset()
    mockedGetBrandNames.mockResolvedValue(["Lovewell Farms"])
  })

  // A shared product link dead-ends as soon as the SKU clears a menu — routine,
  // not exceptional. The generic 404 told that visitor the page never existed.
  it("says the listing left the menu, not that the page never existed", async () => {
    render(await ProductNotFound())

    expect(
      screen.getByRole("heading", { name: "This listing is off the menu" })
    ).toBeInTheDocument()
    expect(screen.getByText(/stock changes throughout the day/i)).toBeInTheDocument()
    expect(screen.queryByText(/doesn't exist or may have moved/i)).toBeNull()
  })

  it("hands the visitor a search box and somewhere to go next", async () => {
    render(await ProductNotFound())

    expect(screen.getByRole("combobox")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /deals/i })).toHaveAttribute(
      "href",
      "/deals"
    )
    expect(screen.getByRole("link", { name: /drops/i })).toHaveAttribute(
      "href",
      "/drops"
    )
    expect(
      screen.getByRole("link", { name: /browse all products/i })
    ).toHaveAttribute("href", "/search")
  })

  // Secondary content on an error path: a failed brand fetch must not turn the
  // 404 into a 500.
  it("still renders when the brand fetch fails", async () => {
    mockedGetBrandNames.mockRejectedValue(new Error("supabase down"))

    render(await ProductNotFound())

    expect(
      screen.getByRole("heading", { name: "This listing is off the menu" })
    ).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })
})
