"use client"

import type { DropListing } from "@/lib/types"
import { ProductGrid } from "@/components/product/product-grid"
import { getFreshnessBadge } from "@/lib/utils"

interface DropsClientProps {
  drops: DropListing[]
}

export function DropsClient({ drops }: DropsClientProps) {
  // Build drop badge map
  const dropBadges = new Map<string, { label: string; className: string }>()
  for (const drop of drops) {
    const badge = getFreshnessBadge(drop.dropped_at)
    if (badge) {
      dropBadges.set(drop.id, badge)
    }
  }

  return (
    <ProductGrid listings={drops} showFilters={true} dropBadges={dropBadges} />
  )
}
