"use client"

import { useState } from "react"
import { SlidersHorizontal, ChevronDown, X } from "lucide-react"
import { FilterSheet } from "@/components/filters/filter-sheet"
import { FilterRadio, OnSaleToggle } from "@/components/filters/filter-controls"
import { cn, getCategoryIcon } from "@/lib/utils"
import type { ProductFilters, Dispensary } from "@/lib/types"

const SORT_OPTIONS: { value: NonNullable<ProductFilters["sort"]>; label: string }[] = [
  { value: "brand-asc", label: "Brand A–Z" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "thc-desc", label: "THC: Highest" },
  { value: "newest", label: "Newest" },
]

type OpenDropdown = "brand" | "dispensary" | "sort" | null

interface FilterBarProps {
  filters: ProductFilters
  categories: string[]
  brands: string[]
  dispensaries: Dispensary[]
  onFilterChange: (key: keyof ProductFilters, value: ProductFilters[keyof ProductFilters]) => void
  onClear: () => void
  resultCount: number
}

export function FilterBar({
  filters,
  categories,
  brands,
  dispensaries,
  onFilterChange,
  onClear,
  resultCount,
}: FilterBarProps) {
  const [brandSearch, setBrandSearch] = useState("")
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null)

  const toggle = (name: OpenDropdown) =>
    setOpenDropdown((prev) => (prev === name ? null : name))

  // The list may be narrowed to the active category/dispensary scope — keep
  // the selected brand in it regardless, so it can be seen and unchecked.
  const brandOptions =
    filters.brand && !brands.includes(filters.brand)
      ? [...brands, filters.brand].sort()
      : brands

  const filteredBrands = brandSearch
    ? brandOptions.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase())
      )
    : brandOptions

  const activeCount = Object.values(filters).filter(
    (v) => v != null && v !== "" && v !== false
  ).length
  const currentSort = SORT_OPTIONS.find((o) => o.value === filters.sort) ?? SORT_OPTIONS[0]

  const mobileFilters = (
    <div className="space-y-6">
      {/* Category */}
      <FilterSection title="Category">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <CategoryChip
              key={cat}
              category={cat}
              active={filters.category === cat}
              onToggle={() => onFilterChange("category", filters.category === cat ? undefined : cat)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Brand">
        <input
          type="text"
          placeholder="Search brands..."
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="w-full h-11 px-3 text-base rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        <div className="max-h-64 overflow-y-auto overscroll-contain space-y-1 mt-2">
          {filteredBrands.map((brand) => (
            <FilterRadio
              key={brand}
              name="brand-mobile"
              checked={filters.brand === brand}
              onChange={() =>
                onFilterChange("brand", filters.brand === brand ? undefined : brand)
              }
              label={brand}
              labelClassName="truncate"
            />
          ))}
        </div>
      </FilterSection>

      {/* Dispensary */}
      <FilterSection title="Dispensary">
        {dispensaries.map((d) => (
          <FilterRadio
            key={d.slug}
            name="disp-mobile"
            checked={filters.dispensary === d.slug}
            onChange={() =>
              onFilterChange(
                "dispensary",
                filters.dispensary === d.slug ? undefined : d.slug
              )
            }
            label={d.name}
          />
        ))}
      </FilterSection>

      {/* Sort */}
      <FilterSection title="Sort">
        {SORT_OPTIONS.map((opt) => (
          <FilterRadio
            key={opt.value}
            name="sort-mobile"
            checked={(filters.sort ?? "brand-asc") === opt.value}
            onChange={() => onFilterChange("sort", opt.value)}
            label={opt.label}
          />
        ))}
      </FilterSection>

      {/* On Sale */}
      <OnSaleToggle
        checked={!!filters.onSale}
        onChange={() => onFilterChange("onSale", !filters.onSale || undefined)}
      />

      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="inline-flex min-h-11 items-center text-sm text-primary hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-3 mb-4">
      {/* Backdrop to close dropdowns */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}

      {/* Row 1: result count + dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground mr-auto">
          <span className="font-medium text-foreground">
            {resultCount.toLocaleString()}
          </span>{" "}
          products
        </p>

        {/* Brand dropdown */}
        <div className="relative z-50 hidden md:block">
          {filters.brand ? (
            // Active: two distinct, keyboard-reachable controls — open to
            // change the brand, or clear it — instead of a clickable icon
            // nested inside a button (invalid + unreachable by keyboard).
            <div className="inline-flex items-stretch h-8 rounded-lg border border-primary bg-primary text-primary-foreground overflow-hidden">
              <button
                onClick={() => toggle("brand")}
                aria-haspopup="listbox"
                aria-expanded={openDropdown === "brand"}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 text-sm hover:bg-primary/90 transition-colors"
              >
                {filters.brand}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  onFilterChange("brand", undefined)
                  setOpenDropdown(null)
                }}
                aria-label={`Clear brand filter: ${filters.brand}`}
                className="inline-flex items-center px-2 border-l border-primary-foreground/30 hover:bg-primary/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => toggle("brand")}
              aria-haspopup="listbox"
              aria-expanded={openDropdown === "brand"}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm rounded-lg border bg-card border-border text-foreground hover:bg-muted transition-colors"
            >
              {`All Brands (${brands.length})`}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          {openDropdown === "brand" && (
            <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-popover border border-border rounded-xl shadow-lg p-2">
              <input
                type="text"
                placeholder="Search brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full h-8 px-3 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary mb-2"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => {
                      onFilterChange(
                        "brand",
                        filters.brand === brand ? undefined : brand
                      )
                      setOpenDropdown(null)
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm rounded transition-colors truncate",
                      filters.brand === brand
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dispensary dropdown */}
        <div className="relative z-50 hidden md:block">
          {filters.dispensary ? (
            <div className="inline-flex items-stretch h-8 rounded-lg border border-primary bg-primary text-primary-foreground overflow-hidden">
              <button
                onClick={() => toggle("dispensary")}
                aria-haspopup="listbox"
                aria-expanded={openDropdown === "dispensary"}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 text-sm hover:bg-primary/90 transition-colors"
              >
                {dispensaries.find((d) => d.slug === filters.dispensary)?.name ??
                  filters.dispensary}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  onFilterChange("dispensary", undefined)
                  setOpenDropdown(null)
                }}
                aria-label="Clear dispensary filter"
                className="inline-flex items-center px-2 border-l border-primary-foreground/30 hover:bg-primary/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => toggle("dispensary")}
              aria-haspopup="listbox"
              aria-expanded={openDropdown === "dispensary"}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm rounded-lg border bg-card border-border text-foreground hover:bg-muted transition-colors"
            >
              {`All Dispensaries (${dispensaries.length})`}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          {openDropdown === "dispensary" && (
            <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-popover border border-border rounded-xl shadow-lg p-2">
              {dispensaries.map((d) => (
                <button
                  key={d.slug}
                  onClick={() => {
                    onFilterChange(
                      "dispensary",
                      filters.dispensary === d.slug ? undefined : d.slug
                    )
                    setOpenDropdown(null)
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                    filters.dispensary === d.slug
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative z-50 hidden md:block">
          <button
            onClick={() => toggle("sort")}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            {currentSort.label}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {openDropdown === "sort" && (
            <div className="absolute top-full right-0 mt-1 z-50 w-44 bg-popover border border-border rounded-xl shadow-lg p-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onFilterChange("sort", opt.value)
                    setOpenDropdown(null)
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                    (filters.sort ?? "brand-asc") === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* On Sale — desktop */}
        <button
          aria-pressed={!!filters.onSale}
          onClick={() => onFilterChange("onSale", !filters.onSale || undefined)}
          className={cn(
            "hidden md:inline-flex items-center h-8 px-3 text-sm rounded-lg border transition-colors",
            filters.onSale
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-foreground hover:bg-muted"
          )}
        >
          On Sale
        </button>

        {/* Mobile filter sheet — shared FilterSheet chrome (handle, aligned
            header, swipe-to-dismiss), same as the grid pages. */}
        <FilterSheet
          triggerClassName="md:hidden inline-flex items-center gap-1.5 h-11 px-3 text-sm rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
          trigger={
            <>
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-[11px] flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </>
          }
        >
          {mobileFilters}
        </FilterSheet>
      </div>

      {/* Row 2: Category chips + on sale chip */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hidden -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-1">
        {categories.map((cat) => (
          <CategoryChip
            key={cat}
            category={cat}
            active={filters.category === cat}
            onToggle={() =>
              onFilterChange("category", filters.category === cat ? undefined : cat)
            }
          />
        ))}
        <button
          aria-pressed={!!filters.onSale}
          onClick={() => onFilterChange("onSale", !filters.onSale || undefined)}
          className={cn(
            "md:hidden shrink-0 inline-flex items-center gap-1.5 h-11 px-3 text-sm rounded-full border transition-colors",
            filters.onSale
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-foreground hover:bg-muted"
          )}
        >
          On Sale
        </button>
      </div>
    </div>
  )
}

function CategoryChip({
  category,
  active,
  onToggle,
}: {
  category: string
  active: boolean
  onToggle: () => void
}) {
  const label = category.charAt(0).toUpperCase() + category.slice(1)
  return (
    <button
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-11 md:h-8 px-3 text-sm rounded-full border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-foreground hover:bg-muted"
      )}
    >
      <span aria-hidden="true">{getCategoryIcon(category)}</span> {label}
    </button>
  )
}

function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
