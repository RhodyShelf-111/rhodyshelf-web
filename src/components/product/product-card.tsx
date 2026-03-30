"use client"

import Image from "next/image"
import { MapPin, Heart } from "lucide-react"
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
  const isOnSale = (discount_amount ?? 0) > 0
  const { isUpvoted, toggle } = useUpvotes(listing.id)

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border bg-card overflow-hidden",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5",
        "transition-all duration-150 ease-out cursor-pointer",
        "flex flex-col h-full"
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
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
          style={{ display: product.image_url ? "none" : "flex" }}
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
      <div className="px-3 py-2.5 space-y-1 flex flex-col flex-1">
        {/* Category + Strain */}
        <p className="text-[12px] text-muted-foreground truncate">
          {product.category}
          {product.strain_type ? ` · ${product.strain_type}` : ""}
        </p>

        {/* Product Name */}
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
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

        {/* THC */}
        {thc_percent != null && (
          <p className="text-[12px] text-muted-foreground">
            THC: {thc_percent.toFixed(1)}%
          </p>
        )}

        {/* Dispensary + Upvote */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          <div className="flex items-center gap-1 text-[12px] text-muted-foreground truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{dispensary.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
            className="p-2.5 -mr-2 rounded-full hover:bg-muted transition-colors"
            aria-label={isUpvoted ? "Remove upvote" : "Upvote"}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-colors",
                isUpvoted
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground"
              )}
            />
          </button>
        </div>
      </div>
    </article>
  )
}
