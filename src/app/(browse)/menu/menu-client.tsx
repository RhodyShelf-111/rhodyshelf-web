"use client"

import { useEffect, useState } from "react"
import type { InventoryListing, ProductFilters } from "@/lib/types"
import { ProductGrid } from "@/components/product/product-grid"

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

  // Deep-link support (e.g. /deals?category=flower): read the URL once after
  // mount instead of useSearchParams() so the host pages stay statically
  // prerenderable. The key remounts ProductGrid when filters arrive.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const next: ProductFilters = {
      ...(defaultSort ? { sort: defaultSort } : {}),
      category: sp.get("category") ?? undefined,
      brand: sp.get("brand") ?? undefined,
      dispensary: sp.get("dispensary") ?? undefined,
      search: sp.get("search") ?? undefined,
      onSale: sp.get("sale") === "true" || undefined,
    }
    if (Object.values(next).some(Boolean)) {
      // Post-mount URL read (kept out of render so host pages stay statically
      // prerenderable); a one-shot sync, not a render loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialFilters(next)
      setFiltersKey(JSON.stringify(next))
    }
  }, [defaultSort])

  return (
    <>
      <h2 className="sr-only">{headingLabel}</h2>
      <ProductGrid
        key={filtersKey}
        listings={listings}
        initialFilters={initialFilters}
        showDispensary={showDispensary}
      />
    </>
  )
}
