import type { Dispensary, InventoryListing, ProductFilters } from "@/lib/types"
import { resolveAlias } from "@/lib/brand-aliases"

export interface FacetOptions {
  categories: string[]
  brands: string[]
  dispensaries: Dispensary[]
  strainTypes: string[]
}

/**
 * Options for each filter facet, derived from the listings that match every
 * OTHER active filter (classic faceted narrowing): pick a dispensary and the
 * brand list shrinks to brands that dispensary actually stocks under the
 * current category/price/sale constraints — never to brands that would
 * return an empty grid.
 *
 * A facet never narrows by its own filter (the brand list with a brand
 * selected still shows the alternatives), and a selected value is kept in
 * its own list even when the other filters orphan it, so it can always be
 * seen and unchecked.
 */
export function deriveFacetOptions(
  listings: InventoryListing[],
  filters: ProductFilters
): FacetOptions {
  const matching = (facet: keyof ProductFilters) =>
    // Sort is irrelevant to option derivation — strip it so the four
    // passes don't each pay for an unused array sort.
    applyFilters(listings, { ...filters, [facet]: undefined, sort: undefined })

  const categories = [
    ...new Set(matching("category").map((l) => l.product.category)),
  ]
  if (
    filters.category &&
    !categories.some(
      (c) => c.toLowerCase() === filters.category!.toLowerCase()
    )
  ) {
    categories.push(filters.category)
  }
  categories.sort()

  const brands = [
    ...new Set(matching("brand").map((l) => l.product.brand_name)),
  ]
  if (filters.brand && !brands.includes(filters.brand)) {
    brands.push(filters.brand)
  }
  brands.sort()

  const dispensaryMap = new Map(
    matching("dispensary").map((l) => [l.dispensary.slug, l.dispensary])
  )
  if (filters.dispensary && !dispensaryMap.has(filters.dispensary)) {
    const selected = listings.find(
      (l) => l.dispensary.slug === filters.dispensary
    )
    if (selected) dispensaryMap.set(selected.dispensary.slug, selected.dispensary)
  }
  const dispensaries = [...dispensaryMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const strainTypes = [
    ...new Set(
      matching("strainType")
        .map((l) => l.product.strain_type)
        .filter(Boolean)
    ),
  ] as string[]
  if (
    filters.strainType &&
    !strainTypes.some(
      (s) => s.toLowerCase() === filters.strainType!.toLowerCase()
    )
  ) {
    strainTypes.push(filters.strainType)
  }
  strainTypes.sort()

  return { categories, brands, dispensaries, strainTypes }
}

/** One row of the server-side catalog index (see getCatalogIndex). */
export interface CatalogIndexRow {
  id: string
  /** lowercased */
  category: string
  brand: string
  /** dispensary slug */
  dispensary: string
}

/**
 * Brand names present in the catalog-index rows that match a
 * category/dispensary scope — powers the search page's brand facet so it
 * only offers brands with results under the active filters.
 */
export function brandNamesFromIndex(
  rows: CatalogIndexRow[],
  scope: { category?: string; dispensary?: string } = {}
): string[] {
  const category = scope.category?.toLowerCase()
  const brands = new Set<string>()
  for (const row of rows) {
    if (category && row.category !== category) continue
    if (scope.dispensary && row.dispensary !== scope.dispensary) continue
    brands.add(row.brand)
  }
  return [...brands].sort()
}

export function applyFilters(
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
    case "brand-asc":
      result = [...result].sort((a, b) =>
        a.product.brand_name.localeCompare(b.product.brand_name)
      )
      break
    case "discount-desc":
      result = [...result].sort(
        (a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0)
      )
      break
  }

  return result
}
