"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ExternalLink, MapPin } from "lucide-react"
import type { InventoryListing } from "@/lib/types"
import { formatPrice, formatUnitPrice, formatRelativeTime } from "@/lib/utils"
import { DealBadge } from "@/components/product/deal-badge"
import { ProductHeroImage } from "@/components/product/product-hero-image"
import { UpvoteButton } from "@/components/product/upvote-button"
import { PriceComparisonPanel } from "@/components/product/price-comparison"
import {
  buildPriceComparison,
  type PriceComparison,
} from "@/lib/price-comparison"
import { SheetTitle, SheetDescription } from "@/components/ui/sheet"

/**
 * Compact product view for the quick-look sheet. Presented as a bottom sheet on
 * touch layouts and a right-hand drawer on desktop (see ProductDrawer). The body
 * scrolls; the Buy / upvote actions live in a sticky bar pinned to the bottom of
 * the sheet so the money action is always one tap away no matter how far the
 * shopper has scrolled. It reuses the same islands and helpers as the full
 * /product/[id] page so the two stay in sync. The full page remains the
 * canonical destination (shareable link, refresh, "View full page") and is where
 * the "More from this brand" rail lives; the sheet omits that rail to stay quick.
 *
 * What it does NOT omit is the cross-dispensary comparison. Tapping a card is
 * the default path into a product, so leaving the comparison to the full page
 * meant the common journey ended at a Buy button for a $32 listing whose twin
 * two towns over was $15. The sheet renders from the in-memory listing and then
 * asks /api/search for the same brand + product, so the comparison arrives a
 * beat later without delaying the open.
 */
