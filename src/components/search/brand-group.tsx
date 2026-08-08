import Link from "next/link"
import type { InventoryListing } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"
import { EAGER_IMAGE_COUNT } from "@/lib/image-priority"
import { formatPrice } from "@/lib/utils"

interface BrandGroupProps {
  brandName: string
  listings: InventoryListing[]
  /**
   * How many listings this brand actually has under the page's active filters.
   * `listings` is only the loaded page (96 rows), so counting it undercounts
   * any brand with a bigger share. Falls back to the loaded count when the
   * server couldn't supply one.
   */
  totalCount?: number
  /** Where "View all" goes — the current filters plus this brand, so the
   *  destination is the set the count describes. */
  href: string
  /** Set on the first group only: its leading cards are the page's above-the-fold
   *  row and hold the LCP candidate, so they take the eager/high-priority image
   *  hint instead of waiting on the lazy-load observer. */
  eager?: boolean
}

export function BrandGroup({
  brandName,
  listings,
  totalCount,
  href,
  eager = false,
}: BrandGroupProps) {
  const prices = listings.map((l) => l.price).filter((p): p is number => p != null)
  const minPrice = prices.length > 0 ? Math.min(...prices) : null
  const count = totalCount ?? listings.length

  return (
    <div className="py-4 border-b border-border last:border-0">
      {/* Brand header. min-w-0 + truncate keeps a long brand name from pushing
          the "View all" link off the row and triggering page-level horizontal
          scroll on narrow phones. */}
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex min-w-0 items-baseline gap-3">
          {/* font-heading: this is the same rail header the homepage renders
              (category-rails.tsx), and it was the one instance set in the body
              face — so /search's rails read as a different product from the
              homepage's at the identical size and weight. */}
          <h3 className="truncate font-heading text-[17px] font-semibold text-foreground">
            {brandName}
          </h3>
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {minPrice != null ? `From ${formatPrice(minPrice)} · ` : ""}
            {count.toLocaleString()} product{count !== 1 ? "s" : ""}
          </span>
        </div>
        <Link
          href={href}
          className="text-sm text-primary hover:underline shrink-0"
        >
          View all {count.toLocaleString()} →
        </Link>
      </div>

      {/* Horizontal scroll row. The negative margin + matching padding bleeds
          the scrollport to the viewport edge while keeping the first card
          aligned to the page gutter. scroll-px MUST match that padding: a
          snap-start card aligns to the snapport, which is the scrollport inset
          by scroll-padding — leave it at the default 0 and the browser scrolls
          the rail by exactly padding-left on load to satisfy the snap, landing
          the first card flush to the viewport edge instead of under the brand
          heading. Only overflowing rails could scroll, so the misalignment hit
          the long brand rows and not the short ones. */}
      <div className="flex gap-4 overflow-x-auto overscroll-x-contain scrollbar-subtle rail-fade snap-x scroll-px-4 sm:scroll-px-6 lg:scroll-px-8 [--rail-gutter:1rem] sm:[--rail-gutter:1.5rem] lg:[--rail-gutter:2rem] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-2 items-stretch">
        {listings.slice(0, 10).map((listing, index) => (
          <div key={listing.id} className="w-52 shrink-0 snap-start">
            {/* This rail is a FIXED 208px slot at every breakpoint (w-52), so
                the card's responsive-grid default (50vw down to 25vw) would
                have the browser pick a 640px source for it. */}
            <ProductCard
              listing={listing}
              eager={eager && index < EAGER_IMAGE_COUNT}
              sizes="208px"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
