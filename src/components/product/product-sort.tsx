"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProductFilters } from "@/lib/types"

interface ProductSortProps {
  value: ProductFilters["sort"]
  onChange: (sort: ProductFilters["sort"]) => void
}

const SORT_OPTIONS: { value: NonNullable<ProductFilters["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "thc-desc", label: "THC: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
]

export function ProductSort({ value, onChange }: ProductSortProps) {
  return (
    <Select
      value={value ?? "newest"}
      onValueChange={(v) => onChange(v as ProductFilters["sort"])}
    >
      <SelectTrigger className="w-[180px] h-9 text-sm">
        <SelectValue placeholder="Sort by" />
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
