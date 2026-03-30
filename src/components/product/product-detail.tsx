"use client"

import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Heart, X } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button, buttonVariants } from "@/components/ui/button"
import type { InventoryListing } from "@/lib/types"
import { formatPrice, getCategoryIcon } from "@/lib/utils"
import { useUpvotes } from "@/hooks/use-upvotes"
import { DealBadge } from "./deal-badge"

interface ProductDetailDrawerProps {
  listing: InventoryListing | null
  onClose: () => void
}

export function ProductDetailDrawer({
  listing,
  onClose,
}: ProductDetailDrawerProps) {
  if (!listing) return null

  return (
    <Sheet open={!!listing} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto p-0">
        <ProductDetailContent listing={listing} onClose={onClose} />
      </SheetContent>
    </Sheet>
  )
}

function ProductDetailContent({
  listing,
  onClose,
}: {
  listing: InventoryListing
  onClose: () => void
}) {
  const { product, dispensary, price, discount_amount, thc_percent, cbd_percent } =
    listing
  const isOnSale = (discount_amount ?? 0) > 0
  const { isUpvoted, toggle } = useUpvotes(listing.id)

  return (
    <div>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image */}
      <div className="relative aspect-square bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="420px"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement
              target.style.display = "none"
              const fallback = target.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = "flex"
            }}
          />
        ) : null}
        <div
          className="absolute inset-0 items-center justify-center text-6xl"
          style={{ display: product.image_url ? "none" : "flex" }}
        >
          {getCategoryIcon(product.category)}
        </div>
        {isOnSale && (
          <div className="absolute top-3 left-3">
            <DealBadge />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {product.category}
            {product.strain_type ? ` · ${product.strain_type}` : ""}
            {product.weight_display ? ` · ${product.weight_display}` : ""}
          </p>
          <h2 className="text-xl font-bold text-foreground mt-1">
            {product.name}
          </h2>
          <p className="text-muted-foreground mt-0.5">{product.brand_name}</p>
        </div>

        {/* Price */}
        <div className="text-2xl font-bold text-foreground">
          {formatPrice(price) ?? (
            <span className="text-base font-normal text-muted-foreground">
              See dispensary for price
            </span>
          )}
        </div>

        {/* Cannabinoids */}
        {(thc_percent != null || cbd_percent != null) && (
          <div className="flex gap-4">
            {thc_percent != null && (
              <div className="bg-muted rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">THC</p>
                <p className="text-sm font-semibold">{thc_percent.toFixed(1)}%</p>
              </div>
            )}
            {cbd_percent != null && cbd_percent > 0 && (
              <div className="bg-muted rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">CBD</p>
                <p className="text-sm font-semibold">{cbd_percent.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}

        {/* Dispensary */}
        <div className="bg-surface rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Available at</p>
          <p className="font-semibold text-foreground">{dispensary.name}</p>
          {dispensary.city && (
            <p className="text-sm text-muted-foreground">{dispensary.city}, RI</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {dispensary.menu_url && (
            <a
              href={dispensary.menu_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ className: "flex-1" })}
            >
              View on {dispensary.name}
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </a>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={toggle}
            aria-label={isUpvoted ? "Remove upvote" : "Upvote"}
          >
            <Heart
              className={
                isUpvoted
                  ? "w-5 h-5 fill-red-500 text-red-500"
                  : "w-5 h-5 text-muted-foreground"
              }
            />
          </Button>
        </div>

        {/* Full page link */}
        <Link
          href={`/product/${listing.id}`}
          className="block text-center text-sm text-primary hover:underline"
        >
          Open full page &rarr;
        </Link>
      </div>
    </div>
  )
}
