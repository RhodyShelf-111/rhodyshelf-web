import { describe, it, expect } from "vitest"
import {
  formatPrice,
  formatRelativeTime,
  getFreshnessBadge,
  DROP_WINDOW_DAYS,
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
    // Half a day in, so floor() lands on d regardless of when the test runs.
    new Date(Date.now() - (d + 0.5) * 24 * 60 * 60 * 1000).toISOString()

  // The label used to be a mood word covering a multi-day span ("Just Dropped"
  // = days 0–3, "New" = days 8–14), so a card never said when its product
  // actually landed. Since /drops sorts newest-first, every card in the opening
  // screens read "Just Dropped" and the badge said nothing at all.
  it("states the actual age instead of a vague window", () => {
    expect(getFreshnessBadge(daysAgo(0))?.label).toBe("Dropped today")
    expect(getFreshnessBadge(daysAgo(1))?.label).toBe("Dropped yesterday")
    expect(getFreshnessBadge(daysAgo(2))?.label).toBe("Dropped 2d ago")
    expect(getFreshnessBadge(daysAgo(5))?.label).toBe("Dropped 5d ago")
    expect(getFreshnessBadge(daysAgo(13))?.label).toBe("Dropped 13d ago")
  })

  it("distinguishes every day inside the window", () => {
    const labels = Array.from(
      { length: DROP_WINDOW_DAYS + 1 },
      (_, d) => getFreshnessBadge(daysAgo(d))?.label
    )
    expect(labels.every(Boolean)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("still tiers the colour by recency at 3 and 7 days", () => {
    const tier = (d: number) => getFreshnessBadge(daysAgo(d))!.className
    expect(tier(0)).toBe(tier(3))
    expect(tier(4)).toBe(tier(7))
    expect(tier(8)).toBe(tier(DROP_WINDOW_DAYS))
    expect(new Set([tier(3), tier(4), tier(8)]).size).toBe(3)
  })

  it("returns no badge outside the drop window", () => {
    expect(getFreshnessBadge(daysAgo(DROP_WINDOW_DAYS))).not.toBeNull()
    expect(getFreshnessBadge(daysAgo(DROP_WINDOW_DAYS + 1))).toBeNull()
    expect(getFreshnessBadge(daysAgo(20))).toBeNull()
    // A future timestamp is bad data, not a drop.
    expect(getFreshnessBadge(daysAgo(-3))).toBeNull()
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
