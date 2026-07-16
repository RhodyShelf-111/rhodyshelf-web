import { describe, it, expect } from "vitest"
import manifest from "./manifest"

describe("manifest", () => {
  it("declares an installable PWA rooted at / with dark-theme colors and icons", () => {
    const m = manifest()
    expect(m.short_name).toBe("RhodyShelf")
    expect(m.name).toContain("Rhode Island")
    expect(m.start_url).toBe("/")
    expect(m.display).toBe("standalone")
    // Must match the root layout's viewport themeColor (#0a0f0a).
    expect(m.theme_color).toBe("#0a0f0a")
    expect(m.background_color).toBe("#0a0f0a")
    expect(m.icons).toEqual([
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ])
  })
})
