"use client"

import { useCallback, useEffect, useState } from "react"
import type { InventoryListing, ProductFilters } from "@/lib/types"
import { ProductGrid } from "@/components/product/product-grid"
import { ProductDetailDrawer } from "@/components/product/product-detail"

interface MenuClientProps {
  listings: InventoryListing[]
}

export function MenuClient({ listings }: MenuClientProps) {
  const [initialFilters, setInitialFilters] = useState<ProductFilters>({})
  const [filtersKey, setFiltersKey] = useState("")
  const [selectedListing, setSelectedListing] = useState<InventoryListing | null>(null)

  // Deep-link support (e.g. /deals?category=flower): read the URL once after
  // mount instead of useSearchParams() so the host pages stay statically
  // prerenderable. The key remounts ProductGrid when filters arrive.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const next: ProductFilters = {
      category: sp.get("category") ?? undefined,
      brand: sp.get("brand") ?? undefined,
      dispensary: sp.get("dispensary") ?? undefined,
      search: sp.get("search") ?? undefined,
      onSale: sp.get("sale") === "true" || undefined,
    }
    if (Object.values(next).some(Boolean)) {
      setInitialFilters(next)
      setFiltersKey(JSON.stringify(next))
    }
  }, [])

  const handleCardClick = useCallback((listing: InventoryListing) => {
    setSelectedListing(listing)
  }, [])

  return (
    <>
      <ProductGrid
        key={filtersKey}
        listings={listings}
        initialFilters={initialFilters}
        onCardClick={handleCardClick}
      />
      <ProductDetailDrawer
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
      />
    </>
  )
}
