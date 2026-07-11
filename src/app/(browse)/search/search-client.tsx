"use client"

import { useState, useMemo, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import type {
  InventoryListing,
  ProductFilters,
  Dispensary,
  SearchQuery,
  SearchPage,
} from "@/lib/types"
import { buildSearchParams } from "@/lib/search-params"
import { FilterBar } from "@/components/search/filter-bar"
import { BrandGroup } from "@/components/search/brand-group"
import { HeroSearch } from "@/components/search/hero-search"
import { ProductCard } from "@/components/product/product-card"
import { resolveAlias } from "@/lib/brand-aliases"

interface SearchClientProps {
  query: SearchQuery
  initialListings: InventoryListing[]
  total: number
  pageSize: number
  brands: string[]
  categories: string[]
  dispensaries: Dispensary[]
}

/**
 * Filters live in the URL: every FilterBar change navigates to a new
 * /search?... and the server returns one page of matching results.
 * "Load more" appends further pages from /api/search client-side.
 */
export function SearchClient({
  query,
  initialListings,
  total,
  pageSize,
  brands,
  categories,
  dispensaries,
}: SearchClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [extraListings, setExtraListings] = useState<InventoryListing[]>([])
  const [nextPage, setNextPage] = useState(2)
  const [exhausted, setExhausted] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Render-time reset when the server delivers a new query (no remount, so
  // FilterBar's sheet/dropdown state survives filter changes).
  const queryKey = JSON.stringify(query)
  const [prevQueryKey, setPrevQueryKey] = useState(queryKey)
  if (prevQueryKey !== queryKey) {
    setPrevQueryKey(queryKey)
    setExtraListings([])
    setNextPage(2)
    setExhausted(false)
  }

  const listings = useMemo(() => {
    // dedupe across page boundaries: cached pages can drift as inventory
    // changes between fills
    const seen = new Set<string>()
    const merged: InventoryListing[] = []
    for (const l of [...initialListings, ...extraListings]) {
      if (seen.has(l.id)) continue
      seen.add(l.id)
      merged.push(l)
    }
    return merged
  }, [initialListings, extraListings])
  const hasMore = !exhausted && listings.length < total

  // FilterBar still works through the ProductFilters shape
  const filters: ProductFilters = useMemo(
    () => ({
      search: query.q,
      category: query.category,
      brand: query.brand,
      dispensary: query.dispensary,
      onSale: query.onSale,
      sort: query.sort,
    }),
    [query]
  )

  const navigate = useCallback(
    (next: SearchQuery) => {
      const qs = buildSearchParams(next).toString()
      startTransition(() => {
        // scroll: false — keep the user's place (and the mobile filter
        // sheet's viewport) while results swap underneath
        router.push(`/search${qs ? `?${qs}` : ""}`, { scroll: false })
      })
    },
    [router]
  )

  const updateFilter = useCallback(
    (key: keyof ProductFilters, value: ProductFilters[keyof ProductFilters]) => {
      const next: SearchQuery = { ...query }
      switch (key) {
        case "search":
          next.q = (value as string) || undefined
          break
        case "category":
          next.category = (value as string) || undefined
          break
        case "brand":
          next.brand = (value as string) || undefined
          break
        case "dispensary":
          next.dispensary = (value as string) || undefined
          break
        case "onSale":
          next.onSale = (value as boolean) || undefined
          break
        case "sort":
          next.sort = (value as SearchQuery["sort"]) || "brand-asc"
          break
      }
      navigate(next)
    },
    [query, navigate]
  )

  const clearFilters = useCallback(() => {
    navigate({ sort: "brand-asc" })
  }, [navigate])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const params = buildSearchParams(query)
      params.set("page", String(nextPage))
      const res = await fetch(`/api/search?${params.toString()}`)
      if (!res.ok) return
      const data: SearchPage = await res.json()
      setExtraListings((prev) => [...prev, ...data.listings])
      setNextPage((p) => p + 1)
      // a short page means the result set shrank since page 1 was cached —
      // stop offering more rather than looping on empty fetches
      if (data.listings.length < pageSize) setExhausted(true)
    } finally {
      setLoadingMore(false)
    }
  }, [query, nextPage, pageSize])

  // Render a flat, scannable grid whenever the visitor has a specific intent:
  // a keyword search ("gummies") or a brand filter. Brand-grouped results are
  // kept only for pure category/dispensary browsing (no keyword), where the
  // grouping reads as merchandising rather than scattering matches across
  // dozens of mostly-single-product sections.
  const isFlatResults = Boolean(query.q) || Boolean(query.brand)

  // Group loaded results by brand, preserving server sort order
  const brandGroups = useMemo(() => {
    const groups = new Map<string, InventoryListing[]>()
    for (const listing of listings) {
      const brand = listing.product.brand_name
      if (!groups.has(brand)) groups.set(brand, [])
      groups.get(brand)!.push(listing)
    }
    return [...groups.entries()].map(([brand, items]) => ({ brand, items }))
  }, [listings])

  // Alias match notice
  const aliasNotice = useMemo(() => {
    if (!query.q) return null
    const resolved = resolveAlias(query.q)
    if (resolved && resolved.toLowerCase() !== query.q.toLowerCase()) {
      return `Showing results for "${resolved}" (matched alias)`
    }
    return null
  }, [query.q])

  const remaining = total - listings.length

  return (
    <div>
      {/* Search bar — keyed on q so the input resets when the query is
          cleared or replaced via navigation */}
      <div className="mb-4">
        <HeroSearch
          key={query.q ?? ""}
          brands={brands}
          initialValue={query.q ?? ""}
          placeholder="Search products, brands, strains..."
          className="max-w-lg"
        />
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        categories={categories}
        brands={brands}
        dispensaries={dispensaries}
        onFilterChange={updateFilter}
        onClear={clearFilters}
        resultCount={total}
      />

      {/* Alias notice */}
      {aliasNotice && (
        <p className="text-sm text-muted-foreground mb-4 italic">{aliasNotice}</p>
      )}

      {/* Results */}
      <div className={isPending ? "opacity-50 transition-opacity" : undefined}>
        {listings.length === 0 ? (
          <EmptyState
            query={query.q}
            onClear={clearFilters}
            categories={categories}
            onCategory={(cat) => navigate({ category: cat, sort: "brand-asc" })}
          />
        ) : isFlatResults ? (
          // Flat grid: keyword search or brand filter — show every match,
          // dense and easy to scan, in the server's sort order.
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
            {listings.map((listing) => (
              <ProductCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          brandGroups.map(({ brand, items }) => (
            <BrandGroup key={brand} brandName={brand} listings={items} />
          ))
        )}

        {hasMore && listings.length > 0 && (
          <div className="flex justify-center py-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2 text-sm font-medium rounded-xl border border-border bg-card hover:bg-muted transition-colors disabled:opacity-50"
            >
              {loadingMore
                ? "Loading..."
                : `Load more (${remaining.toLocaleString()} remaining)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  query,
  onClear,
  categories,
  onCategory,
}: {
  query?: string
  onClear: () => void
  categories: string[]
  onCategory: (cat: string) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-heading text-xl font-bold text-foreground mb-2">
        {query ? `No products match "${query}"` : "No products match your filters"}
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        Try a different search or browse by category
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {categories.slice(0, 6).map((cat) => (
          <button
            key={cat}
            onClick={() => onCategory(cat)}
            className="px-3 py-1.5 text-sm rounded-full border border-border hover:bg-muted transition-colors capitalize"
          >
            {cat}
          </button>
        ))}
      </div>
      <button onClick={onClear} className="text-sm text-primary hover:underline">
        Clear all filters
      </button>
    </div>
  )
}
