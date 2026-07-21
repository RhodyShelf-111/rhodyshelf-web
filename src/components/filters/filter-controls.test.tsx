import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { fireEvent } from "@testing-library/react"
import { FilterRadio } from "./filter-controls"

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