export function ProductQuickLook({ listing }: { listing: InventoryListing }) {
  const {
    product,
    dispensary,
    price,
    original_price,
    discount_amount,
    discount_percent,
    thc_percent,
    cbd_percent,
  } = listing
  const imageUrl = listing.image_url ?? product.image_url
  const isOnSale = (discount_amount ?? 0) > 0
  const showStrike =
    isOnSale && original_price != null && price != null && original_price > price
  // Per-product deep-link into the dispensary menu (primary CTA); falls back to
  // the dispensary-level menu_url when a row has no product_url.
  const buyUrl = listing.product_url ?? dispensary.menu_url
  // The rate, next to the price: a 28g jar and a 1g nug are otherwise not
  // comparable numbers, and neither are a 100mg 10-pack and a 200mg bar.
  // "$3.14/g" for gram-priced categories, "$1.20/10mg" for dose-priced ones.
  const unitPrice = formatUnitPrice(price, product)
  const comparison = useCrossDispensaryPrices(listing)

  return (
    <>
      {/* Scrollable body. overscroll-contain stops a scroll at the top/bottom
          edge from chaining out to the page behind the sheet. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Image plate — a capped height on mobile so the title, price, and the
            sticky Buy bar are reachable without a long scroll; square on the
            narrower desktop drawer where the vertical budget is generous. */}
        {/* Divider lives on the details block's border-t — a border-b here would
            eat 1px off the sm+ aspect-square content box and letterbox every
            square packshot in white slivers (see product-card.tsx). */}
        <div className="relative h-56 shrink-0 bg-product-plate sm:h-auto sm:aspect-square">
          <ProductHeroImage
            imageUrl={imageUrl}
            alt={product.name}
            category={product.category}
          />
          {isOnSale && (
            <div className="absolute top-3 left-3">
              <DealBadge percent={discount_percent} />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4 border-t border-border p-4">
          <div>
            <SheetDescription className="capitalize">
              {product.category}
              {product.strain_type ? ` · ${product.strain_type}` : ""}
              {product.weight_display ? ` · ${product.weight_display}` : ""}
            </SheetDescription>
            <SheetTitle className="mt-1 text-title font-semibold">
              {product.name}
            </SheetTitle>
            <Link
              href={`/search?brand=${encodeURIComponent(product.brand_name)}`}
              className="mt-0.5 inline-block text-muted-foreground transition-colors hover:text-foreground"
            >
              {product.brand_name}
            </Link>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="text-title font-semibold text-foreground">
                {formatPrice(price) ?? (
                  <span className="text-lead font-normal text-muted-foreground">
                    See dispensary for price
                  </span>
                )}
              </span>
              {showStrike && (
                <span className="text-lead text-muted-foreground line-through">
                  {formatPrice(original_price)}
                </span>
              )}
              {showStrike && (
                <span className="text-body font-medium text-primary">
                  Save {formatPrice((original_price ?? 0) - (price ?? 0))}
                </span>
              )}
              {unitPrice && (
                <span className="text-lead text-muted-foreground">
                  {unitPrice}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-meta text-muted-foreground">
              Price updated {formatRelativeTime(listing.last_seen_at)} · confirm at
              dispensary before you go
            </p>
          </div>

          {(thc_percent != null || cbd_percent != null) && (
            <div className="flex gap-3">
              {thc_percent != null && (
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="text-meta text-muted-foreground">THC</p>
                  <p className="text-subhead font-medium">{thc_percent.toFixed(1)}%</p>
                </div>
              )}
              {cbd_percent != null && cbd_percent > 0 && (
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="text-meta text-muted-foreground">CBD</p>
                  <p className="text-subhead font-medium">{cbd_percent.toFixed(1)}%</p>
                </div>
              )}
            </div>
          )}

          <Link
            href={`/dispensary/${dispensary.slug}`}
            className="block rounded-xl border border-border bg-muted p-4 transition-colors hover:border-primary/40"
          >
            <p className="text-body text-muted-foreground">Available at</p>
            <p className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {dispensary.name}
            </p>
            {dispensary.city && (
              <p className="ml-5.5 text-body text-muted-foreground">
                {dispensary.city}, RI
              </p>
            )}
          </Link>

          {/* Where this price sits against every other shop carrying it —
              same panel and reading order as the full page (price → this shop →
              how this shop compares). Absent until the check resolves, and for
              the common case where nobody else carries it. */}
          {comparison && (
            <PriceComparisonPanel
              comparison={comparison}
              headingId="quick-look-price-comparison-heading"
            />
          )}

          {/* Hard link (not next/link) so it bypasses the interception and loads
              the full standalone page — the brand rail and the canonical URL. */}
          <a
            href={`/product/${listing.id}`}
            className="text-center text-body text-primary hover:underline"
          >
            View full page →
          </a>
        </div>
      </div>

      {/* Sticky action bar — the money action stays reachable at the bottom of
          the sheet through any scroll. pb accounts for the phone's home
          indicator (safe-area-inset-bottom) so the buttons never sit under it. */}
      <div className="shrink-0 border-t border-border bg-popover/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-backdrop-filter:bg-popover/80">
        <div className="flex gap-2.5">
          {buyUrl && (
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="buy"
              data-dispensary={dispensary.name}
              data-category={product.category}
              data-surface="quick-look"
              className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 text-body font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="truncate">Buy at {dispensary.name}</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          )}
          <UpvoteButton
            productId={product.id}
            className="h-12 w-12 shrink-0"
          />
        </div>
      </div>
    </>
  )
}

/**
 * Every other dispensary carrying this exact product and size, or null.
 *
 * The full page gets this for free — it already fetches the brand's listings
 * server-side for the "More from this brand" rail. The sheet has no server
 * round-trip at all (it renders from the listing the grid left in memory), so it
 * asks /api/search for this brand + product name instead: a handful of rows, on
 * the same cached query the search page uses. Deliberately fired after paint —
 * the comparison is worth a beat's wait, the sheet opening is not.
 *
 * A failure is silent: the panel simply doesn't appear, exactly as it doesn't
 * for the common case where no other shop carries the product.
 */
function useCrossDispensaryPrices(
  listing: InventoryListing
): PriceComparison | null {
  // Keyed by listing id rather than cleared on change, so a comparison built
  // for the previous product can never be shown against this one — and so the
  // effect never has to setState synchronously to reset itself.
  const [result, setResult] = useState<{
    id: string
    comparison: PriceComparison | null
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      brand: listing.product.brand_name,
      q: listing.product.name,
      category: listing.product.category,
    })
    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { listings?: InventoryListing[] } | null) => {
        if (!body?.listings) return
        setResult({
          id: listing.id,
          comparison: buildPriceComparison(listing, body.listings),
        })
      })
      .catch(() => {
        // Includes the AbortError from an unmount/listing change — nothing to
        // show either way.
      })
    return () => controller.abort()
  }, [listing])

  return result?.id === listing.id ? result.comparison : null
}
