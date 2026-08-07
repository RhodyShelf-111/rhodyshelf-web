import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { Dialog } from "@base-ui/react/dialog"
import { ProductQuickLook } from "./product-quick-look"
import type { InventoryListing } from "@/lib/types"

beforeAll(() => {
  // Base UI's dialog machinery expects these browser APIs; jsdom ships neither.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeListing(
  id: string,
  dispensaryName: string,
  price: number,
  patch: Partial<InventoryListing["product"]> = {}
): InventoryListing {
  const slug = dispensaryName.toLowerCase().replace(/\s+/g, "-")
  return {
    id,
    price,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: 24,
    cbd_percent: null,
    image_url: null,
    product_url: null,
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: `p-${id}`,
      name: "Thank You Jerry",
      brand_id: null,
      brand_name: "A-1 Herb Co.",
      category: "flower",
      subcategory: null,
      weight_grams: 3.5,
      weight_display: "3.5g",
      strain_type: "hybrid",
      strain_name: null,
      image_url: null,
      ...patch,
    },
    dispensary: {
      id: `d-${slug}`,
      name: dispensaryName,
      slug,
      city: "Newport",
      menu_url: null,
    },
  }
}

/** The sheet's Base UI Dialog context — SheetTitle/Description require it. */
function renderSheet(listing: InventoryListing) {
  return render(
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Popup>
          <ProductQuickLook listing={listing} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ok(listings: InventoryListing[]) {
  return { ok: true, json: async () => ({ listings }) }
}

describe("ProductQuickLook cross-dispensary prices", () => {
  // Tapping a card is the default path into a product, so the sheet — not the
  // full page — is where most shoppers decide. It used to go straight from
  // "Available at <one shop>" to a Buy button for a $32 listing whose twin two
  // towns over was $15.
  it("surfaces the cheaper shop instead of ending at a Buy button", async () => {
    const current = makeListing("l1", "Newport Cannabis Co.", 32)
    const fetchMock = vi.fn(async () =>
      ok([current, makeListing("l2", "Reef Wellness", 15)])
    )
    vi.stubGlobal("fetch", fetchMock)

    renderSheet(current)

    await waitFor(() =>
      expect(screen.getByText("At 2 dispensaries")).toBeInTheDocument()
    )
    expect(screen.getByText("Save $17.00")).toBeInTheDocument()
    expect(screen.getByText("Lowest")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Reef Wellness/ })).toHaveAttribute(
      "href",
      "/product/l2"
    )
  })

  it("asks for this brand, product, and category — not the whole catalog", async () => {
    const current = makeListing("l1", "Newport Cannabis Co.", 32)
    const fetchMock = vi.fn(async () => ok([current]))
    vi.stubGlobal("fetch", fetchMock)

    renderSheet(current)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const url = String((fetchMock.mock.calls[0] as unknown[])[0])
    expect(url).toContain("/api/search?")
    expect(url).toContain("brand=A-1+Herb+Co.")
    expect(url).toContain("q=Thank+You+Jerry")
    expect(url).toContain("category=flower")
  })

  // No other shop carries it is the common case; a table of one says nothing.
  it("shows no panel when nobody else carries it", async () => {
    const current = makeListing("l1", "Newport Cannabis Co.", 32)
    vi.stubGlobal("fetch", vi.fn(async () => ok([current])))

    renderSheet(current)

    await waitFor(() => expect(screen.getByText("$32.00")).toBeInTheDocument())
    expect(screen.queryByText(/At \d+ dispensaries/)).toBeNull()
  })

  // A failed lookup must never break the sheet — it just says nothing.
  it("stays silent when the lookup fails", async () => {
    const current = makeListing("l1", "Newport Cannabis Co.", 32)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    )

    renderSheet(current)

    await waitFor(() => expect(screen.getByText("$32.00")).toBeInTheDocument())
    expect(screen.queryByText(/At \d+ dispensaries/)).toBeNull()
  })
})

describe("ProductQuickLook unit price", () => {
  it("prints the rate next to the price so pack sizes are comparable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok([])))

    renderSheet(makeListing("l1", "Newport Cannabis Co.", 35))

    expect(screen.getByText("$10.00/g")).toBeInTheDocument()
  })

  // An edible's weight_grams is its THC dose (100mg → 0.1g), so $/g would read
  // "$180.00/g" on an $18 bag of gummies.
  it("says nothing for categories the gram doesn't price", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok([])))

    renderSheet(
      makeListing("l1", "Newport Cannabis Co.", 18, {
        category: "edible",
        weight_grams: 0.1,
        weight_display: "100mg",
      })
    )

    expect(screen.queryByText(/\/g$/)).toBeNull()
  })
})
