import { describe, it, expect, vi, beforeAll } from "vitest"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import { FilterSheet } from "./filter-sheet"

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

function openSheet() {
  render(
    <FilterSheet trigger="Filters" triggerClassName="trigger">
      <p>Body content</p>
    </FilterSheet>
  )
  fireEvent.click(screen.getByRole("button", { name: "Filters" }))
  const dialog = screen.getByRole("dialog")
  const popup = document.querySelector<HTMLElement>(
    "[data-slot=sheet-content]"
  )!
  // jsdom has no layout — give the threshold math a real sheet height.
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
  return {
    dialog,
    popup,
    dragZone: screen.getByTestId("filter-sheet-drag-zone"),
  }
}

describe("FilterSheet", () => {
  it("puts the title and the close button on one header row", () => {
    const { dialog } = openSheet()
    const title = within(dialog).getByText("Filters")
    const close = within(dialog).getByRole("button", { name: "Close" })
    // Same flex row — the close button no longer floats absolutely,
    // misaligned with the heading.
    expect(close.parentElement).toBe(title.parentElement)
    expect(title.parentElement?.className).toContain("items-center")
  })

  it("follows the finger while dragging down", () => {
    const { popup, dragZone } = openSheet()

    fireEvent.pointerDown(dragZone, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(dragZone, { clientY: 140, pointerId: 1 })

    expect(popup.style.transform).toBe("translateY(40px)")
  })

  it("dismisses after a decisive drag past a third of the sheet", async () => {
    const { dragZone } = openSheet()

    fireEvent.pointerDown(dragZone, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(dragZone, { clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(dragZone, { clientY: 300, pointerId: 1 })

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("dismisses on a quick downward flick even for a short drag", async () => {
    const { dragZone } = openSheet()

    fireEvent.pointerDown(dragZone, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(dragZone, { clientY: 110, pointerId: 1 })
    // 50px further with ~no elapsed time — a flick, well past 0.45 px/ms.
    fireEvent.pointerUp(dragZone, { clientY: 160, pointerId: 1 })

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("springs back from a hesitant drag instead of closing", async () => {
    const { popup, dragZone } = openSheet()

    fireEvent.pointerDown(dragZone, { button: 0, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(dragZone, { clientY: 140, pointerId: 1 })
    fireEvent.pointerUp(dragZone, { clientY: 140, pointerId: 1 })

    expect(popup.style.transform).toBe("translateY(0px)")
    // Give a would-be dismissal time to fire; the sheet must still be up.
    await new Promise((r) => setTimeout(r, 350))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("still closes from the header X", async () => {
    const { dialog } = openSheet()

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})
