"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"
import { MapPin, ChevronUp, ExternalLink, Clock } from "lucide-react"
import type { InventoryListing } from "@/lib/types"
import {
  cn,
  formatPrice,
  formatRelativeTime,
} from "@/lib/utils"
import { shortDispensaryName } from "@/lib/dispensary-name"
import { CategoryIcon } from "@/components/ui/category-icon"
import { DealBadge, DropBadge, StockBadge } from "./deal-badge"
import { useUpvotes } from "@/hooks/use-upvotes"
import { rememberListing } from "@/lib/listing-cache"

interface ProductCardProps {
  listing: InventoryListing
  dropBadge?: { label: string; className: string } | null
  /** Hide the per-card dispensary chip on pages already scoped to one
   *  dispensary (it's redundant there and truncates badly on narrow cards). */
  showDispensary?: boolean
  /** Saved page only: show an In stock / Out of stock badge, mute the card when
   *  out of stock, and summarize how many dispensaries carry it. Omitted
   *  everywhere else, so those cards render exactly as before. */
  stock?: { inStock: boolean; dispensaryCount: number }
  /** Above-the-fold cards on listing pages: load the image eagerly with high
   *  fetch priority so it can win LCP instead of being lazy-deferred. */
  eager?: boolean
  /** Real rendered slot width, for hosts that aren't the responsive grid.
   *  The fixed-width rails render this card at ~208-224px, so the grid's
   *  default (25vw and up) would make the browser pick a 640px source for a
   *  210px slot. Pass the actual width there instead. */
  sizes?: string
}

const GRID_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"

