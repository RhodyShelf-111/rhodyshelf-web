"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import type { InventoryListing, ProductFilters } from "@/lib/types"
import { ProductCard, EAGER_IMAGE_COUNT } from "./product-card"
import { ProductFiltersPanel } from "./product-filters"
import { ProductSort } from "./product-sort"
import { applyFilters, deriveFacetOptions } from "@/lib/filter-utils"
import { FilterSheet } from "@/components/filters/filter-sheet"
import { Button } from "@/components/ui/button"
import { Loader2, SlidersHorizontal } from "lucide-react"

interface ProductGridProps {
  listings: InventoryListing[]
  initialFilters?: ProductFilters
  showFilters?: boolean
  pageSize?: number
  dropBadges?: Map<string, { label: string; className: string }>
  /** Forwarded to each ProductCard; false on single-dispensary pages. */
  showDispensary?: boolean
  /**
   * Reports the filters after every user change (never for the initial
   * state), so a host can mirror them elsewhere — MenuClient writes them
   * into the URL.
   */
  onFiltersChange?: (filters: ProductFilters) => void
  /**
   * Progressive loading. When set, `listings` is only the server-rendered first
   * slice of a larger set; the grid fetches the whole set once from
   * /api/listings (a single cached snapshot) and swaps it in, so the initial
   * payload — and first paint on cellular — stays small while client-side
   * filtering stays complete. `total` is the server's count (a display estimate
   * while loading); `scope`/`value` identify what to fetch. Omit it and the
   * grid behaves exactly as before (all listings up front).
   */
  loadRest?: { total: number; scope: "category" | "dispensary"; value: string }
}

