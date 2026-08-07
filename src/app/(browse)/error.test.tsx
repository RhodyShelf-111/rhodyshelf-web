import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import BrowseError from "./error"

beforeEach(() => {
  // The boundary logs on mount (digest → server logs); keep runs quiet.
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

function renderError(retry: () => void = () => {}) {
  const error = Object.assign(new Error("boom"), { digest: "abc123" })
  const { container } = render(
    <BrowseError error={error} unstable_retry={retry} />
  )
  return { error, container }
}

describe("BrowseError", () => {
  it("says the menu couldn't load — never that the catalog is empty", () => {
    renderError()

    expect(
      screen.getByRole("heading", { name: /couldn't load this menu/i })
    ).toBeInTheDocument()
    // The whole point of the boundary: a failed load must not read as a
    // statement about what Rhode Island dispensaries carry.
    expect(document.body.textContent).not.toMatch(/no products/i)
  })

  it("wires Try again to unstable_retry (a real re-fetch, not a reload)", () => {
    const retry = vi.fn()
    renderError(retry)

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it("logs the error so its digest can be matched to the server logs", () => {
    const { error } = renderError()

    expect(console.error).toHaveBeenCalledWith(error)
  })

  it("renders no chrome of its own — the browse layout already supplies it", () => {
    const { container } = renderError()

    expect(container.querySelector("header")).toBeNull()
    expect(container.querySelector("footer")).toBeNull()
    expect(container.querySelector("main")).toBeNull()
    // …but it still offers a way back into the site.
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute(
      "href",
      "/"
    )
  })
})
