"use client"

import { useCallback, useEffect, useState } from "react"
import type { InventoryListing, ProductFilters } from "@/lib/types"
import { ProductGrid } from "@/components/product/product-grid"
import {
  FILTER_PARAM_KEYS,
  filtersToParams,
  parseFilterParams,
} from "@/lib/filter-params"

interface MenuClientProps {
  listings: InventoryListing[]
  /** Hide the per-card dispensary chip (single-dispensary pages). */
  showDispensary?: boolean
  /** Page-specific default sort, e.g. "discount-desc" on /deals. */
  defaultSort?: ProductFilters["sort"]
  /** Screen-reader label for the results section — keeps the heading outline
   *  H1 → H2 → H3 (cards are H3) instead of skipping a level. */
  headingLabel?: string
}

export function MenuClient({
  listings,
  showDispensary = true,
  defaultSort,
  headingLabel = "Products",
}: MenuClientProps) {
  const [initialFilters, setInitialFilters] = useState<ProductFilters>(
    defaultSort ? { sort: defaultSort } : {}
  )
  const [filtersKey, setFiltersKey] = useState("")

  // Deep-link support (e.g. /category/flower?brand=Sweetspot — also what the
  // category chips produce when carrying filters across a switch): read the
  // URL once after mount instead of useSearchParams() so the host pages stay
  // statically prerenderable. The key remounts ProductGrid when filters
  // arrive.
  useEffect(() => {
    const parsed = parseFilterParams(
      new URLSearchParams(window.location.search)
    )
    const next: ProductFilters = {
      ...(defaultSort ? { sort: defaultSort } : {}),
      ...Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => v !== undefined)
      ),
    }
    if (Object.values(next).some(Boolean)) {
      // Post-mount URL read (kept out of render so host pages stay statically
      // prerenderable); a one-shot sync, not a render loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialFilters(next)
      setFiltersKey(JSON.stringify(next))
    }
  }, [defaultSort])

  // Mirror the grid's filter state back into the URL (replaceState — no
  // history spam, no navigation) so reloads keep the view and the category
  // chips can carry the filters to a sibling category page.
  const handleFiltersChange = useCallback(
    (filters: ProductFilters) => {
      const next = new URLSearchParams(window.location.search)
      for (const key of FILTER_PARAM_KEYS) next.delete(key)
      for (const [key, value] of filtersToParams(filters, defaultSort)) {
        next.set(key, value)
      }
      const search = next.toString()
      const url = `${window.location.pathname}${search ? `?${search}` : ""}`
      if (url !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(null, "", url)
      }
    },
    [defaultSort]
  )

  return (
    <>
      <h2 className="sr-only">{headingLabel}</h2>
      <ProductGrid
        key={filtersKey}
        listings={listings}
        initialFilters={initialFilters}
        showDispensary={showDispensary}
        onFiltersChange={handleFiltersChange}
      />
    </>
  )
}
