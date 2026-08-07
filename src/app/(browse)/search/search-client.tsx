"use client"

import { useState, useMemo, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CloudOff } from "lucide-react"
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
import { EAGER_IMAGE_COUNT } from "@/lib/image-priority"
import { resolveAlias } from "@/lib/brand-aliases"

interface SearchClientProps {
  query: SearchQuery
  initialListings: InventoryListing[]
  total: number
  pageSize: number
  /** The results query failed on the server. `initialListings`/`total` are
   *  placeholders, NOT a real zero-result — never render them as one. */
  degraded: boolean
  /** Full brand list — seeds the search box's instant suggestions. */
  brands: string[]
  /** Brand facet narrowed to the active category/dispensary scope. */
  brandOptions: string[]
  categories: string[]
  /** Curated, landing-page-backed categories for the no-results recovery
   *  chips (HOMEPAGE_CATEGORIES — server-only module, so it arrives as a prop). */
  browseCategories: readonly { key: string; label: string }[]
  dispensaries: Dispensary[]
  /** True per-brand listing counts under the active filters, keyed by brand.
   *  Server-derived from the cached catalog index — the loaded page can't be
   *  counted for this, it only holds 96 rows. */
  brandCounts: Record<string, number>
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
  degraded,
  brands,
  brandOptions,
  categories,
  browseCategories,
  dispensaries,
  brandCounts,
}: SearchClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [extraListings, setExtraListings] = useState<InventoryListing[]>([])
  const [nextPage, setNextPage] = useState(2)
  const [exhausted, setExhausted] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)

  // Render-time reset when the server delivers a new query (no remount, so
  // FilterBar's sheet/dropdown state survives filter changes).
  const queryKey = JSON.stringify(query)
  const [prevQueryKey, setPrevQueryKey] = useState(queryKey)
  if (prevQueryKey !== queryKey) {
    setPrevQueryKey(queryKey)
    setExtraListings([])
    setNextPage(2)
    setExhausted(false)
    setLoadMoreError(false)
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
    setLoadMoreError(false)
    try {
      const params = buildSearchParams(query)
      params.set("page", String(nextPage))
      const res = await fetch(`/api/search?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: SearchPage = await res.json()
      setExtraListings((prev) => [...prev, ...data.listings])
      setNextPage((p) => p + 1)
      // a short page means the result set shrank since page 1 was cached —
      // stop offering more rather than looping on empty fetches
      if (data.listings.length < pageSize) setExhausted(true)
    } catch {
      // /api/search answers 503 with an empty page on any query failure, so
      // swallowing this looked exactly like "nothing loaded": the label went
      // Load more → Loading… → Load more and the shopper concluded the
      // remaining count was a lie. Say it failed and offer the retry.
      setLoadMoreError(true)
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

  // Anything beyond the default sort — the degraded state only offers
  // "Clear filters" when there is actually something to clear.
  const hasFilters = Boolean(
    query.q || query.category || query.brand || query.dispensary || query.onSale
  )

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

      {/* Filter bar. Hidden when the results query failed: it leads with
          "{resultCount} products", and a hard-coded 0 next to "we couldn't
          reach the data" is the same falsehood in a smaller font. There is
          nothing to filter either — the degraded state offers Clear filters
          itself. */}
      {!degraded && (
        <FilterBar
          filters={filters}
          categories={categories}
          brands={brandOptions}
          dispensaries={dispensaries}
          onFilterChange={updateFilter}
          onClear={clearFilters}
          resultCount={total}
        />
      )}

      {/* Alias notice */}
      {aliasNotice && (
        <p className="text-sm text-muted-foreground mb-4 italic">{aliasNotice}</p>
      )}

      {/* Results */}
      <div className={isPending ? "opacity-50 transition-opacity" : undefined}>
        {degraded ? (
          // The query failed — say so. Anything else here (an empty grid, "no
          // products match") would state a falsehood about the catalog.
          <DegradedState
            hasFilters={hasFilters}
            onRetry={() => router.refresh()}
            onClear={clearFilters}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            query={query.q}
            onClear={clearFilters}
            categories={browseCategories}
            onCategory={(cat) => navigate({ category: cat, sort: "brand-asc" })}
          />
        ) : (
          <>
            {/* The cards render their own H3s, so without this the page went
                H1 → H3 and screen-reader heading navigation skipped a level
                (same fix MenuClient uses over ProductGrid). */}
            <h2 className="sr-only">Search results</h2>
            {isFlatResults ? (
              // Flat grid: keyword search or brand filter — show every match,
              // dense and easy to scan, in the server's sort order.
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
                {listings.map((listing, index) => (
                  <ProductCard
                    key={listing.id}
                    listing={listing}
                    eager={index < EAGER_IMAGE_COUNT}
                  />
                ))}
              </div>
            ) : (
              brandGroups.map(({ brand, items }, groupIndex) => (
                <BrandGroup
                  key={brand}
                  brandName={brand}
                  listings={items}
                  totalCount={brandCounts?.[brand]}
                  // Keep the active filters and add the brand, so "View all 36"
                  // under a Concentrate filter lands on that brand's 36
                  // concentrates — not on all 265 of their products.
                  href={`/search?${buildSearchParams({ ...query, brand }).toString()}`}
                  eager={groupIndex === 0}
                />
              ))
            )}
          </>
        )}

        {hasMore && listings.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-6">
            {loadMoreError && (
              <p className="text-sm text-muted-foreground" role="status">
                Couldn&apos;t load more results.
              </p>
            )}
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2 text-sm font-medium rounded-xl border border-border bg-card hover:bg-muted transition-colors disabled:opacity-50"
            >
              {loadingMore
                ? "Loading..."
                : loadMoreError
                  ? "Retry"
                  : `Load more (${remaining.toLocaleString()} remaining)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Shown when the results query itself failed. Deliberately says nothing about
 * what the catalog does or doesn't contain — during an outage the one thing we
 * know is that we couldn't look.
 */
function DegradedState({
  hasFilters,
  onRetry,
  onClear,
}: {
  hasFilters: boolean
  onRetry: () => void
  onClear: () => void
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      role="status"
    >
      <CloudOff
        className="w-10 h-10 text-muted-foreground mb-4"
        aria-hidden="true"
      />
      <p className="font-heading text-xl font-bold text-foreground mb-2">
        We couldn&apos;t reach our menu data just now
      </p>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Your search is fine — our end is having a moment. Try again and it
        should come right back.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center justify-center h-11 sm:h-10 px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Clear all filters
        </button>
      )}
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
  categories: readonly { key: string; label: string }[]
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
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onCategory(cat.key)}
            // Same 44px-on-mobile chip as FilterBar's category row — this is
            // the one screen where every tap has to land first time.
            className="inline-flex items-center h-11 md:h-8 px-3 text-sm rounded-full border border-border hover:bg-muted transition-colors"
          >
            {cat.label}
          </button>
        ))}
      </div>
      <button onClick={onClear} className="text-sm text-primary hover:underline">
        Clear all filters
      </button>
    </div>
  )
}
