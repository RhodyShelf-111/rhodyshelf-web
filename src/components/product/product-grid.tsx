"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import type { InventoryListing, ProductFilters } from "@/lib/types"
import { ProductCard, EAGER_IMAGE_COUNT } from "./product-card"
import { ProductFiltersPanel } from "./product-filters"
import { ProductSort } from "./product-sort"
import { applyFilters, deriveFacetOptions } from "@/lib/filter-utils"
import { FilterSheet } from "@/components/filters/filter-sheet"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal } from "lucide-react"

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
}

export function ProductGrid({
  listings,
  initialFilters = {},
  showFilters = true,
  pageSize = 50,
  dropBadges,
  showDispensary = true,
  onFiltersChange,
}: ProductGridProps) {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters)
  const [displayCount, setDisplayCount] = useState(pageSize)

  // Mirror filter state up — but never the untouched initial state (reference
  // check): on first mount MenuClient hasn't read the URL params yet, and a
  // mount-time report would overwrite them with the empty defaults. Also
  // holds across StrictMode re-runs and the host's remount-by-key.
  useEffect(() => {
    if (filters === initialFilters) return
    onFiltersChange?.(filters)
  }, [filters, initialFilters, onFiltersChange])

  const filtered = useMemo(() => applyFilters(listings, filters), [listings, filters])
  const displayed = filtered.slice(0, displayCount)
  const hasMore = displayCount < filtered.length

  // Filter options narrow to the listings matching the OTHER active filters
  // (faceted): pick a dispensary and the brand list only shows brands it
  // stocks. Section visibility keys off the page's full listing set so a
  // narrowed one-option list doesn't make its whole section vanish.
  const facets = useMemo(
    () => deriveFacetOptions(listings, filters),
    [listings, filters]
  )
  const pageFacets = useMemo(() => deriveFacetOptions(listings, {}), [listings])
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
              {Math.min(displayCount, filtered.length)}
            </span>{" "}
            of {filtered.length} products
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
                resultCount={filtered.length}
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

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() =>
                    setDisplayCount((prev) => prev + pageSize)
                  }
                >
                  Load more ({filtered.length - displayCount} remaining)
                </Button>
              </div>
            )}
          </>
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
