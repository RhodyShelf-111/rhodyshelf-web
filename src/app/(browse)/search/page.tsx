import { getInventory } from "@/lib/queries/products"
import { SearchClient } from "./search-client"
import type { Metadata } from "next"
import type { ProductFilters } from "@/lib/types"

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search cannabis products across all Rhode Island dispensaries. Filter by brand, category, strain, price, and more.",
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    brand?: string
    dispensary?: string
    sale?: string
    sort?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const listings = await getInventory()

  const brands = [...new Set(listings.map((l) => l.product.brand_name))].sort()

  const initialFilters: ProductFilters = {
    search: params.q || undefined,
    category: params.category || undefined,
    brand: params.brand || undefined,
    dispensary: params.dispensary || undefined,
    onSale: params.sale === "true" || undefined,
    sort: (params.sort as ProductFilters["sort"]) || "brand-asc",
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {params.q ? `Results for "${params.q}"` : params.brand ? params.brand : "Browse Menu"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {listings.length.toLocaleString()} products across Rhode Island dispensaries
        </p>
      </div>

      <SearchClient
        listings={listings}
        initialFilters={initialFilters}
        brands={brands}
      />
    </div>
  )
}
