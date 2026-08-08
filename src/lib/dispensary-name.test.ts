import { describe, it, expect } from "vitest"
import { shortDispensaryName } from "./dispensary-name"

describe("shortDispensaryName", () => {
  // The nine licensed RI shops as they're registered in `dispensaries.name`.
  // Table-driven because the map IS the feature: a name that drifts in the feed
  // silently falls through to the trim fallback, and this is what catches it.
  const REGISTERED: Array<[string, string | null, string]> = [
    ["Sweetspot Exeter", "Exeter", "Sweetspot"],
    ["Slater Center (Rec)", "Providence", "Slater"],
    ["Newport Cannabis Co.", "Newport", "Newport"],
    ["Mother Earth Pawtucket", "Pawtucket", "Mother Earth"],
    ["Aura of Rhode Island - Central Falls", "Central Falls", "Aura"],
    ["Reef Wellness", "Woonsocket", "Reef"],
    ["Solar Cannabis Co. Warwick", "Warwick", "Solar"],
    ["Rise Dispensaries Warwick", "Warwick", "Rise"],
    ["GreenWave Foster", "Foster", "GreenWave"],
  ]

  it.each(REGISTERED)("shortens %s to %s", (name, city, expected) => {
    expect(shortDispensaryName(name, city)).toBe(expected)
  })

  it("matches regardless of case or stray whitespace in the stored name", () => {
    expect(shortDispensaryName("  sweetspot exeter ", "Exeter")).toBe("Sweetspot")
    expect(shortDispensaryName("Sweetspot  Exeter", "Exeter")).toBe("Sweetspot")
  })

  // The name comes from the WeedShelf sync, not from us. An en dash where the
  // row used a hyphen would miss the key and silently drop back to the fallback
  // trim — "Aura of Rhode Island", the long label this module exists to kill.
  it("matches a unicode-dash variant of a registered name", () => {
    expect(
      shortDispensaryName("Aura of Rhode Island – Central Falls", "Central Falls")
    ).toBe("Aura")
    expect(
      shortDispensaryName("Aura of Rhode Island — Central Falls", "Central Falls")
    ).toBe("Aura")
  })

  // Regression: with an object literal as the table, `SHORT_NAMES["__proto__"]`
  // returns Object.prototype and `["constructor"]` returns a function. Either
  // one, rendered as a React child, throws and blanks the whole grid. A Map has
  // no inherited keys.
  it("returns a plain string for names that collide with Object.prototype", () => {
    for (const hostile of ["__proto__", "constructor", "toString", "valueOf"]) {
      expect(typeof shortDispensaryName(hostile, "Providence")).toBe("string")
      expect(shortDispensaryName(hostile, "Providence")).toBe(hostile)
    }
  })

  // RI keeps licensing shops; a second location of a known brand shouldn't have
  // to wait on a code change to fit the card.
  it("trims the town off an unmapped shop", () => {
    expect(shortDispensaryName("Sweetspot Providence", "Providence")).toBe(
      "Sweetspot"
    )
  })

  it("trims a licence qualifier and a corporate tail off an unmapped shop", () => {
    expect(shortDispensaryName("Thomas C. Slater Center (Med)", "Providence")).toBe(
      "Thomas C. Slater Center"
    )
    // The qualifier only strips when it's last, so the town has to come off
    // first for this shape — otherwise the label keeps the "(Rec)".
    expect(shortDispensaryName("Budtender (Rec) Providence", "Providence")).toBe(
      "Budtender"
    )
    expect(shortDispensaryName("Ocean State Cannabis Co.", "Bristol")).toBe(
      "Ocean State"
    )
  })

  it("leaves a short unmapped name alone", () => {
    expect(shortDispensaryName("Herbal", "Cranston")).toBe("Herbal")
  })

  // A name that trims to nothing (a shop literally called for its town) comes
  // back whole rather than rendering an empty where-line.
  it("never returns an empty label", () => {
    expect(shortDispensaryName("Warwick", "Warwick")).toBe("Warwick")
    expect(shortDispensaryName("Cannabis Co.", null)).toBe("Cannabis Co.")
  })

  // The city is interpolated into a RegExp; a name like "Foster (Rec)" would
  // otherwise be a live pattern.
  it("treats a regex-special city name as literal text", () => {
    // Unescaped, the "." would match the X and strip a town that isn't there.
    expect(shortDispensaryName("Budtender cXty", "C.ty")).toBe("Budtender cXty")
    expect(shortDispensaryName("Budtender C.ty", "C.ty")).toBe("Budtender")
  })

  it("works with no city at all", () => {
    expect(shortDispensaryName("Reef Wellness")).toBe("Reef")
    expect(shortDispensaryName("Rise Dispensaries")).toBe("Rise")
  })
})
