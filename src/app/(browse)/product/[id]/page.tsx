import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, MapPin, ArrowLeft } from "lucide-react"
import { getListingById } from "@/lib/queries/products"
import { formatPrice, getCategoryIcon } from "@/lib/utils"
import { DealBadge } from "@/components/product/deal-badge"
import type { Metadata } from "next"

export const revalidate = 1800

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) return { title: "Product Not Found" }

  return {
    title: `${listing.product.name} — ${listing.product.brand_name}`,
    description: `${listing.product.name} by ${listing.product.brand_name} at ${listing.dispensary.name}. ${formatPrice(listing.price) ?? "See dispensary for price."}`,
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) notFound()

  const { product, dispensary, price, discount_amount, thc_percent, cbd_percent } =
    listing
  const isOnSale = (discount_amount ?? 0) > 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to menu
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl">
              {getCategoryIcon(product.category)}
            </div>
          )}
          {isOnSale && (
            <div className="absolute top-3 left-3">
              <DealBadge />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground capitalize">
              {product.category}
              {product.strain_type ? ` · ${product.strain_type}` : ""}
              {product.weight_display ? ` · ${product.weight_display}` : ""}
            </p>
            <h1 className="font-heading text-2xl font-bold text-foreground mt-1">
              {product.name}
            </h1>
            <p className="text-muted-foreground mt-0.5">
              {product.brand_name}
            </p>
          </div>

          <div className="text-3xl font-bold text-foreground">
            {formatPrice(price) ?? (
              <span className="text-base font-normal text-muted-foreground">
                See dispensary for price
              </span>
            )}
          </div>

          {(thc_percent != null || cbd_percent != null) && (
            <div className="flex gap-4">
              {thc_percent != null && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-xs text-muted-foreground">THC</p>
                  <p className="text-lg font-semibold">
                    {thc_percent.toFixed(1)}%
                  </p>
                </div>
              )}
              {cbd_percent != null && cbd_percent > 0 && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-xs text-muted-foreground">CBD</p>
                  <p className="text-lg font-semibold">
                    {cbd_percent.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-surface rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Available at</p>
            <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-4 h-4 text-primary" />
              {dispensary.name}
            </p>
            {dispensary.city && (
              <p className="text-sm text-muted-foreground ml-5.5">
                {dispensary.city}, RI
              </p>
            )}
          </div>

          {dispensary.menu_url && (
            <a
              href={dispensary.menu_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full h-9 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View on {dispensary.name}
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
