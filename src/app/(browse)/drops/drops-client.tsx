"use client"

import { useState, useCallback } from "react"
import type { DropListing, InventoryListing } from "@/lib/types"
import { ProductGrid } from "@/components/product/product-grid"
import { ProductDetailDrawer } from "@/components/product/product-detail"
import { getFreshnessBadge } from "@/lib/utils"

interface DropsClientProps {
  drops: DropListing[]
}

export function DropsClient({ drops }: DropsClientProps) {
  const [selectedListing, setSelectedListing] = useState<InventoryListing | null>(null)

  // Build drop badge map
  const dropBadges = new Map<string, { label: string; className: string }>()
  for (const drop of drops) {
    const badge = getFreshnessBadge(drop.dropped_at)
    if (badge) {
      dropBadges.set(drop.id, badge)
    }
  }

  const handleCardClick = useCallback((listing: InventoryListing) => {
    setSelectedListing(listing)
  }, [])

  return (
    <>
      <ProductGrid
        listings={drops}
        showFilters={true}
        onCardClick={handleCardClick}
        dropBadges={dropBadges}
      />
      <ProductDetailDrawer
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
      />
    </>
  )
}
