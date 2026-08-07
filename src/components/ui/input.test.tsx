import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Input } from "./input"

describe("Input", () => {
  it("draws a boundary a low-vision user can find", () => {
    render(<Input placeholder="Search brands..." />)

    // --input (#2d3d2d) measured 1.67:1 on --background and 1.41:1 on
    // --popover, so the field had no visible edge in the filter panels, where
    // a placeholder is the only label. muted-foreground/70 measures 4.26:1 /
    // 3.85:1, clearing WCAG 1.4.11's 3:1. Asserted on the class because jsdom
    // computes no colors.
    const input = screen.getByPlaceholderText("Search brands...")
    expect(input.className).toContain("border-muted-foreground/70")
    expect(input.className).not.toContain("border-input")
  })

  it("still lets a caller override the border (the header search deliberately rests borderless)", () => {
    render(<Input placeholder="Search" className="border-transparent" />)

    const input = screen.getByPlaceholderText("Search")
    expect(input.className).toContain("border-transparent")
    expect(input.className).not.toContain("border-muted-foreground/70")
  })
})
