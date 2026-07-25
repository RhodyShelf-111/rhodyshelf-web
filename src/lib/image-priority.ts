/**
 * How many leading cards on a listing surface get the eager / high-fetch-priority
 * image hint. Roughly one viewport row on desktop (5 cols) / three on mobile
 * (2 cols) — enough for the LCP candidate without defeating lazy loading below
 * the fold. Shared by ProductGrid, the search results grid, and the homepage
 * rails so they can't drift.
 *
 * This lives in a plain module, NOT in product-card.tsx, because that file is
 * `"use client"`. A server component importing a value from a client module
 * gets a client-reference stub instead of the value — `EAGER_IMAGE_COUNT` came
 * back as a *function*, so `index < EAGER_IMAGE_COUNT` was silently false and
 * every card rendered lazy. It fails quietly and jsdom can't reproduce it (the
 * test renderer ignores "use client"), so keep this out of client modules.
 */
export const EAGER_IMAGE_COUNT = 6
