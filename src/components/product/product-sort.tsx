"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProductFilters } from "@/lib/types"
import { SORT_OPTIONS, sortLabel, type SortValue } from "@/lib/sort"

interface ProductSortProps {
  value: ProductFilters["sort"]
  onChange: (sort: ProductFilters["sort"]) => void
  /** The selected fallback shown when no sort is set (page-specific default). */
  defaultValue?: SortValue
}

export function ProductSort({ value, onChange, defaultValue = "newest" }: ProductSortProps) {
  return (
    <Select
      value={value ?? defaultValue}
      onValueChange={(v) => onChange(v as ProductFilters["sort"])}
    >
      <SelectTrigger className="w-[150px] lg:w-[180px] !h-11 sm:!h-9 text-sm">
        {/* `!h-*` overrides SelectTrigger's built-in data-[size=default]:h-8,
            which otherwise wins on specificity and keeps the mobile trigger at
            32px. Render the friendly label in the resting trigger — Base UI's
            SelectValue shows the raw enum value ("newest") otherwise. */}
        <SelectValue placeholder="Sort by">
          {(v) => sortLabel((v as SortValue) ?? defaultValue, defaultValue)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