export function ProductGrid({
  listings,
  initialFilters = {},
  showFilters = true,
  pageSize = 50,
  dropBadges,
  showDispensary = true,
  onFiltersChange,
  loadRest,
}: ProductGridProps) {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters)
  const [displayCount, setDisplayCount] = useState(pageSize)
  // Pages fetched in the background for a progressive list (see loadRest).
  const [rest, setRest] = useState<InventoryListing[]>([])
  const [loadingRest, setLoadingRest] = useState(false)

  // Mirror filter state up — but never the untouched initial state (reference
  // check): on first mount MenuClient hasn't read the URL params yet, and a
  // mount-time report would overwrite them with the empty defaults. Also
  // holds across StrictMode re-runs and the host's remount-by-key.
  useEffect(() => {
    if (filters === initialFilters) return
    onFiltersChange?.(filters)
  }, [filters, initialFilters, onFiltersChange])

  // Fetch the WHOLE category/dispensary set once from /api/listings — a single
  // cached snapshot — so client-side filtering has a complete, self-consistent
  // list. `listings` (the server-rendered first slice) is only for instant
  // paint; once the full set arrives it replaces that slice. Fetching in one
  // request (not page-by-page across cache generations) is what keeps this
  // gap-free: offset pagination over independently-cached pages can silently
  // drop rows after an inventory sync. `restTotal` is a display estimate only,
  // never a loop bound. Primitive deps so a fresh loadRest object per render
  // can't restart the fetch.
  const restTotal = loadRest?.total
  const restScope = loadRest?.scope
  const restValue = loadRest?.value
  useEffect(() => {
    if (!restScope || !restValue) return
    const controller = new AbortController()
    let cancelled = false
    setLoadingRest(true)
    ;(async () => {
      const url = `/api/listings?scope=${restScope}&value=${encodeURIComponent(
        restValue
      )}`
      // Retry a transient failure a couple of times before giving up — this
      // page exists for slow/flaky cellular, where one dropped request must
      // not leave a silently truncated menu.
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const res = await fetch(url, { signal: controller.signal })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = (await res.json()) as { listings: InventoryListing[] }
          if (cancelled) return
          if (data.listings?.length) setRest(data.listings)
          break // success (or a legitimately empty set)
        } catch (err) {
          if (cancelled || (err as Error)?.name === "AbortError") return
          if (attempt === 2) break // exhausted retries — keep the first slice
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
        }
      }
      if (!cancelled) setLoadingRest(false)
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [restScope, restValue])

  // Once the full set has loaded it IS the working set (one consistent
  // snapshot that supersets the slice); before that, the server-rendered first
  // slice. No merge/dedup needed — the fetched set is authoritative.
  const allListings = rest.length > 0 ? rest : listings

  const filtered = useMemo(
    () => applyFilters(allListings, filters),
    [allListings, filters]
  )
  const displayed = filtered.slice(0, displayCount)
  const hasMore = displayCount < filtered.length

  // Filter options narrow to the listings matching the OTHER active filters
  // (faceted): pick a dispensary and the brand list only shows brands it
  // stocks. Section visibility keys off the page's full listing set so a
  // narrowed one-option list doesn't make its whole section vanish.
  const facets = useMemo(
    () => deriveFacetOptions(allListings, filters),
    [allListings, filters]
  )
  const pageFacets = useMemo(
    () => deriveFacetOptions(allListings, {}),
    [allListings]
  )
  const { categories, brands, dispensaries, strainTypes } = facets

  const updateFilter = useCallback(
    (key: keyof ProductFilters, value: ProductFilters[keyof ProductFilters]) => {
      setFilters((prev) => ({ ...prev, [key]: value || undefined }))
      setDisplayCount(pageSize)
    },
    [pageSize]
  )

  const clearFilters = useCallback(() => {
    setFilters({})
    setDisplayCount(pageSize)
  }, [pageSize])

  const activeFilterCount = Object.values(filters).filter(
    (v) => v != null && v !== "" && v !== false
  ).length

  // While the full set is still loading, show the server's count as a stable
  // estimate (so the denominator doesn't sit at the slice size). Once the load
  // finishes — or fails and we're on the partial slice — show the actual
  // count, so "Showing X of Y" never claims more than is really on screen.
  const resultTotal =
    activeFilterCount === 0 && loadingRest && restTotal != null
      ? restTotal
      : filtered.length

  const filterPanel = (
    <ProductFiltersPanel
      filters={filters}
      categories={categories}
      brands={brands}
      dispensaries={dispensaries}
      strainTypes={strainTypes}
      visibleSections={{
        category: pageFacets.categories.length > 1,
        brand: pageFacets.brands.length > 1,
        dispensary: pageFacets.dispensaries.length > 1,
      }}
      onFilterChange={updateFilter}
      onClear={clearFilters}
    />
  )

  return (
    <div className="flex gap-6">
      {/* Desktop filter sidebar */}
      {showFilters && (
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          {filterPanel}
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar: count + sort + mobile filter button */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            Showing{" "}
            <span className="font-medium text-foreground">
              {Math.min(displayCount, filtered.length).toLocaleString()}
            </span>{" "}
            of {resultTotal.toLocaleString()} products
          </p>

          <div className="flex items-center gap-2">
            <ProductSort
              value={filters.sort}
              onChange={(sort) => updateFilter("sort", sort)}
            />

            {/* Mobile filter button — FilterSheet is the one bottom-sheet
                chrome (handle, aligned header, swipe-to-dismiss) shared with
                the search page. */}
            {showFilters && (
              <FilterSheet
                resultCount={resultTotal}
                triggerClassName="lg:hidden inline-flex items-center gap-1.5 h-11 px-3 text-sm rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                trigger={
                  <>
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-[11px] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </>
                }
              >
                {filterPanel}
              </FilterSheet>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.category && (
              <FilterChip
                label={
                  filters.category.charAt(0).toUpperCase() +
                  filters.category.slice(1)
                }
                onRemove={() => updateFilter("category", undefined)}
              />
            )}
            {filters.brand && (
              <FilterChip
                label={filters.brand}
                onRemove={() => updateFilter("brand", undefined)}
              />
            )}
            {filters.dispensary && (
              <FilterChip
                label={
                  dispensaries.find((d) => d.slug === filters.dispensary)?.name ??
                  filters.dispensary
                }
                onRemove={() => updateFilter("dispensary", undefined)}
              />
            )}
            {filters.strainType && (
              <FilterChip
                label={filters.strainType}
                onRemove={() => updateFilter("strainType", undefined)}
              />
            )}
            {filters.onSale && (
              <FilterChip
                label="On Sale"
                onRemove={() => updateFilter("onSale", undefined)}
              />
            )}
            {filters.search && (
              <FilterChip
                label={`"${filters.search}"`}
                onRemove={() => updateFilter("search", undefined)}
              />
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Product grid */}
        {displayed.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
              {displayed.map((listing, index) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  dropBadge={dropBadges?.get(listing.id)}
                  showDispensary={showDispensary}
                  eager={index < EAGER_IMAGE_COUNT}
                />
              ))}
            </div>

            {loadingRest ? (
              // The rest of the category/dispensary is still streaming in from
              // /api/search — surface it so the shopper knows more (and more
              // filter options) are on the way, and so an in-progress filter
              // that matches nothing loaded yet doesn't read as a dead end.
              <LoadingMore total={restTotal ?? filtered.length} />
            ) : (
              hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayCount((prev) => prev + pageSize)}
                  >
                    Load more (
                    {(filtered.length - displayCount).toLocaleString()} remaining)
                  </Button>
                </div>
              )
            )}
          </>
        ) : loadingRest ? (
          // Nothing matches the loaded rows yet, but more are still arriving —
          // show progress instead of a premature "no products" state.
          <LoadingMore total={restTotal ?? 0} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-foreground mb-2">
              No products match your filters
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Try removing a filter or searching for something else.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingMore({ total }: { total: number }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {total > 0
        ? `Loading all ${total.toLocaleString()} products…`
        : "Loading products…"}
    </div>
  )
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-foreground transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        &times;
      </button>
    </span>
  )
}
