import Link from "next/link"
import type { InventoryListing } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"
import { formatPrice } from "@/lib/utils"

interface BrandGroupProps {
  brandName: string
  listings: InventoryListing[]
}

export function BrandGroup({ brandName, listings }: BrandGroupProps) {
  const prices = listings.map((l) => l.price).filter((p): p is number => p != null)
  const minPrice = prices.length > 0 ? Math.min(...prices) : null
  const brandSlug = encodeURIComponent(brandName)

  return (
    <div className="py-4 border-b border-border last:border-0">
      {/* Brand header */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[17px] font-bold text-foreground">{brandName}</h3>
          <span className="text-[13px] text-muted-foreground">
            {minPrice != null ? `From ${formatPrice(minPrice)} · ` : ""}
            {listings.length} product{listings.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Link
          href={`/search?brand=${brandSlug}`}
          className="text-sm text-primary hover:underline shrink-0"
        >
          View all {listings.length} →
        </Link>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-4 overflow-x-auto scrollbar-subtle -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-2 items-stretch">
        {listings.slice(0, 10).map((listing) => (
          <div key={listing.id} className="w-52 shrink-0">
            <ProductCard listing={listing} />
          </div>
        ))}
      </div>
    </div>
  )
}
