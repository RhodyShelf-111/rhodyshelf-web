import type { InventoryListing, ProductFilters } from "@/lib/types"
import { resolveAlias } from "@/lib/brand-aliases"

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
