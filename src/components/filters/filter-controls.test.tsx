import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { fireEvent } from "@testing-library/react"
import { FilterRadio, OnSaleToggle } from "./filter-controls"

describe("FilterRadio", () => {
  it("fires onChange once when selecting an unchecked radio", () => {
    const onChange = vi.fn()
    render(
      <FilterRadio name="g" checked={false} onChange={onChange} label="Hi5" />
    )

    fireEvent.click(screen.getByRole("radio", { name: "Hi5" }))

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it("fires onChange when re-tapping the checked radio, so toggle-off consumers can clear it (radios emit no change event for that)", () => {
    const onChange = vi.fn()
    render(
      <FilterRadio name="g" checked={true} onChange={onChange} label="Hi5" />
    )

    fireEvent.click(screen.getByRole("radio", { name: "Hi5" }))

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe("OnSaleToggle", () => {
  it("toggles from a tap anywhere on the row — a role=switch div isn't labelable, so the text must be wired up explicitly", () => {
    const onChange = vi.fn()
    render(<OnSaleToggle checked={false} onChange={onChange} />)

    fireEvent.click(screen.getByText("On Sale Only"))
    expect(onChange).toHaveBeenCalledTimes(1)

    // A tap on the switch itself bubbles to the same row handler — once.
    fireEvent.click(screen.getByRole("switch"))
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it("names the switch for assistive tech and keeps keyboard toggling", () => {
    const onChange = vi.fn()
    render(<OnSaleToggle checked={true} onChange={onChange} />)

    const toggle = screen.getByRole("switch", { name: "On Sale Only" })
    expect(toggle).toHaveAttribute("aria-checked", "true")

    fireEvent.keyDown(toggle, { key: " " })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
