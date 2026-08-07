"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"
import { MapPin, ChevronUp, ExternalLink, Clock } from "lucide-react"
import type { InventoryListing } from "@/lib/types"
import {
  cn,
  formatPrice,
  formatPricePerGram,
  formatRelativeTime,
  getCategoryIcon,
} from "@/lib/utils"
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
  const dispensaryLabel =
    stock?.inStock && stock.dispensaryCount > 1
      ? `${stock.dispensaryCount} dispensaries`
      : dispensary.name
  // The town answers half the shopper's question ("can I get there?") and is
  // missing from most store names. Suppressed when the name already says it, so
  // the row never reads "Newport Cannabis Co. · Newport", and when the label is
  // a multi-shop count rather than one store.
  const cityLabel =
    dispensaryLabel === dispensary.name &&
    dispensary.city &&
    !dispensary.name.toLowerCase().includes(dispensary.city.toLowerCase())
      ? dispensary.city
      : null
  // The one number that makes two pack sizes comparable. Rendered on the THC
  // line — which already reserves its height — so the grid rows stay even.
  const unitPrice = formatPricePerGram(
    price,
    product.weight_grams,
    product.category
  )
  const thcLabel = thc_percent != null ? `THC: ${thc_percent.toFixed(1)}%` : null
  const statLine = [unitPrice, thcLabel].filter(Boolean).join(" · ")
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
          aria-label={`${product.name} by ${product.brand_name}`}
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
      <div className="relative aspect-square bg-product-plate shrink-0 border-b border-border/60">
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
            "absolute inset-0 items-center justify-center text-4xl",
            outOfStock && "grayscale opacity-50"
          )}
          style={{ display: imageUrl ? "none" : "flex" }}
        >
          {getCategoryIcon(product.category)}
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
      <div className="flex-1 flex flex-col px-3 py-2.5 min-h-0">
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

          {/* Unit price + THC — always reserve exactly one line. truncate (not
              wrap) so a card carrying both can never grow a second line and
              knock its grid row out of alignment. */}
          <p className="text-[13px] text-muted-foreground min-h-[1rem] truncate">
            {statLine || " "}
          </p>
        </div>

        {/* Dispensary + actions (pinned to bottom).
            The where-line keeps its own full-width row at every breakpoint:
            sharing one row with the shrink-0 Buy + upvote controls left it ~76px
            of a 200px card on desktop, so "Aura of Rhode Island - Central Falls"
            rendered as "Aura of Rh…" on every card in the grid.
            Mobile actions are 44px touch targets (WCAG 2.5.5 / Apple HIG);
            sm+ they shrink back to the compact size and sit at the right. */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
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
                  {/* The town never truncates — it's the part that decides
                      whether the shop is reachable. The store name yields. */}
                  <span className="truncate">{dispensaryLabel}</span>
                  {cityLabel && (
                    <span className="shrink-0">· {cityLabel}</span>
                  )}
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
