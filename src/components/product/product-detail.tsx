"use client"

import Image from "next/image"
import Link from "next/link"
import { ExternalLink, ChevronUp, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button, buttonVariants } from "@/components/ui/button"
import type { InventoryListing } from "@/lib/types"
import { formatPrice, formatRelativeTime, getCategoryIcon } from "@/lib/utils"
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
  // Primary CTA target: the per-product deep-link into the dispensary menu.
  // Fall back to the dispensary-level menu_url. (menu_url is currently null for
  // every dispensary, so product_url is what actually makes this button work.)
  const buyUrl = listing.product_url ?? dispensary.menu_url
  const { isUpvoted, toggle } = useUpvotes(product.id)

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
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-6"
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
          style={{ display: imageUrl ? "none" : "flex" }}
        >
          {getCategoryIcon(product.category)}
        </div>
        {isOnSale && (
          <div className="absolute top-3 left-3">
            <DealBadge percent={discount_percent} />
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
          <h2 className="font-heading text-xl font-bold text-foreground mt-1">
            {product.name}
          </h2>
          <Link
            href={`/search?brand=${encodeURIComponent(product.brand_name)}`}
            className="text-muted-foreground mt-0.5 inline-block hover:text-foreground transition-colors"
          >
            {product.brand_name}
          </Link>
        </div>

        {/* Price */}
        <div>
          <div className="flex items-baseline gap-2">
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
          <p className="text-xs text-muted-foreground mt-1">
            Price updated {formatRelativeTime(listing.last_seen_at)} · confirm at
            dispensary before you go
          </p>
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
        <Link
          href={`/dispensary/${dispensary.slug}`}
          className="block bg-muted rounded-lg p-4 border border-border hover:border-primary/40 transition-colors"
        >
          <p className="text-sm text-muted-foreground">Available at</p>
          <p className="font-semibold text-foreground">{dispensary.name}</p>
          {dispensary.city && (
            <p className="text-sm text-muted-foreground">{dispensary.city}, RI</p>
          )}
        </Link>

        {/* Actions */}
        <div className="flex gap-3">
          {buyUrl && (
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ className: "flex-1" })}
            >
              Buy at {dispensary.name}
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </a>
          )}
          <Button
            variant={isUpvoted ? "default" : "outline"}
            size="icon"
            onClick={toggle}
            aria-label={isUpvoted ? "Remove upvote" : "Upvote"}
            aria-pressed={isUpvoted}
          >
            <ChevronUp
              className={cn("w-5 h-5", isUpvoted && "stroke-[3]")}
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
