import type { ProductFilters } from "@/lib/types"

/**
 * URL codec for grid filter state on the menu-style pages (/category/*,
 * /brand/*, /dispensary/*, /deals). MenuClient reads these params on mount
 * and writes them back (history.replaceState) as filters change, and the
 * category chips carry them across /category/* switches — so a shopper
 * filtered to a brand can flip categories without losing the filter.
 *
 * `minThc` is deliberately absent: no grid UI sets it.
 */

const SORT_VALUES: NonNullable<ProductFilters["sort"]>[] = [
  "price-asc",
  "price-desc",
  "thc-desc",
  "name-asc",
  "newest",
  "brand-asc",
  "discount-desc",
]

/** Every query param the codec owns (writes claim them, reads ignore the rest). */
export const FILTER_PARAM_KEYS = [
  "category",
  "brand",
  "dispensary",
  "strainType",
  "minPrice",
  "maxPrice",
  "sale",
  "search",
  "sort",
] as const

function nonNegativeNumber(raw: string | null): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Parse the filter params out of a query string, dropping invalid values. */
export function parseFilterParams(params: URLSearchParams): ProductFilters {
  const sort = params.get("sort")
  const filters: ProductFilters = {
    category: params.get("category") ?? undefined,
    brand: params.get("brand") ?? undefined,
    dispensary: params.get("dispensary") ?? undefined,
    strainType: params.get("strainType") ?? undefined,
    minPrice: nonNegativeNumber(params.get("minPrice")),
    maxPrice: nonNegativeNumber(params.get("maxPrice")),
    onSale: params.get("sale") === "true" || undefined,
    search: params.get("search") ?? undefined,
    sort:
      sort && SORT_VALUES.includes(sort as NonNullable<ProductFilters["sort"]>)
        ? (sort as ProductFilters["sort"])
        : undefined,
  }
  return filters
}

/**
 * Serialize filters to their query params. A sort equal to the page's
 * default is omitted so the resting URL stays clean (e.g. /deals doesn't
 * grow ?sort=discount-desc just by loading).
 */
export function filtersToParams(
  filters: ProductFilters,
  defaultSort?: ProductFilters["sort"]
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.category) params.set("category", filters.category)
  if (filters.brand) params.set("brand", filters.brand)
  if (filters.dispensary) params.set("dispensary", filters.dispensary)
  if (filters.strainType) params.set("strainType", filters.strainType)
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice))
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice))
  if (filters.onSale) params.set("sale", "true")
  if (filters.search) params.set("search", filters.search)
  if (filters.sort && filters.sort !== (defaultSort ?? undefined)) {
    params.set("sort", filters.sort)
  }
  return params
}

/**
 * The query string (no leading `?`) a category chip should carry to another
 * /category/* page: the current filter params minus `category` (the
 * destination path defines it), sanitized through a parse/serialize
 * round-trip. Empty string when nothing is worth carrying.
 */
export function carryFilterParams(search: string): string {
  const parsed = parseFilterParams(new URLSearchParams(search))
  delete parsed.category
  return filtersToParams(parsed).toString()
}
