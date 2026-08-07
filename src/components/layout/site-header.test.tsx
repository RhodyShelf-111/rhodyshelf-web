import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { SiteHeader } from "./site-header"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {} }),
}))

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode
  prefetch?: boolean
}

// next/link swallows `prefetch` — it never reaches the <a>, so there'd be
// nothing in the DOM to assert. Mirror it onto a data attribute instead.
vi.mock("next/link", async () => {
  const { createElement } = await import("react")
  return {
    default: ({ children, prefetch, ...props }: MockLinkProps) =>
      createElement(
        "a",
        { "data-prefetch": String(prefetch), ...props },
        children
      ),
  }
})

beforeAll(() => {
  // Base UI's floating popup machinery expects these browser APIs; jsdom
  // ships neither.
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

function openMenu() {
  render(<SiteHeader />)
  fireEvent.click(screen.getByRole("button", { name: "Menu" }))
  const popup = document.querySelector<HTMLElement>("[data-slot=sheet-content]")!
  // jsdom has no layout — give the dismissal threshold a real sheet height.
  vi.spyOn(popup, "getBoundingClientRect").mockReturnValue({
    height: 400,
    width: 375,
    top: 0,
    left: 0,
    right: 375,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  return { popup, dragZone: screen.getByTestId("nav-sheet-drag-zone") }
}

describe("SiteHeader mobile menu", () => {
  it("opens the bottom sheet from the hamburger", () => {
    openMenu()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Dispensaries/ })).toHaveAttribute(
      "href",
      "/dispensary"
    )
  })

  // Regression: the menu rendered a grab handle — an explicit promise that it
  // can be flung away — but wired up no pointer handlers at all, so the gesture
  // did nothing. Base UI's Dialog has no drag of its own; the sheet has to
  // bring one (useSwipeDismiss, shared with the filter sheet).
  it("follows the finger while dragging the handle down", () => {
    const { popup, dragZone } = openMenu()

    fireEvent.pointerDown(dragZone, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(dragZone, { clientY: 150, pointerId: 1 })

    expect(popup.style.transform).toBe("translateY(50px)")
  })

  it("dismisses after a decisive drag past a third of the sheet", async () => {
    const { dragZone } = openMenu()

    fireEvent.pointerDown(dragZone, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(dragZone, { clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(dragZone, { clientY: 300, pointerId: 1 })

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("dismisses on a quick downward flick even for a short drag", async () => {
    const { dragZone } = openMenu()

    fireEvent.pointerDown(dragZone, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(dragZone, { clientY: 110, pointerId: 1 })
    // 50px further with ~no elapsed time — a flick, well past 0.45 px/ms.
    fireEvent.pointerUp(dragZone, { clientY: 160, pointerId: 1 })

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("springs back from a hesitant drag instead of closing", async () => {
    const { popup, dragZone } = openMenu()

    fireEvent.pointerDown(dragZone, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(dragZone, { clientY: 140, pointerId: 1 })
    fireEvent.pointerUp(dragZone, { clientY: 140, pointerId: 1 })

    expect(popup.style.transform).toBe("translateY(0px)")
    // Give a would-be dismissal time to fire; the menu must still be up.
    await new Promise((r) => setTimeout(r, 350))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("leaves through the same slide-out when a nav link is tapped", async () => {
    const { popup } = openMenu()

    fireEvent.click(screen.getByRole("link", { name: /Deals/ }))

    expect(popup.style.transform).toBe("translateY(100%)")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})

describe("SiteHeader nav prefetching", () => {
  // Regression: the header nav is in-viewport on every page and its rows all
  // mount at once in the sheet, so the default prefetch background-downloaded
  // the full /drops and /brand payloads. The footer and home chips already
  // opt out; this nav was missed.
  it("opts the always-visible desktop nav out of viewport prefetch", () => {
    render(<SiteHeader />)

    // Only the desktop nav is mounted here, so each label appears exactly once.
    for (const name of ["Search", "Dispensaries", "Brands", "Deals", "Drops"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "data-prefetch",
        "false"
      )
    }
  })

  it("opts the mobile menu rows out too", () => {
    openMenu()

    expect(screen.getByRole("link", { name: /Brands/ })).toHaveAttribute(
      "data-prefetch",
      "false"
    )
    expect(screen.getByRole("link", { name: /Drops/ })).toHaveAttribute(
      "data-prefetch",
      "false"
    )
  })
})

describe("SiteHeader mobile search", () => {
  // Base UI's own scroll lock (from the menu tests above) can outlive its
  // unmount, and the overlay restores whatever it found — so start from a
  // known baseline or the restore assertion below is vacuous.
  beforeEach(() => {
    document.body.style.overflow = ""
  })

  function openSearch() {
    render(<SiteHeader />)
    fireEvent.click(screen.getByRole("button", { name: "Search" }))
    return screen.getByRole("dialog", { name: "Search" })
  }

  // Regression: this was a bare div + a click-only scrim. Everything behind it
  // stayed tabbable and in the a11y tree, and with body scroll locked a
  // keyboard user could focus nav links they could never scroll into view.
  it("announces itself as a modal dialog", () => {
    const dialog = openSearch()

    expect(dialog).toHaveAttribute("aria-modal", "true")
  })

  it("takes the page behind it out of reach while open", () => {
    openSearch()

    const header = document.querySelector("header")!
    expect(header.closest("body > *")).toHaveAttribute("inert")
  })

  it("hands the page back when it closes", () => {
    openSearch()
    const behind = document.querySelector("header")!.closest("body > *")!

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(behind).not.toHaveAttribute("inert")
    expect(screen.queryByRole("dialog", { name: "Search" })).toBeNull()
  })

  it("closes on Escape", () => {
    const dialog = openSearch()

    fireEvent.keyDown(dialog, { key: "Escape" })

    expect(screen.queryByRole("dialog", { name: "Search" })).toBeNull()
  })

  it("returns focus to the Search button on close", () => {
    const dialog = openSearch()

    fireEvent.keyDown(dialog, { key: "Escape" })

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Search" })
    )
  })

  it("cycles Tab back to the input instead of out through the page", () => {
    const dialog = openSearch()
    within(dialog).getByRole("button", { name: "Cancel" }).focus()

    const tab = fireEvent.keyDown(dialog, { key: "Tab" })

    expect(tab).toBe(false)
    expect(document.activeElement).toBe(within(dialog).getByRole("searchbox"))
  })

  it("cycles Shift+Tab from the input back to Cancel", () => {
    const dialog = openSearch()
    within(dialog).getByRole("searchbox").focus()

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true })

    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: "Cancel" })
    )
  })

  it("leaves a mid-dialog Tab to the browser", () => {
    const dialog = openSearch()
    within(dialog).getByRole("searchbox").focus()

    // Forward Tab from the first of two focusables isn't at the edge, so the
    // handler must not preventDefault and steal it.
    const tab = fireEvent.keyDown(dialog, { key: "Tab" })

    expect(tab).toBe(true)
  })

  it("stands down once the query is submitted", () => {
    const dialog = openSearch()
    const input = within(dialog).getByRole("searchbox")
    fireEvent.change(input, { target: { value: "gummies" } })

    fireEvent.submit(input.closest("form")!)

    expect(screen.queryByRole("dialog", { name: "Search" })).toBeNull()
  })

  it("restores body scroll when it closes", () => {
    openSearch()
    expect(document.body.style.overflow).toBe("hidden")

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(document.body.style.overflow).toBe("")
  })

  // Regression: the overlay is md:hidden, and an iPhone turned to landscape is
  // 844px wide — past md. It used to vanish on rotation while leaving the page
  // inert and scroll-locked, with nothing left on screen to dismiss it.
  it("stands down when the viewport grows past the mobile breakpoint", () => {
    const listeners: (() => void)[] = []
    let matches = false
    const real = window.matchMedia
    window.matchMedia = ((query: string) => ({
      get matches() {
        return matches
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      openSearch()
      const behind = document.querySelector("header")!.closest("body > *")!
      expect(behind).toHaveAttribute("inert")

      // Rotate: the query now matches and the browser fires `change`.
      matches = true
      act(() => listeners.forEach((fn) => fn()))

      expect(screen.queryByRole("dialog", { name: "Search" })).toBeNull()
      expect(behind).not.toHaveAttribute("inert")
      expect(document.body.style.overflow).toBe("")
    } finally {
      window.matchMedia = real
    }
  })
})
