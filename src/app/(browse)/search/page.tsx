import {
  searchListings,
  getBrandNames,
  getCategories,
} from "@/lib/queries/products"
import { getDispensaries } from "@/lib/queries/dispensaries"
import { parseSearchQuery } from "@/lib/search-params"
import { SearchClient } from "./search-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search cannabis products across all Rhode Island dispensaries. Filter by brand, category, strain, price, and more.",
  alternates: { canonical: "/search" },
  // Parameterized results (infinite brand/category/price combinations) — let
  // crawlers follow links out but don't index the result permutations.
  robots: { index: false, follow: true },
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
  const query = parseSearchQuery(params)

  // Filtering, sorting, and pagination happen in Postgres — only the first
  // page of results is rendered and serialized. Load-more goes through
  // /api/search with the same query shape. Each fetch degrades softly for
  // this one request on transient errors (the caches throw rather than
  // store degraded values).
  const [page, brands, categories, dispensaries] = await Promise.all([
    searchListings(query, 1).catch((e) => {
      console.error(e)
      return { listings: [], total: 0, pageSize: 96 }
    }),
    getBrandNames().catch(() => [] as string[]),
    getCategories().catch(() => [] as string[]),
    getDispensaries().catch(() => []),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {query.q ? `Results for "${query.q}"` : query.brand ? query.brand : "Browse Menu"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {page.total.toLocaleString()} products across Rhode Island dispensaries
        </p>
      </div>

      {/* No remount key: FilterBar UI state (mobile sheet open, brand search
          text) must survive filter navigations. SearchClient resets its own
          pagination state when the query changes. */}
      <SearchClient
        query={query}
        initialListings={page.listings}
        total={page.total}
        pageSize={page.pageSize}
        brands={brands}
        categories={categories}
        dispensaries={dispensaries}
      />
    </div>
  )
}
