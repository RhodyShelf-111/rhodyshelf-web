import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { NotFoundTitle } from "./not-found-title"

describe("NotFoundTitle", () => {
  it("pins document.title to 'Page not found' on mount and renders nothing", () => {
    // Simulate the client-side revert this component exists to defeat: Next's
    // metadata resolution having left the homepage title on the tab.
    document.title = "RhodyShelf — Rhode Island Cannabis Menus & Deals"

    const { container } = render(<NotFoundTitle />)

    expect(document.title).toBe("Page not found")
    expect(container).toBeEmptyDOMElement()
  })
})
