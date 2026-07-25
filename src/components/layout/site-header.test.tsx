import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SiteHeader } from "./site-header"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {} }),
}))

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
