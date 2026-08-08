/**
 * Short, card-sized dispensary names.
 *
 * The registered names are long ("Aura of Rhode Island - Central Falls" is 35
 * characters) and a product card gives the where-line roughly half of a ~175px
 * tile, so the full name truncated to "Aura of Rhode I…" — the location half,
 * which is the part that decides whether a shopper can get there, never made it
 * onto the card at all. The short name plus the town fits and says more.
 *
 * Full names are still used everywhere the space exists (product page, quick
 * look, price comparison) and everywhere the value is data rather than display
 * (analytics `data-dispensary`, aria-labels, SEO copy).
 */

/** The registered name (as `dispensaries.name` stores it) → the card label. */
const REGISTERED: Array<[string, string]> = [
  ["Sweetspot Exeter", "Sweetspot"],
  ["Slater Center (Rec)", "Slater"],
  ["Newport Cannabis Co.", "Newport"],
  ["Mother Earth Pawtucket", "Mother Earth"],
  ["Aura of Rhode Island - Central Falls", "Aura"],
  ["Reef Wellness", "Reef"],
  ["Solar Cannabis Co. Warwick", "Solar"],
  ["Rise Dispensaries Warwick", "Rise"],
  ["GreenWave Foster", "GreenWave"],
]

/**
 * Lookup key for a registered name.
 *
 * Unicode dashes fold to ASCII and runs of whitespace collapse because the name
 * arrives from the WeedShelf sync, not from us: an en dash where the row used a
 * hyphen, or a double space, would miss an exact-match key and drop the shop to
 * the fallback trim — which is a silent, cosmetic-only failure, exactly the kind
 * nobody notices until a card reads "Aura of Rhode I…" again.
 */
function lookupKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** A Map, not an object literal: `SHORT_NAMES["__proto__"]` on an object
 *  returns Object.prototype, and rendering that throws "Objects are not valid
 *  as a React child" — one malformed feed row would blank an entire grid. */
const SHORT_NAMES = new Map(
  REGISTERED.map(([registered, short]) => [lookupKey(registered), short])
)

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** "Slater Center (Rec)" — the rec/medical qualifier is licence bookkeeping. */
function stripQualifier(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*$/, "").trim()
}

/**
 * The card label for a dispensary — the mapped short name when we know the
 * shop, otherwise a best-effort trim.
 *
 * The fallback exists because RI licenses new shops and a second location of an
 * existing one ("Sweetspot Providence") shouldn't have to wait on a code change
 * to fit: it drops a trailing licence qualifier, the town, and the corporate
 * tail, in that order. It never returns an empty string — a name that trims to
 * nothing comes back whole — and it always returns a string, including for
 * names that collide with Object.prototype keys.
 */
export function shortDispensaryName(
  name: string,
  city?: string | null
): string {
  const mapped = SHORT_NAMES.get(lookupKey(name))
  if (mapped) return mapped

  let short = stripQualifier(name)
  if (city) {
    short = short
      .replace(new RegExp(`[\\s\\-–—,]+${escapeRegExp(city)}\\s*$`, "i"), "")
      .trim()
    // Again, because the qualifier only strips when it's last: "Brand (Rec)
    // Providence" hides it behind the town on the first pass.
    short = stripQualifier(short)
  }
  short = short
    .replace(/\s*(?:cannabis\s+co\.?|dispensaries|dispensary|co\.)\s*$/i, "")
    .trim()

  return short || name
}
