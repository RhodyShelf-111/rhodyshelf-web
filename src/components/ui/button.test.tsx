import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "./button"

describe("Button", () => {
  it("hovers as a button, not only as an anchor", () => {
    render(<Button>Show 42 results</Button>)
    const button = screen.getByRole("button", { name: "Show 42 results" })

    // The primitive renders a <button>, so shadcn's `[a]:hover:` (compiled to
    // `:is(a):hover`) could never match — the default variant, which is every
    // primary CTA in the app, had no hover state at all.
    expect(button.tagName).toBe("BUTTON")
    expect(button.className).toContain("hover:bg-primary/90")
    expect(button.className).not.toContain("[a]:hover")
  })

  it("keeps a hover state on every other variant too", () => {
    const variants = [
      "outline",
      "secondary",
      "ghost",
      "destructive",
      "link",
    ] as const
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>Go</Button>)
      expect(screen.getByRole("button").className).toMatch(/(^|\s)hover:/)
      unmount()
    }
  })
})
