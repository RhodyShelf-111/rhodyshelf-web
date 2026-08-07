import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { HeroSearch } from "./hero-search"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

beforeEach(() => {
  push.mockClear()
  // The debounced /api/search/suggest call would otherwise hit an undefined
  // global fetch; every test here drives the instant local brand seed instead.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {}))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  // restoreMocks isn't on in vitest.config.ts, so spies on shared prototypes
  // (Element.prototype.scrollIntoView) would otherwise leak into later tests.
  vi.restoreAllMocks()
})

const BRANDS = ["Gumdrop Farms", "Gummy Co", "Green Acres"]

/** Render, type `term`, and hand back the combobox input. */
function typeQuery(term: string) {
  render(<HeroSearch brands={BRANDS} />)
  const input = screen.getByRole("combobox")
  fireEvent.change(input, { target: { value: term } })
  return input
}

describe("HeroSearch combobox", () => {
  it("names the field for assistive tech instead of leaning on the placeholder", () => {
    render(<HeroSearch brands={BRANDS} />)
    expect(
      screen.getByRole("combobox", { name: "Search products, brands, strains" })
    ).toBeInTheDocument()
  })

  it("lets a caller keep the accessible name in sync with a custom placeholder", () => {
    render(<HeroSearch brands={BRANDS} placeholder="Find a strain…" label="Find a strain" />)
    expect(screen.getByRole("combobox", { name: "Find a strain" })).toBeInTheDocument()
  })

  // Regression: options were plain <button>s whose only handler was
  // onMouseDown, so Tab walked into the list and Enter on a focused option
  // (which fires `click`) did nothing at all.
  it("keeps the options out of the tab order", () => {
    typeQuery("gum")
    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("tabindex", "-1")
    }
  })

  it("selects a suggestion on click, not just on mousedown", () => {
    typeQuery("gum")

    fireEvent.click(screen.getByRole("option", { name: "Gumdrop Farms" }))

    expect(push).toHaveBeenCalledWith("/search?brand=Gumdrop%20Farms")
  })

  it("runs the full query from the trailing View all option", () => {
    typeQuery("gum")

    fireEvent.click(screen.getByRole("option", { name: /View all results/ }))

    expect(push).toHaveBeenCalledWith("/search?q=gum")
  })

  it("keeps focus in the input while the pointer goes down on an option", () => {
    const input = typeQuery("gum")
    input.focus()

    const down = fireEvent.mouseDown(screen.getByRole("option", { name: "Gummy Co" }))

    // fireEvent returns false when a handler called preventDefault — that's
    // what stops the browser moving focus (and closing the mobile keyboard).
    expect(down).toBe(false)
    expect(document.activeElement).toBe(input)
  })

  // Regression: arrow keys moved a local highlight that was never announced,
  // so a screen-reader user pressing Down heard silence.
  it("points aria-activedescendant at the arrowed-to option", () => {
    const input = typeQuery("gum")

    expect(input).not.toHaveAttribute("aria-activedescendant")

    fireEvent.keyDown(input, { key: "ArrowDown" })

    const active = input.getAttribute("aria-activedescendant")
    expect(active).toBeTruthy()
    expect(document.getElementById(active!)).toHaveTextContent("Gumdrop Farms")
    expect(document.getElementById(active!)).toHaveAttribute("aria-selected", "true")
  })

  // Regression: `(i - 1 + total) % total` from the -1 start landed on the
  // second-to-last option, so Up could never reach "View all".
  it("wraps aria-activedescendant round to View all and back to the top", () => {
    const input = typeQuery("gum")
    const optionIds = () =>
      screen.getAllByRole("option").map((o) => o.getAttribute("id"))

    // 2 brand matches for "gum" + the trailing View all = 3 stops.
    fireEvent.keyDown(input, { key: "ArrowUp" })
    expect(input.getAttribute("aria-activedescendant")).toBe(optionIds().at(-1))

    fireEvent.keyDown(input, { key: "ArrowDown" })
    expect(input.getAttribute("aria-activedescendant")).toBe(optionIds()[0])

    // ...and Up from the first option comes back round to the last.
    fireEvent.keyDown(input, { key: "ArrowUp" })
    expect(input.getAttribute("aria-activedescendant")).toBe(optionIds().at(-1))
  })

  it("drops aria-activedescendant when the menu closes", () => {
    const input = typeQuery("gum")
    fireEvent.keyDown(input, { key: "ArrowDown" })
    expect(input).toHaveAttribute("aria-activedescendant")

    fireEvent.keyDown(input, { key: "Escape" })

    expect(input).not.toHaveAttribute("aria-activedescendant")
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("dismisses the menu when Tab leaves the widget", () => {
    const input = typeQuery("gum")

    fireEvent.keyDown(input, { key: "Tab" })

    expect(screen.queryByRole("listbox")).toBeNull()
    expect(input).toHaveAttribute("aria-expanded", "false")
  })

  // A listbox may only own options and groups; the type headings used to sit
  // in bare <div>s, which put role-less children directly under the list.
  it("wraps each suggestion type in a labelled group", () => {
    typeQuery("gum")

    const group = screen.getByRole("group", { name: "Brands" })
    expect(group).toContainElement(screen.getByRole("option", { name: "Gummy Co" }))
    // The visible heading is decoration — the group already carries the name.
    expect(screen.getByRole("listbox").querySelector("p")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
  })

  it("gives every option a unique id for aria-activedescendant to target", () => {
    typeQuery("gum")

    const ids = screen.getAllByRole("option").map((o) => o.id)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("scrolls the arrowed-to option into the capped-height list", () => {
    // jsdom has no layout, so scrollIntoView isn't defined at all — vi.spyOn
    // refuses to spy on a missing property, so define it first, then spy so it
    // is restored afterwards instead of leaking into every test below.
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      value: () => {},
      writable: true,
      configurable: true,
    })
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {})

    const input = typeQuery("gum")
    fireEvent.keyDown(input, { key: "ArrowDown" })

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" })
  })

  it("submits the typed query when Enter lands with nothing highlighted", () => {
    const input = typeQuery("gum")

    fireEvent.keyDown(input, { key: "Enter" })

    expect(push).toHaveBeenCalledWith("/search?q=gum")
  })

  it("selects the highlighted suggestion on Enter", () => {
    const input = typeQuery("gum")

    fireEvent.keyDown(input, { key: "ArrowDown" })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(push).toHaveBeenCalledWith("/search?brand=Gumdrop%20Farms")
  })

  // Regression: the /suggest response replaces the local brand seed, and it can
  // be shorter than it. activeIndex was left pointing past the new end, so
  // aria-activedescendant named an id that no longer existed in the DOM.
  it("never points aria-activedescendant at an id that left the list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          // One row back where the local seed had two — index 2 ("View all")
          // is now index 1.
          json: () => Promise.resolve({ suggestions: [{ type: "brand", value: "Gummy Co" }] }),
        })
      )
    )
    const input = typeQuery("gum")
    fireEvent.keyDown(input, { key: "ArrowUp" }) // → last option, index 2

    await waitFor(() =>
      expect(screen.getAllByRole("option")).toHaveLength(2)
    )

    const active = input.getAttribute("aria-activedescendant")!
    expect(document.getElementById(active)).not.toBeNull()
    expect(document.getElementById(active)).toHaveAttribute("aria-selected", "true")
  })

  it("clears the field from the clear button and returns focus to it", async () => {
    const input = typeQuery("gum")

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }))

    await waitFor(() => expect(input).toHaveValue(""))
    expect(document.activeElement).toBe(input)
    expect(screen.queryByRole("listbox")).toBeNull()
  })
})
