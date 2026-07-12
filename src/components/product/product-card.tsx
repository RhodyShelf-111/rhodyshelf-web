"use client"

import Image from "next/image"
import Link from "next/link"
import { MapPin, ChevronUp, ExternalLink } from "lucide-react"
import type { InventoryListing } from "@/lib/types"
import { cn, formatPrice, getCategoryIcon } from "@/lib/utils"
import { DealBadge, DropBadge, StockBadge } from "./deal-badge"
import { useUpvotes } from "@/hooks/use-upvotes"

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
}

export function ProductCard({
  listing,
  dropBadge,
  showDispensary = true,
  stock,
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

      {/* Image plate — object-contain + padding so mixed-background packshots
          from different dispensary CDNs all sit on a consistent muted tile. */}
      <div className="relative aspect-square bg-muted shrink-0 border-b border-border/60">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className={cn(
              "object-contain p-3",
              outOfStock && "grayscale opacity-50"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
              <span className="text-muted-foreground font-normal text-[12px] line-through ml-1.5">
                {formatPrice(original_price)}
              </span>
            )}
            {product.weight_display && (
              <span className="text-muted-foreground font-normal text-[12px] ml-1">
                / {product.weight_display}
              </span>
            )}
          </p>

          {/* THC — always reserve one line */}
          <p className="text-[12px] text-muted-foreground min-h-[1rem]">
            {thc_percent != null ? `THC: ${thc_percent.toFixed(1)}%` : " "}
          </p>
        </div>

        {/* Dispensary + actions (pinned to bottom).
            Mobile: name on its own row, then a full-width action row with 44px
            touch targets (WCAG 2.5.5 / Apple HIG) — this also gives the
            dispensary name the full card width so it stops truncating.
            sm+: a single compact inline row where a precise pointer is in use. */}
        <div className="mt-auto pt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {showDispensary && !outOfStock && (
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
