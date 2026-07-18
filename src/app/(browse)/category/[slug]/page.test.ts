import { describe, it, expect, vi } from "vitest"

// The page module transitively imports the Supabase service client, whose
// `server-only` guard (and env requirements) don't exist under vitest. The
// tests below only exercise the pure route-config exports, so stub it out.
vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: vi.fn(),
}))

import { generateStaticParams, generateMetadata } from "./page"
import { HOMEPAGE_CATEGORIES } from "@/lib/queries/products"

describe("category route params", () => {
  it("statically generates exactly the 7 known category slugs", () => {
    expect(generateStaticParams()).toEqual([
      { slug: "flower" },
      { slug: "concentrate" },
      { slug: "pre-roll" },
      { slug: "vape" },
      { slug: "edible" },
      { slug: "topical" },
      { slug: "accessory" },
    ])
    // Keep the route in lockstep with the homepage rails definition.
    expect(generateStaticParams()).toHaveLength(HOMEPAGE_CATEGORIES.length)
  })
})

describe("category generateMetadata", () => {
  it("builds canonical metadata for known slugs and Not Found for the rest (e.g. tincture)", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "pre-roll" }),
    })
    expect(meta.title).toBe("Pre-Rolls — Rhode Island Cannabis Menus")
    expect(meta.alternates?.canonical).toBe("/category/pre-roll")
    expect(meta.openGraph?.url).toBe("/category/pre-roll")
    expect(meta.description).toContain("pre-rolls")

    // Niche categories (tincture, other) have no landing page: metadata
    // collapses to Not Found and dynamicParams=false 404s the route itself.
    const missing = await generateMetadata({
      params: Promise.resolve({ slug: "tincture" }),
    })
    expect(missing).toEqual({ title: "Category Not Found" })
  })
})
