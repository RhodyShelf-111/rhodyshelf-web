import { getInventory } from "@/lib/queries/products"
import { HeroSearch } from "@/components/search/hero-search"
import { HomepageClient } from "./homepage-client"
import type { Metadata } from "next"

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: "RhodyShelf — Rhode Island Cannabis Menus & Deals",
  description:
    "Browse cannabis products across 8 Rhode Island dispensaries. Search by brand, category, strain, price, and more.",
}

// Category display config — maps DB category value to label
const CATEGORIES = [
  { key: "flower", label: "Flower" },
  { key: "concentrate", label: "Concentrates" },
  { key: "pre-roll", label: "Pre-Rolls" },
  { key: "vape", label: "Vapes" },
  { key: "edible", label: "Edibles" },
  { key: "topical", label: "Topicals" },
  { key: "accessory", label: "Accessories" },
]

export default async function HomePage() {
  const listings = await getInventory()

  // Build unique brand list for autocomplete
  const brands = [...new Set(listings.map((l) => l.product.brand_name))].sort()

  // Group listings by category
  const listingsByCategory = new Map<string, typeof listings>()
  for (const listing of listings) {
    const cat = listing.product.category.toLowerCase()
    if (!listingsByCategory.has(cat)) listingsByCategory.set(cat, [])
    listingsByCategory.get(cat)!.push(listing)
  }

  const sections = CATEGORIES
    .map((cat) => ({
      key: cat.key,
      label: cat.label,
      listings: listingsByCategory.get(cat.key) ?? [],
    }))
    .filter((s) => s.listings.length > 0)

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="font-heading text-[clamp(1.625rem,3.2vw,2.5rem)] font-bold tracking-tight leading-[1.1] text-foreground mb-2">
          Search RI dispensary menus, all in one place.
        </h1>
        <p className="text-muted-foreground text-base md:text-lg mb-5 max-w-2xl lg:max-w-none lg:whitespace-nowrap">
          Browse every Rhode Island dispensary menu, compare prices, and find what you&apos;re looking for.
        </p>
        <HeroSearch
          brands={brands}
          className="max-w-xl"
        />
      </div>

      {/* Category sections */}
      <HomepageClient sections={sections} />
    </div>
  )
}
