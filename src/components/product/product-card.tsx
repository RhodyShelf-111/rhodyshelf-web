"use client"

import Image from "next/image"
import Link from "next/link"
import { MapPin, ChevronUp, ExternalLink } from "lucide-react"
import type { InventoryListing } from "@/lib/types"
import { cn, formatPrice, getCategoryIcon } from "@/lib/utils"
import { DealBadge, DropBadge } from "./deal-badge"
import { useUpvotes } from "@/hooks/use-upvotes"

interface ProductCardProps {
  listing: InventoryListing
  dropBadge?: { label: string; className: string } | null
  onClick?: () => void
}

export function ProductCard({ listing, dropBadge, onClick }: ProductCardProps) {
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
  const isOnSale = (discount_amount ?? 0) > 0
  const showStrike =
    isOnSale && original_price != null && price != null && original_price > price
  // Per-product deep-link into the dispensary menu (the money action).
  const buyUrl = listing.product_url ?? dispensary.menu_url
  const { isUpvoted, toggle } = useUpvotes(product.id)

  // The whole card is a real link to the full product page (keyboard-focusable,
  // crawlable, opens-in-new-tab friendly, works without JS). With JS, a plain
  // left-click intercepts to open the quick-look drawer instead.
  const handleNavClick = (e: React.MouseEvent) => {
    if (!onClick) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    onClick()
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col w-full h-full rounded-xl border border-border bg-card overflow-hidden",
        "transition-all duration-150 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)]"
      )}
    >
      {/* Stretched link makes the entire card one accessible, focusable target. */}
      <Link
        href={`/product/${listing.id}`}
        onClick={handleNavClick}
        aria-label={`${product.name} by ${product.brand_name}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      {/* Image plate — object-contain + padding so mixed-background packshots
          from different dispensary CDNs all sit on a consistent muted tile. */}
      <div className="relative aspect-square bg-muted shrink-0 border-b border-border/60">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-3"
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
          className="absolute inset-0 items-center justify-center text-4xl"
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

          {/* Price + savings */}
          <p className="text-sm font-semibold text-foreground">
            {formatPrice(price) ?? (
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

        {/* Dispensary + actions (pinned to bottom) */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-1 text-[12px] text-muted-foreground truncate min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{dispensary.name}</span>
          </div>
          <div className="relative z-10 flex items-center gap-1 shrink-0">
            {buyUrl && (
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Buy ${product.name} at ${dispensary.name} (opens dispensary site)`}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Buy
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggle()
              }}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-md transition-colors shrink-0 border",
                isUpvoted
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
              )}
              aria-label={isUpvoted ? "Remove upvote" : "Upvote"}
              aria-pressed={isUpvoted}
            >
              <ChevronUp className={cn("w-4 h-4", isUpvoted && "stroke-[3]")} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
