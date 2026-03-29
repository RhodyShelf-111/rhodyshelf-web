"use client"

import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
      {/* Category */}
      <FilterSection title="Category">
        {categories.map((cat) => (
          <label key={cat} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              checked={filters.category === cat}
              onChange={() =>
                onFilterChange(
                  "category",
                  filters.category === cat ? undefined : cat
                )
              }
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm capitalize">{cat}</span>
          </label>
        ))}
      </FilterSection>

      <Separator />

      {/* Brand */}
      <FilterSection title="Brand">
        <Input
          placeholder="Search brands..."
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
        />
        <div className="max-h-48 overflow-y-auto space-y-1.5">
          {filteredBrands.slice(0, 20).map((brand) => (
            <label key={brand} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="brand"
                checked={filters.brand === brand}
                onChange={() =>
                  onFilterChange(
                    "brand",
                    filters.brand === brand ? undefined : brand
                  )
                }
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm truncate">{brand}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <Separator />

      {/* Dispensary */}
      <FilterSection title="Dispensary">
        {dispensaries.map((d) => (
          <label key={d.slug} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dispensary"
              checked={filters.dispensary === d.slug}
              onChange={() =>
                onFilterChange(
                  "dispensary",
                  filters.dispensary === d.slug ? undefined : d.slug
                )
              }
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm">{d.name}</span>
          </label>
        ))}
      </FilterSection>

      <Separator />

      {/* Strain Type */}
      <FilterSection title="Strain Type">
        {strainTypes.map((st) => (
          <label key={st} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="strainType"
              checked={filters.strainType === st}
              onChange={() =>
                onFilterChange(
                  "strainType",
                  filters.strainType === st ? undefined : st
                )
              }
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm capitalize">{st}</span>
          </label>
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
            className="h-8 text-sm w-20"
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
            className="h-8 text-sm w-20"
            min={0}
          />
        </div>
      </FilterSection>

      <Separator />

      {/* On Sale Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          role="switch"
          aria-checked={!!filters.onSale}
          tabIndex={0}
          onClick={() => onFilterChange("onSale", !filters.onSale || undefined)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onFilterChange("onSale", !filters.onSale || undefined)
            }
          }}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            filters.onSale ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
              filters.onSale ? "translate-x-4" : ""
            }`}
          />
        </div>
        <span className="text-sm font-medium">On Sale Only</span>
      </label>
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
      <h4 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
