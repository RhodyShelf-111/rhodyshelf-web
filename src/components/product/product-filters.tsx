"use client"

import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { FilterRadio, OnSaleToggle } from "@/components/filters/filter-controls"
import type { ProductFilters, Dispensary } from "@/lib/types"
import { useState } from "react"

interface ProductFiltersPanelProps {
  filters: ProductFilters
  categories: string[]
  brands: string[]
  dispensaries: Dispensary[]
  strainTypes: string[]
  onFilterChange: (
    key: keyof ProductFilters,
    value: ProductFilters[keyof ProductFilters]
  ) => void
  onClear: () => void
}

export function ProductFiltersPanel({
  filters,
  categories,
  brands,
  dispensaries,
  strainTypes,
  onFilterChange,
}: ProductFiltersPanelProps) {
  const [brandSearch, setBrandSearch] = useState("")

  const filteredBrands = brandSearch
    ? brands.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase())
      )
    : brands

  return (
    <div className="space-y-6">
      {/* Category — hidden when the listing set is a single category (e.g. a
          /category/[slug] page), where it's a one-option, no-op control. Those
          pages use the CategoryNav chips to switch categories instead. */}
      {categories.length > 1 && (
        <FilterSection title="Category">
          {categories.map((cat) => (
            <FilterRadio
              key={cat}
              name="category"
              checked={filters.category === cat}
              onChange={() =>
                onFilterChange("category", filters.category === cat ? undefined : cat)
              }
              label={cat}
              labelClassName="capitalize"
            />
          ))}
        </FilterSection>
      )}

      {/* Brand — hidden when the listing set is a single brand (e.g. a brand
          page), where filtering by brand is dead UI. */}
      {brands.length > 1 && (
        <>
          {categories.length > 1 && <Separator />}

          <FilterSection title="Brand">
            {/* No text-sm override: the Input's base is text-base (16px) on
                mobile, so iOS won't zoom the viewport on focus. */}
            <Input
              placeholder="Search brands..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="mb-2 h-11"
            />
            <div className="max-h-64 overflow-y-auto overscroll-contain space-y-1">
              {filteredBrands.slice(0, 20).map((brand) => (
                <FilterRadio
                  key={brand}
                  name="brand"
                  checked={filters.brand === brand}
                  onChange={() =>
                    onFilterChange(
                      "brand",
                      filters.brand === brand ? undefined : brand
                    )
                  }
                  label={brand}
                  labelClassName="truncate"
                />
              ))}
            </div>
          </FilterSection>
        </>
      )}

      {/* Dispensary — hidden on single-dispensary pages (e.g. a dispensary
          detail page), where it's a one-option, no-op control. */}
      {dispensaries.length > 1 && (
        <>
          {(categories.length > 1 || brands.length > 1) && <Separator />}

          <FilterSection title="Dispensary">
            {dispensaries.map((d) => (
              <FilterRadio
                key={d.slug}
                name="dispensary"
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
        </>
      )}

      <Separator />

      {/* Strain Type */}
      <FilterSection title="Strain Type">
        {strainTypes.map((st) => (
          <FilterRadio
            key={st}
            name="strainType"
            checked={filters.strainType === st}
            onChange={() =>
              onFilterChange(
                "strainType",
                filters.strainType === st ? undefined : st
              )
            }
            label={st}
            labelClassName="capitalize"
          />
        ))}
      </FilterSection>

      <Separator />

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              onFilterChange(
                "minPrice",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-11 w-20"
            min={0}
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onFilterChange(
                "maxPrice",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-11 w-20"
            min={0}
          />
        </div>
      </FilterSection>

      <Separator />

      {/* On Sale Toggle */}
      <OnSaleToggle
        checked={!!filters.onSale}
        onChange={() => onFilterChange("onSale", !filters.onSale || undefined)}
      />
    </div>
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
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
