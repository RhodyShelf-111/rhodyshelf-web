import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { FilterBar } from "./filter-bar"
import type { Dispensary, ProductFilters } from "@/lib/types"

beforeAll(() => {
  // Base UI's floating popup machinery (the mobile FilterSheet) expects these
  // browser APIs; jsdom ships neither.
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

const DISPENSARIES: Dispensary[] = [
  { id: "1", name: "Aura", slug: "aura", city: null, menu_url: null },
  {
    id: "2",
    name: "Mother Earth",
    slug: "mother-earth",
    city: null,
    menu_url: null,
  },
]

function renderBar(filters: ProductFilters = { sort: "brand-asc" }) {
  const onFilterChange = vi.fn()
  const utils = render(
    <FilterBar
      filters={filters}
      categories={["flower", "edible"]}
      brands={["Hi5", "Rove"]}
      dispensaries={DISPENSARIES}
      onFilterChange={onFilterChange}
      onClear={vi.fn()}
      resultCount={42}
    />
  )
  return { ...utils, onFilterChange }
}

/** The mobile sheet's trigger — jsdom ignores the md: breakpoint, so both the
 *  mobile and desktop controls are in the tree. */
const sheetTrigger = () => screen.getByRole("button", { name: /^Filters/ })

describe("FilterBar active-filter badge", () => {
  it("shows no badge when only sort is set — parseSearchQuery always resolves sort, so the badge used to read '1' on a virgin /search", () => {
    renderBar({ sort: "brand-asc" })

    expect(sheetTrigger().textContent).toBe("Filters")
  })

  it("counts only the filters that narrow results", () => {
    renderBar({ sort: "price-asc", brand: "Hi5", dispensary: "aura" })

    expect(sheetTrigger().textContent).toBe("Filters2")
  })

  it("ignores cleared filters (undefined) and an off On Sale toggle", () => {
    renderBar({
      sort: "brand-asc",
      brand: undefined,
      onSale: false,
      search: "gummies",
    })

    expect(sheetTrigger().textContent).toBe("Filters1")
  })
})

describe("FilterBar desktop dropdowns", () => {
  it("announces the popup it actually opens and ties the trigger to it", () => {
    renderBar()
    const trigger = screen.getByRole("button", { name: /All Brands/ })

    // No aria-haspopup: what opens is a role="group" of toggle buttons.
    // "listbox" would promise options; bare "true" aliases to "menu" and
    // promises menuitems + arrow keys. Neither exists here, so the honest
    // markup is the plain disclosure pair below.
    expect(trigger).not.toHaveAttribute("aria-haspopup")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(trigger).not.toHaveAttribute("aria-controls")

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute("aria-expanded", "true")
    const panel = screen.getByRole("group", { name: "Brand" })
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id)
  })

  it("marks the applied brand as pressed so it can be told from the rest", () => {
    renderBar({ sort: "brand-asc", brand: "Hi5" })

    // The active-brand pill splits into "open" + "clear" buttons; the opener
    // is named for the brand alone.
    fireEvent.click(screen.getByRole("button", { name: "Hi5" }))
    const panel = screen.getByRole("group", { name: "Brand" })

    expect(within(panel).getByRole("button", { name: "Hi5" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(within(panel).getByRole("button", { name: "Rove" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("closes on Escape and hands focus back to the trigger (the backdrop was mouse-only)", () => {
    renderBar()
    const trigger = screen.getByRole("button", { name: /All Dispensaries/ })
    fireEvent.click(trigger)
    expect(screen.getByRole("group", { name: "Dispensary" })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.queryByRole("group", { name: "Dispensary" })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it("leaves the panel open for any other key", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /All Dispensaries/ }))

    fireEvent.keyDown(document, { key: "a" })

    expect(screen.getByRole("group", { name: "Dispensary" })).toBeInTheDocument()
  })

  it("gives the sort trigger the popup state it was missing entirely", () => {
    renderBar()
    // Named "Sort by: …" — the trigger shows only its value, so unlabelled it
    // announced as a second brand filter.
    const trigger = screen.getByRole("button", {
      name: "Sort by: Brand: A to Z",
    })

    expect(trigger).not.toHaveAttribute("aria-haspopup")
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute("aria-expanded", "true")
    const panel = screen.getByRole("group", { name: "Sort" })
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id)
    expect(
      within(panel).getByRole("button", { name: "Brand: A to Z" })
    ).toHaveAttribute("aria-pressed", "true")
  })
})

describe("FilterBar sort vocabulary", () => {
  it("labels the resting trigger from the canonical vocabulary, defaulting to brand-asc", () => {
    const { unmount } = renderBar({})
    expect(
      screen.getByRole("button", { name: /Brand: A to Z/ })
    ).toBeInTheDocument()
    unmount()

    renderBar({ sort: "thc-desc" })
    expect(
      screen.getByRole("button", { name: /THC: High to Low/ })
    ).toBeInTheDocument()
  })

  it("offers only sorts /search can round-trip — VALID_SORTS drops the others back to brand-asc", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /Brand: A to Z/ }))
    const panel = screen.getByRole("group", { name: "Sort" })

    // "discount-desc" is the only canonical sort /search can't carry:
    // search-params.ts's VALID_SORTS omits it and searchListings has no
    // discount ordering, so picking it would bounce straight back to brand-asc.
    expect(
      within(panel).queryByRole("button", { name: "Biggest discount" })
    ).toBeNull()
    // Everything else round-trips, including name-asc — it's in VALID_SORTS
    // and searchListings orders by product(name) for it.
    for (const label of [
      "Newest",
      "Price: Low to High",
      "Price: High to Low",
      "THC: High to Low",
      "Name: A to Z",
      "Brand: A to Z",
    ]) {
      expect(within(panel).getByRole("button", { name: label })).toBeInTheDocument()
    }
  })
})
