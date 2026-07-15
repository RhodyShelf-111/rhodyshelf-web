import Link from "next/link"
import { ExternalLink, MapPin } from "lucide-react"
import type { InventoryListing } from "@/lib/types"
import { formatPrice, formatRelativeTime } from "@/lib/utils"
import { DealBadge } from "@/components/product/deal-badge"
import { ProductHeroImage } from "@/components/product/product-hero-image"
import { UpvoteButton } from "@/components/product/upvote-button"
import { SheetTitle, SheetDescription } from "@/components/ui/sheet"

/**
 * Compact product view for the quick-look sheet. Presented as a bottom sheet on
 * touch layouts and a right-hand drawer on desktop (see ProductDrawer). The body
 * scrolls; the Buy / upvote actions live in a sticky bar pinned to the bottom of
 * the sheet so the money action is always one tap away no matter how far the
 * shopper has scrolled. It reuses the same islands and helpers as the full
 * /product/[id] page so the two stay in sync. The full page remains the
 * canonical destination (shareable link, refresh, "View full page") and is where
 * the "More from this brand" rail lives; the sheet omits it to stay quick.
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

  return (
    <>
      {/* Scrollable body. overscroll-contain stops a scroll at the top/bottom
          edge from chaining out to the page behind the sheet. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Image plate — a capped height on mobile so the title, price, and the
            sticky Buy bar are reachable without a long scroll; square on the
            narrower desktop drawer where the vertical budget is generous. */}
        <div className="relative h-56 shrink-0 border-b border-border bg-muted sm:h-auto sm:aspect-square">
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
        <div className="flex flex-col gap-4 p-4">
          <div>
            <SheetDescription className="capitalize">
              {product.category}
              {product.strain_type ? ` · ${product.strain_type}` : ""}
              {product.weight_display ? ` · ${product.weight_display}` : ""}
            </SheetDescription>
            <SheetTitle className="mt-1 text-xl font-bold">
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
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(price) ?? (
                  <span className="text-base font-normal text-muted-foreground">
                    See dispensary for price
                  </span>
                )}
              </span>
              {showStrike && (
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(original_price)}
                </span>
              )}
              {showStrike && (
                <span className="text-sm font-semibold text-primary">
                  Save {formatPrice((original_price ?? 0) - (price ?? 0))}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Price updated {formatRelativeTime(listing.last_seen_at)} · confirm at
              dispensary before you go
            </p>
          </div>

          {(thc_percent != null || cbd_percent != null) && (
            <div className="flex gap-3">
              {thc_percent != null && (
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="text-xs text-muted-foreground">THC</p>
                  <p className="text-lg font-semibold">{thc_percent.toFixed(1)}%</p>
                </div>
              )}
              {cbd_percent != null && cbd_percent > 0 && (
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="text-xs text-muted-foreground">CBD</p>
                  <p className="text-lg font-semibold">{cbd_percent.toFixed(1)}%</p>
                </div>
              )}
            </div>
          )}

          <Link
            href={`/dispensary/${dispensary.slug}`}
            className="block rounded-xl border border-border bg-muted p-4 transition-colors hover:border-primary/40"
          >
            <p className="text-sm text-muted-foreground">Available at</p>
            <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {dispensary.name}
            </p>
            {dispensary.city && (
              <p className="ml-5.5 text-sm text-muted-foreground">
                {dispensary.city}, RI
              </p>
            )}
          </Link>

          {/* Hard link (not next/link) so it bypasses the interception and loads
              the full standalone page — the brand rail and the canonical URL. */}
          <a
            href={`/product/${listing.id}`}
            className="text-center text-sm text-primary hover:underline"
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
              className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
