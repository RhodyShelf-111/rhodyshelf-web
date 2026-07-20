/**
 * Official RhodyShelf social profiles. Single source of truth so the footer
 * links and the Organization JSON-LD `sameAs` never drift apart — Google uses
 * sameAs to tie the site to the profile for the brand knowledge panel, and a
 * mismatched URL breaks that association.
 */

export const INSTAGRAM_HANDLE = "rhodyshelf"
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}`

/** Every profile we publish, in the order they should be rendered. */
export const SOCIAL_PROFILES = [
  { name: "Instagram", handle: `@${INSTAGRAM_HANDLE}`, url: INSTAGRAM_URL },
] as const

/** URLs only — the shape schema.org `sameAs` expects. Frozen because this
 *  module-scope array outlives every request in a long-running server: handing
 *  the same reference to each organizationJsonLd() call would let one caller
 *  mutating `org.sameAs` corrupt the JSON-LD on every subsequent page render. */
export const SOCIAL_PROFILE_URLS: readonly string[] = Object.freeze(
  SOCIAL_PROFILES.map((p) => p.url)
)
