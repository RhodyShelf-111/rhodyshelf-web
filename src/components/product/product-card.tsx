"use client"

import Image from "next/image"
import { MapPin, ChevronUp } from "lucide-react"
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
  const { product, dispensary, price, discount_amount, thc_percent } = listing
  const imageUrl = listing.image_url ?? product.image_url
  const isOnSale = (discount_amount ?? 0) > 0
  const { isUpvoted, toggle } = useUpvotes(product.id)

  return (
    <article
      className={cn(
        "group relative flex flex-col w-full h-full rounded-xl border border-border bg-card overflow-hidden",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5",
        "transition-all duration-150 ease-out cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover"
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

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isOnSale && <DealBadge />}
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

          {/* Price */}
          <p className="text-sm font-semibold text-foreground">
            {formatPrice(price) ?? (
              <span className="text-muted-foreground font-normal">
                See dispensary
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
            {thc_percent != null ? `THC: ${thc_percent.toFixed(1)}%` : "\u00A0"}
          </p>
        </div>

        {/* Dispensary + Upvote (pinned to bottom) */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-1 text-[12px] text-muted-foreground truncate min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{dispensary.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
            className={cn(
              "flex items-center justify-center w-7 h-7 -mr-1 rounded-md transition-colors shrink-0 border",
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
    </article>
  )
}
