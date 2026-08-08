"use client"

import { useEffect, useId, useRef, useState } from "react"
import { SlidersHorizontal, ChevronDown, X } from "lucide-react"
import { FilterSheet } from "@/components/filters/filter-sheet"
import { FilterRadio, OnSaleToggle } from "@/components/filters/filter-controls"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  SORT_OPTIONS as ALL_SORT_OPTIONS,
  sortLabel,
  type SortValue,
} from "@/lib/sort"
import { cn } from "@/lib/utils"
import { CategoryIcon } from "@/components/ui/category-icon"
import type { ProductFilters, Dispensary } from "@/lib/types"

/** /search groups by brand when there's no keyword, so that's its resting sort. */
const DEFAULT_SORT: SortValue = "brand-asc"

// The canonical vocabulary (@/lib/sort), narrowed to what /search can actually
// round-trip. Filters live in the URL here, and parseSearchQuery's VALID_SORTS
// (src/lib/search-params.ts) doesn't know these — they would bounce back to
// brand-asc on the next navigation, silently undoing the shopper's choice.
// searchListings can't honour them either: it orders in PostgREST, which has no
// discount column and no price/weight_grams expression to sort on, so an
// unrecognised sort falls through to brand-asc and returns alphabetical results
// under a label promising something else. Both stay on the client-sorted grids
// (/category, /brand, /deals, /drops) until the server can express them.
const UNROUNDTRIPPABLE_SORTS = new Set<SortValue>([
  "discount-desc",
  "unit-price-asc",
])
const SORT_OPTIONS = ALL_SORT_OPTIONS.filter(
  (o) => !UNROUNDTRIPPABLE_SORTS.has(o.value)
)

