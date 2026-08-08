import Image from "next/image"
import Link from "next/link"
import { MapPin } from "lucide-react"
import type {
  ValueRow as ValueRowData,
  SizeBand,
  ValueCategory,
} from "@/lib/value-ranking"
import { formatPricePerMgThc, valueAnchor, VALUE_UNIT } from "@/lib/value-ranking"
import { DOSE_MG } from "@/lib/product-units"
import { formatPrice, formatUnitPrice } from "@/lib/utils"
import { shortDispensaryName } from "@/lib/dispensary-name"
import { CategoryIcon } from "@/components/ui/category-icon"

/**
 * One row on /best-value.
 *
 * Deliberately not ProductCard: that leads with an aspect-square image plate
 * and lands price seventh, which is exactly inverted for a page whose entire
 * purpose is the value figure. The anatomy here follows PriceComparisonPanel,
 * which already proves a dense comparison row works at mobile widths.
 */
export function ValueRow({
  row,
  band,
  rank,
}: {
  row: ValueRowData
  band: SizeBand
  rank: number
}) {
  const { listing } = row
  const { product, dispensary } = listing
  const image = listing.image_url ?? product.image_url
  // Shared helper, so this row prints the same rate the product card does —
  // "$3.14/g" for a gram category, "$1.20/10mg" for an edible.
  const perGram = formatUnitPrice(listing.price, product)
  const anchor = valueAnchor(row, band)

  // Screen readers say "$4.20/g" as "four twenty g". The row gets an explicit
  // label so the number is announced as money per unit.
  const isDose = VALUE_UNIT[product.category as ValueCategory] === "dose"
  const spokenPrice = `${row.unitRate.toFixed(2)} dollars per ${
    isDose ? `${DOSE_MG} milligrams of THC` : "gram"
  }`

  return (
    <li>
      <Link
        href={`/product/${listing.id}`}
        aria-label={`${product.name} by ${product.brand_name}, ${spokenPrice}, ${formatPrice(
          listing.price
        )} for ${product.weight_display ?? `${product.weight_grams}g`} at ${dispensary.name}`}
        className="flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
      >
        {/* Decorative: the accessible name already carries the ranking order
            through document order, and a leading digit would otherwise be the
            first thing announced for every row. */}
        <span
          aria-hidden
          className="w-5 shrink-0 text-center text-meta tabular-nums text-muted-foreground"
        >
          {rank}
        </span>

        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="44px"
              className="object-contain p-0.5"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <CategoryIcon
                category={product.category}
                className="size-5 text-muted-foreground"
              />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-foreground">
            {product.name}
          </p>
          <p className="truncate text-meta text-muted-foreground">
            {product.brand_name}
          </p>
          {/* Short name, same as the product card: this row squeezes name,
              brand and shop against a large $/g figure, so the registered name
              clipped mid-word. The accessible name above keeps the full one. */}
          <p className="mt-0.5 flex items-center gap-1 text-meta text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {shortDispensaryName(dispensary.name, dispensary.city)}
            </span>
          </p>
        </div>

        {/* The reason the page exists, so it is the largest type on the row. */}
        <div className="shrink-0 text-right">
          <p className="text-lead font-semibold tabular-nums text-foreground">
            {perGram}
          </p>
          <p className="text-meta tabular-nums text-muted-foreground">
            {formatPrice(listing.price)}
            {product.weight_display ? ` · ${product.weight_display}` : ""}
          </p>
          {anchor && (
            <p className="text-meta font-medium text-primary">
              {row.percentBelowTypical}% below typical
            </p>
          )}
          {row.pricePerMgThc != null && (
            <p className="text-meta tabular-nums text-muted-foreground">
              {formatPricePerMgThc(row.pricePerMgThc)}
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}
