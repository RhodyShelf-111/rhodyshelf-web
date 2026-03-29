"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import type { InventoryListing } from "@/lib/types"
import { ProductGrid } from "@/components/product/product-grid"
import { ProductDetailDrawer } from "@/components/product/product-detail"

interface MenuClientProps {
  listings: InventoryListing[]
}

export function MenuClient({ listings }: MenuClientProps) {
  const searchParams = useSearchParams()
  const [selectedListing, setSelectedListing] = useState<InventoryListing | null>(null)

  const initialFilters = {
    category: searchParams.get("category") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    dispensary: searchParams.get("dispensary") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    onSale: searchParams.get("sale") === "true" || undefined,
  }

  const handleCardClick = useCallback((listing: InventoryListing) => {
    setSelectedListing(listing)
  }, [])

  return (
    <>
      <ProductGrid
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