type DropdownName = "brand" | "dispensary" | "sort"
type OpenDropdown = DropdownName | null

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
  const panelId = useId()
  const triggerRefs = useRef<Record<DropdownName, HTMLButtonElement | null>>({
    brand: null,
    dispensary: null,
    sort: null,
  })

  const toggle = (name: OpenDropdown) =>
    setOpenDropdown((prev) => (prev === name ? null : name))

  // Dismissal used to be the invisible full-screen backdrop only — mouse-only,
  // so a keyboard user was trapped under it. Escape closes the panel and hands
  // focus back to the trigger that opened it. Bound on the document because
  // focus can be anywhere inside (the brand panel's autofocused search box, an
  // option, or the trigger itself).
  useEffect(() => {
    if (!openDropdown) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setOpenDropdown(null)
      triggerRefs.current[openDropdown]?.focus()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [openDropdown])

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

  // `sort` is excluded: parseSearchQuery always resolves it (to brand-asc), so
  // counting it lit the badge "1" on a page with nothing applied and made it
  // mean nothing. Sort isn't a narrowing filter and has its own labelled
  // control on both the desktop row and the sheet.
  const activeCount = Object.entries(filters).filter(
    ([key, v]) => key !== "sort" && v != null && v !== "" && v !== false
  ).length

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

      <Separator />

      {/* Brand — the shared Input primitive, same control as the grid
          sheet's brand search (16px base so iOS doesn't zoom on focus). */}
      <FilterSection title="Brand">
        <Input
          placeholder="Search brands..."
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="h-11"
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

      <Separator />

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

      <Separator />

      {/* Sort */}
      <FilterSection title="Sort">
        {SORT_OPTIONS.map((opt) => (
          <FilterRadio
            key={opt.value}
            name="sort-mobile"
            checked={(filters.sort ?? DEFAULT_SORT) === opt.value}
            onChange={() => onFilterChange("sort", opt.value)}
            label={opt.label}
          />
        ))}
      </FilterSection>

      <Separator />

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
                ref={(el) => {
                  triggerRefs.current.brand = el
                }}
                onClick={() => toggle("brand")}
                // No aria-haspopup at all: what opens is a role="group" of
                // toggle buttons. "listbox" would promise options that don't
                // exist, and bare "true" is an alias for "menu", which promises
                // menuitems and arrow-key navigation that aren't there either.
                // aria-expanded + aria-controls is the disclosure pattern, and
                // it describes this accurately.
                aria-expanded={openDropdown === "brand"}
                aria-controls={
                  openDropdown === "brand" ? `${panelId}-brand` : undefined
                }
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
              ref={(el) => {
                triggerRefs.current.brand = el
              }}
              onClick={() => toggle("brand")}
              aria-expanded={openDropdown === "brand"}
              aria-controls={
                openDropdown === "brand" ? `${panelId}-brand` : undefined
              }
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm rounded-lg border bg-card border-border text-foreground hover:bg-muted transition-colors"
            >
              {`All Brands (${brands.length})`}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          {openDropdown === "brand" && (
            <div
              id={`${panelId}-brand`}
              role="group"
              aria-label="Brand"
              className="absolute top-full left-0 mt-1 z-50 w-56 bg-popover border border-border rounded-xl shadow-lg p-2"
            >
              <input
                type="text"
                placeholder="Search brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                // muted-foreground/70, not --border: this hand-rolled twin of
                // the sheet's Input had the same near-invisible boundary
                // (--border is 1.41:1 on --popover, under 1.4.11's 3:1) and a
                // placeholder for its only label.
                className="w-full h-8 px-3 text-sm rounded-lg bg-muted border border-muted-foreground/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary mb-2"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredBrands.map((brand) => (
                  <button
                    key={brand}
                    // Each row is a real toggle (re-picking the active brand
                    // clears it), so aria-pressed carries the same state the
                    // primary fill shows — without it the applied brand was
                    // indistinguishable from the rest.
                    aria-pressed={filters.brand === brand}
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
                ref={(el) => {
                  triggerRefs.current.dispensary = el
                }}
                onClick={() => toggle("dispensary")}
                aria-expanded={openDropdown === "dispensary"}
                aria-controls={
                  openDropdown === "dispensary"
                    ? `${panelId}-dispensary`
                    : undefined
                }
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
              ref={(el) => {
                triggerRefs.current.dispensary = el
              }}
              onClick={() => toggle("dispensary")}
              aria-expanded={openDropdown === "dispensary"}
              aria-controls={
                openDropdown === "dispensary"
                  ? `${panelId}-dispensary`
                  : undefined
              }
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm rounded-lg border bg-card border-border text-foreground hover:bg-muted transition-colors"
            >
              {`All Dispensaries (${dispensaries.length})`}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          {openDropdown === "dispensary" && (
            <div
              id={`${panelId}-dispensary`}
              role="group"
              aria-label="Dispensary"
              className="absolute top-full left-0 mt-1 z-50 w-52 bg-popover border border-border rounded-xl shadow-lg p-2"
            >
              {dispensaries.map((d) => (
                <button
                  key={d.slug}
                  aria-pressed={filters.dispensary === d.slug}
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
            ref={(el) => {
              triggerRefs.current.sort = el
            }}
            onClick={() => toggle("sort")}
            // The sort trigger announced nothing at all — no popup, no state,
            // and no hint of what it controls: unlike its neighbours it shows
            // only the value, so "Brand: A to Z" read as a second brand
            // filter. The visible text stays inside the name (WCAG 2.5.3).
            aria-label={`Sort by: ${sortLabel(filters.sort, DEFAULT_SORT)}`}
            aria-expanded={openDropdown === "sort"}
            aria-controls={
              openDropdown === "sort" ? `${panelId}-sort` : undefined
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            {sortLabel(filters.sort, DEFAULT_SORT)}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {openDropdown === "sort" && (
            <div
              id={`${panelId}-sort`}
              role="group"
              aria-label="Sort"
              className="absolute top-full right-0 mt-1 z-50 w-44 bg-popover border border-border rounded-xl shadow-lg p-2"
            >
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  aria-pressed={(filters.sort ?? DEFAULT_SORT) === opt.value}
                  onClick={() => {
                    onFilterChange("sort", opt.value)
                    setOpenDropdown(null)
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                    (filters.sort ?? DEFAULT_SORT) === opt.value
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
          resultCount={resultCount}
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
      {/* overscroll-x-contain: without it, swiping right on a rail already at
          scrollLeft 0 chains to the document and fires the browser's back
          gesture, throwing the shopper off the page mid-browse. */}
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hidden -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-1">
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
      <CategoryIcon category={category} />
      {label}
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
      {/* Same label treatment as ProductFiltersPanel's sections — the two
          hosts share the sheet chrome, so their internals should read as one
          pattern. */}
      <h4 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
