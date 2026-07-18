import { describe, it, expect } from "vitest"
import {
  formatPrice,
  formatRelativeTime,
  getFreshnessBadge,
  slugify,
  getCategoryIcon,
} from "./utils"

describe("formatPrice", () => {
  it("formats to two decimals with a dollar sign", () => {
    expect(formatPrice(10)).toBe("$10.00")
    expect(formatPrice(9.5)).toBe("$9.50")
  })

  it("returns null for missing prices", () => {
    expect(formatPrice(null)).toBeNull()
  })
})

describe("formatRelativeTime", () => {
  const minutesAgo = (m: number) =>
    new Date(Date.now() - m * 60_000).toISOString()

  it("buckets minutes, hours, days, and weeks", () => {
    expect(formatRelativeTime(minutesAgo(0))).toBe("just now")
    expect(formatRelativeTime(minutesAgo(12))).toBe("12m ago")
    expect(formatRelativeTime(minutesAgo(3 * 60))).toBe("3h ago")
    expect(formatRelativeTime(minutesAgo(30 * 60))).toBe("yesterday")
    expect(formatRelativeTime(minutesAgo(3 * 24 * 60))).toBe("3d ago")
    expect(formatRelativeTime(minutesAgo(15 * 24 * 60))).toBe("2w ago")
  })
})

describe("getFreshnessBadge", () => {
  const daysAgo = (d: number) =>
    new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()

  it("maps drop age to the right badge window", () => {
    expect(getFreshnessBadge(daysAgo(1))?.label).toBe("Just Dropped")
    expect(getFreshnessBadge(daysAgo(5))?.label).toBe("Fresh")
    expect(getFreshnessBadge(daysAgo(10))?.label).toBe("New")
    expect(getFreshnessBadge(daysAgo(20))).toBeNull()
  })

  it("uses inclusive boundaries at 3, 7, and 14 days", () => {
    expect(getFreshnessBadge(daysAgo(3))?.label).toBe("Just Dropped")
    expect(getFreshnessBadge(daysAgo(4))?.label).toBe("Fresh")
    expect(getFreshnessBadge(daysAgo(7))?.label).toBe("Fresh")
    expect(getFreshnessBadge(daysAgo(8))?.label).toBe("New")
    expect(getFreshnessBadge(daysAgo(14))?.label).toBe("New")
    expect(getFreshnessBadge(daysAgo(15))).toBeNull()
  })
})

describe("slugify", () => {
  it("collapses punctuation runs into single hyphens", () => {
    expect(slugify("Aura of Rhode Island - Central Falls")).toBe(
      "aura-of-rhode-island-central-falls"
    )
  })

  it("strips leading and trailing separators", () => {
    expect(slugify("  Solar Cannabis Co. ")).toBe("solar-cannabis-co")
  })
})

describe("getCategoryIcon", () => {
  it("resolves DB values and plural display aliases, case-insensitively", () => {
    expect(getCategoryIcon("flower")).toBe("🌿")
    expect(getCategoryIcon("Pre-Rolls")).toBe("🚬")
  })

  it("falls back to the leaf for unknown categories", () => {
    expect(getCategoryIcon("beverage")).toBe("🌿")
  })
})
