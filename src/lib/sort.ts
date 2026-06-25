import type { ProductFilters } from "@/lib/types"

export type SortValue = NonNullable<ProductFilters["sort"]>

// Single canonical sort vocabulary, shared by the search FilterBar and the
// grid ProductSort so options, labels, and ordering never drift between the
// two browse surfaces. Each surface still picks its own default (the search
// page groups by brand, so it defaults to brand-asc; flat grids default to
// newest, and /deals to discount-desc).
export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "discount-desc", label: "Biggest discount" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "thc-desc", label: "THC: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "brand-asc", label: "Brand: A to Z" },
]

export const DEFAULT_SORT: SortValue = "newest"

/** Human label for the resting sort trigger (Base UI SelectValue renders the
 *  raw enum otherwise, e.g. "newest" instead of "Newest"). */
export function sortLabel(
  value: SortValue | undefined,
  fallback: SortValue = DEFAULT_SORT
): string {
  return (
    SORT_OPTIONS.find((o) => o.value === (value ?? fallback))?.label ?? "Sort by"
  )
}
