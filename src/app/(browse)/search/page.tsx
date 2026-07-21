import {
  searchListings,
  getBrandNames,
  getBrandNamesFor,
  getCategories,
} from "@/lib/queries/products"
import { getDispensaries } from "@/lib/queries/dispensaries"
import { parseSearchQuery } from "@/lib/search-params"
import { SearchClient } from "./search-client"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
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
  const [page, brands, brandOptions, categories, dispensaries] =
    await Promise.all([
      searchListings(query, 1).catch((e) => {
        console.error(e)
        return { listings: [], total: 0, pageSize: 96 }
      }),
      // Full brand list (autocomplete seed) and the facet list narrowed to
      // the active category/dispensary — both read the same cached index.
      getBrandNames().catch(() => [] as string[]),
      getBrandNamesFor({
        category: query.category,
        dispensary: query.dispensary,
      }).catch(() => [] as string[]),
      getCategories().catch(() => [] as string[]),
      getDispensaries().catch(() => []),
    ])

  return (
    <PageContainer className="py-6 md:py-8">
      <PageHeading
        title={
          query.q ? `Results for "${query.q}"` : query.brand ? query.brand : "Browse Menu"
        }
        description={`${page.total.toLocaleString()} products across Rhode Island dispensaries`}
      />

      {/* No remount key: FilterBar UI state (mobile sheet open, brand search
          text) must survive filter navigations. SearchClient resets its own
          pagination state when the query changes. */}
      <SearchClient
        query={query}
        initialListings={page.listings}
        total={page.total}
        pageSize={page.pageSize}
        brands={brands}
        brandOptions={brandOptions}
        categories={categories}
        dispensaries={dispensaries}
      />
    </PageContainer>
  )
}
