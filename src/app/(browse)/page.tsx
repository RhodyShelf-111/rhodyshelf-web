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
  { key: "pre-roll", label: "Pre-Rolls" },
  { key: "vape", label: "Vapes" },
  { key: "edible", label: "Edibles" },
  { key: "concentrate", label: "Concentrates" },
  { key: "accessory", label: "Accessories" },
  { key: "topical", label: "Topicals" },
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Search RI dispensary menus,
          <br className="hidden sm:block" /> all in one place.
        </h1>
        <p className="text-muted-foreground text-base mb-5 max-w-lg">
          Browse every Rhode Island dispensary menu, compare prices, and find what you&apos;re looking for.
        </p>
        <HeroSearch
          brands={brands}
          className="max-w-md"
        />
      </div>

      {/* Category sections */}
      <HomepageClient sections={sections} />
    </div>
  )
}
