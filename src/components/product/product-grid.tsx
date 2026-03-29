"use client"

import { useState, useMemo, useCallback } from "react"
import type { InventoryListing, ProductFilters } from "@/lib/types"
import { ProductCard } from "./product-card"
import { ProductFiltersPanel } from "./product-filters"
import { ProductSort } from "./product-sort"
import { resolveAlias } from "@/lib/brand-aliases"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal } from "lucide-react"

interface ProductGridProps {
  listings: InventoryListing[]
  initialFilters?: ProductFilters
  showFilters?: boolean
  pageSize?: number
  onCardClick?: (listing: InventoryListing) => void
  dropBadges?: Map<string, { label: string; className: string }>
}

function applyFilters(
  listings: InventoryListing[],
  filters: ProductFilters
): InventoryListing[] {
  let result = listings

  if (filters.category) {
    result = result.filter(
      (l) => l.product.category.toLowerCase() === filters.category!.toLowerCase()
    )
  }

  if (filters.brand) {
    const resolved = resolveAlias(filters.brand) ?? filters.brand
    result = result.filter((l) =>
      l.product.brand_name.toLowerCase().includes(resolved.toLowerCase())
    )
  }

  if (filters.dispensary) {
    result = result.filter((l) => l.dispensary.slug === filters.dispensary)
  }

  if (filters.strainType) {
    result = result.filter(
      (l) =>
        l.product.strain_type?.toLowerCase() ===
        filters.strainType!.toLowerCase()
    )
  }

  if (filters.minPrice != null) {
    result = result.filter((l) => (l.price ?? 0) >= filters.minPrice!)
  }

  if (filters.maxPrice != null) {
    result = result.filter(
      (l) => l.price != null && l.price <= filters.maxPrice!
    )
  }

  if (filters.minThc != null) {
    result = result.filter(
      (l) => (l.thc_percent ?? 0) >= filters.minThc!
    )
  }

  if (filters.onSale) {
    result = result.filter((l) => (l.discount_amount ?? 0) > 0)
  }

  if (filters.search) {
    const term = filters.search.toLowerCase()
    const aliasResolved = resolveAlias(term)
    result = result.filter((l) => {
      const name = l.product.name.toLowerCase()
      const brand = l.product.brand_name.toLowerCase()
      if (aliasResolved) {
        return brand.includes(aliasResolved.toLowerCase()) || name.includes(term)
      }
      return name.includes(term) || brand.includes(term)
    })
  }

  // Sort
  switch (filters.sort) {
    case "price-asc":
      result = [...result].sort(
        (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)
      )
      break
    case "price-desc":
      result = [...result].sort(
        (a, b) => (b.price ?? 0) - (a.price ?? 0)
      )
      break
    case "thc-desc":
      result = [...result].sort(
        (a, b) => (b.thc_percent ?? 0) - (a.thc_percent ?? 0)
      )
      break
    case "name-asc":
      result = [...result].sort((a, b) =>
        a.product.name.localeCompare(b.product.name)
      )
      break
    case "newest":
      result = [...result].sort(
        (a, b) =>
          new Date(b.last_seen_at).getTime() -
          new Date(a.last_seen_at).getTime()
      )
      break
  }

  return result
}

export function ProductGrid({
  listings,
  initialFilters = {},
  showFilters = true,
  pageSize = 50,
  onCardClick,
  dropBadges,
}: ProductGridProps) {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters)
  const [displayCount, setDisplayCount] = useState(pageSize)

  const filtered = useMemo(() => applyFilters(listings, filters), [listings, filters])
  const displayed = filtered.slice(0, displayCount)
  const hasMore = displayCount < filtered.length

  // Extract unique values for filter options
  const categories = useMemo(
    () => [...new Set(listings.map((l) => l.product.category))].sort(),
    [listings]
  )
  const brands = useMemo(
    () => [...new Set(listings.map((l) => l.product.brand_name))].sort(),
    [listings]
  )
  const dispensaries = useMemo(
    () =>
      [...new Map(listings.map((l) => [l.dispensary.slug, l.dispensary])).values()].sort(
        (a, b) => a.name.localeCompare(b.name)
      ),
    [listings]
  )
  const strainTypes = useMemo(
    () =>
      [...new Set(listings.map((l) => l.product.strain_type).filter(Boolean))].sort() as string[],
    [listings]
  )

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
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm text-muted-foreground">
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

            {/* Mobile filter button */}
            {showFilters && (
              <Sheet>
                <SheetTrigger
                  className="lg:hidden inline-flex items-center gap-1.5 px-2.5 h-7 text-[0.8rem] font-medium rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted transition-all"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-[11px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto">
                  <div className="pt-6">{filterPanel}</div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.category && (
              <FilterChip
                label={filters.category}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {displayed.map((listing) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  dropBadge={dropBadges?.get(listing.id)}
                  onClick={() => onCardClick?.(listing)}
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