export function ProductCard({
  listing,
  dropBadge,
  showDispensary = true,
  stock,
  eager = false,
  sizes = GRID_SIZES,
}: ProductCardProps) {
  const {
    product,
    dispensary,
    price,
    original_price,
    discount_amount,
    discount_percent,
    thc_percent,
  } = listing
  const imageUrl = listing.image_url ?? product.image_url
  const outOfStock = stock != null && !stock.inStock
  const isOnSale = !outOfStock && (discount_amount ?? 0) > 0
  const showStrike =
    isOnSale && original_price != null && price != null && original_price > price
  // Per-product deep-link into the dispensary menu (the money action). Nothing
  // to buy when it's out of stock, so the CTA is suppressed there.
  const buyUrl = outOfStock ? null : listing.product_url ?? dispensary.menu_url
  const { isUpvoted, toggle } = useUpvotes(product.id)
  // Saved-page dispensary line: collapse several shops to a count so a product
  // carried at multiple stores isn't misrepresented by a single store name.
  const multiShopLabel =
    stock?.inStock && stock.dispensaryCount > 1
      ? `${stock.dispensaryCount} dispensaries`
      : null
  // Shop name only, abbreviated: the registered names don't fit the card's
  // where-line (they truncated mid-word), and the town came off the card
  // entirely — a grid tile carries category, strain, name, brand, price, pack
  // size and shop already. The full name and the town are both on the product
  // page, one tap away, where there's room to read them.
  const dispensaryLabel =
    multiShopLabel ?? shortDispensaryName(dispensary.name, dispensary.city)
  // THC only. The per-unit rate ("$3.14/g") used to share this line, but a
  // second money figure directly under the price read as noise on a tile this
  // dense. It still leads the product page and the /best-value rows, where
  // comparing rates is the whole point of the surface.
  const statLine = thc_percent != null ? `THC: ${thc_percent.toFixed(1)}%` : ""
  // Out-of-stock cards show when the product was last on a menu (helps judge
  // whether it might return). Empty for products purged from inventory entirely.
  const lastSeenLabel =
    outOfStock && listing.last_seen_at
      ? formatRelativeTime(listing.last_seen_at)
      : null

  // Seed the in-memory cache so the quick-look drawer can open instantly from
  // this already-loaded listing instead of re-fetching it on click.
  useEffect(() => {
    rememberListing(listing)
  }, [listing])

  return (
    <article
      className={cn(
        "group relative flex flex-col w-full h-full rounded-xl border border-border bg-card overflow-hidden",
        "transition-all duration-150 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)]"
      )}
    >
      {/* The whole card is one real link to the full product page: keyboard
          focusable, crawlable, open-in-new-tab friendly, works without JS.
          Stretched (inset-0) so the entire card is the target; the inset focus
          ring stays visible despite the article's overflow-hidden. Skipped when
          out of stock — the product page only serves fresh listings, so the link
          would dead-end on a 404. */}
      {!outOfStock && (
        <Link
          href={`/product/${listing.id}`}
          // The shop is in the accessible name because the same SKU appears
          // once per dispensary on /search and /category: without it, four
          // adjacent links announce identically and a screen-reader user has no
          // way to tell which shop they're opening. Full name, not the card's
          // short label — the link is read out of context. On /saved, where one
          // row stands in for several shops, it announces the count instead:
          // the listing kept there is just the cheapest of the set, so naming
          // it would tell a screen-reader user the card is one shop's when the
          // visible label says three.
          aria-label={`${product.name} by ${product.brand_name} at ${
            multiShopLabel ?? dispensary.name
          }`}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
      )}

      {/* Image plate. Packshots come from 7 dispensary CDNs and ~90% of them are
          opaque rectangles (white, photo, or black backgrounds) rather than
          transparent cutouts, so inset padding just draws a frame around an
          image that already has its own edges. The image runs to the tile edge
          instead, and the tile is white (--product-plate) because that's what
          70% of the catalog is either shot on or drawn for — so the letterbox
          bands behind the ~45% of packshots that aren't square disappear into
          the image instead of boxing it. object-contain (not cover) because
          cropping a package makes the SKU harder to recognize. */}
      {/* The divider below is drawn by the content block's border-t, NOT a
          border-b here: aspect-ratio sizes the border box, so a 1px bottom
          border left the fill image a 210.25x209.25 content box. object-contain
          fitted the (square) packshot to 209.25 square and centered it, painting
          0.5px of white plate down each side — invisible on a white packshot,
          a white hairline around every dark one. */}
      <div className="relative aspect-square bg-product-plate shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            // Deprecated `priority`/`preload` avoided: multiple grid images can
            // be the LCP depending on viewport, so per-image eager loading +
            // high fetch priority on the first row is the recommended hint.
            loading={eager ? "eager" : undefined}
            fetchPriority={eager ? "high" : "auto"}
            className={cn(
              "object-contain",
              outOfStock && "grayscale opacity-50"
            )}
            sizes={sizes}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement
              target.style.display = "none"
              const fallback = target.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = "flex"
            }}
          />
        ) : null}
        <div
          className={cn(
            "absolute inset-0 items-center justify-center",
            outOfStock && "grayscale opacity-50"
          )}
          style={{ display: imageUrl ? "none" : "flex" }}
        >
          <CategoryIcon
            category={product.category}
            className="size-10 text-product-plate-foreground"
          />
        </div>

        {/* Badges (decorative — let clicks fall through to the card link) */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
          {isOnSale && <DealBadge percent={discount_percent} />}
          {dropBadge && (
            <DropBadge label={dropBadge.label} badgeClassName={dropBadge.className} />
          )}
        </div>

        {/* Live stock status (Saved page only) — top-right so it never collides
            with the sale/drop badges on the left. */}
        {stock && (
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <StockBadge inStock={stock.inStock} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-3 py-2.5 min-h-0 border-t border-border/60">
        <div className="space-y-1">
          {/* Category + Strain */}
          <p className="text-[12px] text-muted-foreground truncate capitalize">
            {product.category}
            {product.strain_type ? ` · ${product.strain_type}` : ""}
          </p>

          {/* Product Name — always reserve 2 lines */}
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight min-h-[2.25rem]">
            {product.name}
          </h3>

          {/* Brand */}
          <p className="text-[13px] text-muted-foreground truncate">
            {product.brand_name}
          </p>

          {/* Price + savings. Out of stock keeps the last-known price, muted,
              as a reference point (or an em dash once inventory is gone). */}
          <p
            className={cn(
              "text-sm font-semibold",
              outOfStock ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {price != null ? (
              formatPrice(price)
            ) : outOfStock ? (
              <span className="font-normal">—</span>
            ) : (
              <span className="text-muted-foreground font-normal">
                See dispensary
              </span>
            )}
            {showStrike && (
              <span className="text-muted-foreground font-normal text-[13px] line-through ml-1.5">
                {formatPrice(original_price)}
              </span>
            )}
            {product.weight_display && (
              <span className="text-muted-foreground font-normal text-[13px] ml-1">
                / {product.weight_display}
              </span>
            )}
          </p>

          {/* THC, when there is any.

              This line used to reserve its height unconditionally, which was
              right while it also carried the unit rate: something was nearly
              always in it. It isn't now. Potency is nulled at the read boundary
              for every category that isn't flower/pre-roll/vape/concentrate
              (sanitizePotency), so 44% of live listings were rendering a dead
              19px band between the price and the shop.

              Collapsing it costs no alignment, measured rather than assumed:
              cards stretch to their grid row and the footer is bottom-pinned,
              so a row whose cards disagree about potency renders identically
              (the spare space lands below the price either way), and a row
              where nothing reports potency — a page of edibles, a page of
              accessories — simply gets 19px shorter. */}
          {statLine && (
            <p className="text-[13px] text-muted-foreground truncate">
              {statLine}
            </p>
          )}
        </div>

        {/* Dispensary + actions (pinned to bottom).
            sm+: one inline row — where, Buy, upvote — where a precise pointer is
            in use and the compact 28px controls leave the name room to breathe.
            Mobile: the name takes its own full-width row first, because the
            actions are 44px touch targets there (WCAG 2.5.5 / Apple HIG) and
            three of them inline on a ~175px card leaves the shop name about 15px
            — a single truncated character. */}
        <div className="mt-auto pt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {outOfStock
            ? lastSeenLabel && (
                <div className="flex items-center gap-1 text-[12px] text-muted-foreground min-w-0">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="truncate">Last seen {lastSeenLabel}</span>
                </div>
              )
            : showDispensary && (
                <div className="flex items-center gap-1 text-[12px] text-muted-foreground min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{dispensaryLabel}</span>
                </div>
              )}
          <div
            className={cn(
              "relative z-20 flex items-center gap-1.5 sm:gap-1 sm:ml-auto shrink-0",
              outOfStock && "ml-auto"
            )}
          >
            {buyUrl && (
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                // Read by the delegated buy-click listener in
                // src/instrumentation-client.ts. An attribute rather than a
                // handler so the same markup works from server components too.
                data-track="buy"
                data-dispensary={dispensary.name}
                data-category={product.category}
                data-surface="card"
                aria-label={`Buy ${product.name} at ${dispensary.name} (opens dispensary site)`}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1 h-11 sm:h-7 px-3 sm:px-2.5 rounded-md text-[13px] sm:text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Buy
                <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggle()
              }}
              className={cn(
                "flex items-center justify-center w-11 h-11 sm:w-7 sm:h-7 rounded-md transition-colors shrink-0 border",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                isUpvoted
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
              )}
              aria-label={isUpvoted ? "Remove upvote" : "Upvote"}
              aria-pressed={isUpvoted}
            >
              <ChevronUp className={cn("w-5 h-5 sm:w-4 sm:h-4", isUpvoted && "stroke-[3]")} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
