"use client"

import { useState, useMemo, useCallback } from "react"
import type { InventoryListing, ProductFilters, Dispensary } from "@/lib/types"
import { applyFilters } from "@/lib/filter-utils"
import { FilterBar } from "@/components/search/filter-bar"
import { BrandGroup } from "@/components/search/brand-group"
import { HeroSearch } from "@/components/search/hero-search"
import { ProductCard } from "@/components/product/product-card"
import { ProductDetailDrawer } from "@/components/product/product-detail"
import { resolveAlias } from "@/lib/brand-aliases"

const BRAND_GROUP_PAGE_SIZE = 30
const FLAT_GRID_PAGE_SIZE = 60

interface SearchClientProps {
  listings: InventoryListing[]
  initialFilters: ProductFilters
  brands: string[]
}

export function SearchClient({ listings, initialFilters, brands }: SearchClientProps) {
  const [filters, setFilters] = useState<ProductFilters>({
    sort: "brand-asc",
    ...initialFilters,
  })
  const [visibleBrandCount, setVisibleBrandCount] = useState(BRAND_GROUP_PAGE_SIZE)
  const [flatDisplayCount, setFlatDisplayCount] = useState(FLAT_GRID_PAGE_SIZE)
  const [selectedListing, setSelectedListing] = useState<InventoryListing | null>(null)
  const [searchValue, setSearchValue] = useState(initialFilters.search ?? "")

  // Single-brand view: skip brand grouping entirely, render a flat grid.
  const isSingleBrandView = Boolean(filters.brand)

  const filtered = useMemo(() => applyFilters(listings, filters), [listings, filters])

  // Group filtered results by brand, preserving sort order
  const brandGroups = useMemo(() => {
    const groups = new Map<string, InventoryListing[]>()
    for (const listing of filtered) {
      const brand = listing.product.brand_name
      if (!groups.has(brand)) groups.set(brand, [])
      groups.get(brand)!.push(listing)
    }
    // Return as array; order matches the filtered/sorted order
    return [...groups.entries()].map(([brand, items]) => ({ brand, items }))
  }, [filtered])

  const visibleGroups = brandGroups.slice(0, visibleBrandCount)
  const hasMoreBrands = visibleBrandCount < brandGroups.length

  // Extract filter options from listings
  const categories = useMemo(
    () => [...new Set(listings.map((l) => l.product.category))].sort(),
    [listings]
  )
  const dispensaries = useMemo(
    () =>
      [
        ...new Map(
          listings.map((l) => [l.dispensary.slug, l.dispensary])
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)) as Dispensary[],
    [listings]
  )

  const updateFilter = useCallback(
    (key: keyof ProductFilters, value: ProductFilters[keyof ProductFilters]) => {
      setFilters((prev) => ({ ...prev, [key]: value || undefined }))
      setVisibleBrandCount(BRAND_GROUP_PAGE_SIZE)
      setFlatDisplayCount(FLAT_GRID_PAGE_SIZE)
    },
    []
  )

  const clearFilters = useCallback(() => {
    setFilters({ sort: "brand-asc" })
    setSearchValue("")
    setVisibleBrandCount(BRAND_GROUP_PAGE_SIZE)
    setFlatDisplayCount(FLAT_GRID_PAGE_SIZE)
  }, [])

  const handleCardClick = useCallback((listing: InventoryListing) => {
    setSelectedListing(listing)
  }, [])

  // Alias match notice
  const aliasNotice = useMemo(() => {
    if (!filters.search) return null
    const resolved = resolveAlias(filters.search)
    if (resolved && resolved.toLowerCase() !== filters.search.toLowerCase()) {
      return `Showing results for "${resolved}" (matched alias)`
    }
    return null
  }, [filters.search])

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4">
        <HeroSearch
          brands={brands}
          initialValue={searchValue}
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
        resultCount={filtered.length}
      />

      {/* Alias notice */}
      {aliasNotice && (
        <p className="text-sm text-muted-foreground mb-4 italic">{aliasNotice}</p>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState query={filters.search} onClear={clearFilters} categories={categories} onCategory={(cat) => { clearFilters(); updateFilter("category", cat) }} />
      ) : isSingleBrandView ? (
        // Flat grid: user has filtered to a brand, show every product
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.slice(0, flatDisplayCount).map((listing) => (
              <ProductCard
                key={listing.id}
                listing={listing}
                onClick={() => handleCardClick(listing)}
              />
            ))}
          </div>
          {flatDisplayCount < filtered.length && (
            <div className="flex justify-center py-6">
              <button
                onClick={() => setFlatDisplayCount((n) => n + FLAT_GRID_PAGE_SIZE)}
                className="px-6 py-2 text-sm font-medium rounded-xl border border-border bg-card hover:bg-muted transition-colors"
              >
                Load more ({filtered.length - flatDisplayCount} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {visibleGroups.map(({ brand, items }) => (
            <BrandGroup
              key={brand}
              brandName={brand}
              listings={items}
              onCardClick={handleCardClick}
            />
          ))}
          {hasMoreBrands && (
            <div className="flex justify-center py-6">
              <button
                onClick={() => setVisibleBrandCount((n) => n + BRAND_GROUP_PAGE_SIZE)}
                className="px-6 py-2 text-sm font-medium rounded-xl border border-border bg-card hover:bg-muted transition-colors"
              >
                Show more brands ({brandGroups.length - visibleBrandCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      <ProductDetailDrawer
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
      />
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
