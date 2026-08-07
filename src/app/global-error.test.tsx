import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { render, screen, fireEvent } from "@testing-library/react"

// The component imports globals.css; vitest can't parse CSS, so stub it out.
vi.mock("./globals.css", () => ({}))

import GlobalError from "./global-error"

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

// Rendered to static markup rather than into jsdom: global-error replaces the
// whole document, so it emits its own <html>/<body> — which is exactly the
// thing worth locking down (without them the page renders unstyled/invalid).
describe("GlobalError", () => {
  it("ships its own html/body, since it replaces the root layout", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error("boom")} unstable_retry={() => {}} />
    )

    expect(html).toContain("<html")
    expect(html).toContain("<body")
    // Dark-only site: the root layout's `dark` class is gone with it.
    expect(html).toContain("dark")
    expect(html).toContain("Something went wrong")
    expect(html).toContain("Try again")
  })

  it("wires Try again to unstable_retry and logs the error's digest", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" })
    const retry = vi.fn()
    render(<GlobalError error={error} unstable_retry={retry} />)

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(retry).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(error)
  })
})
