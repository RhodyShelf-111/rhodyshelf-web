"use client"

import type { DropListing, InventoryListing } from "@/lib/types"
import { ProductGrid } from "@/components/product/product-grid"
import { getFreshnessBadge } from "@/lib/utils"

interface DropsClientProps {
  drops: DropListing[]
  /** Total in the 14-day window, when it exceeds the slice rendered above. */
  total?: number
}

export function DropsClient({ drops, total }: DropsClientProps) {
  // Resolved per card rather than prebuilt from `drops`, because the grid
  // fetches the rest of the window itself — a map built here would badge only
  // the first slice and leave everything after it looking undated.
  const dropBadgeFor = (listing: InventoryListing) => {
    const droppedAt = (listing as DropListing).dropped_at
    return droppedAt ? getFreshnessBadge(droppedAt) : null
  }

  return (
    <ProductGrid
      listings={drops}
      showFilters={true}
      dropBadgeFor={dropBadgeFor}
      loadRest={total ? { total, scope: "drops" } : undefined}
    />
  )
}
