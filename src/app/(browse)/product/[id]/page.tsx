import { notFound } from "next/navigation"
import Link from "next/link"
import { ExternalLink, MapPin } from "lucide-react"
import {
  getListingById,
  getInventoryByBrand,
  getBrands,
} from "@/lib/queries/products"
import { formatPrice, formatRelativeTime } from "@/lib/utils"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { JsonLd } from "@/components/seo/json-ld"
import { productJsonLd } from "@/lib/seo/structured-data"
import { PageContainer } from "@/components/layout/page-container"
import { DealBadge } from "@/components/product/deal-badge"
import { ProductCard } from "@/components/product/product-card"
import { ProductHeroImage } from "@/components/product/product-hero-image"
import { UpvoteButton } from "@/components/product/upvote-button"
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

  const image = listing.image_url ?? listing.product.image_url
  const description = `${listing.product.name} by ${listing.product.brand_name} at ${listing.dispensary.name}. ${formatPrice(listing.price) ?? "See dispensary for price."}`

  return {
    title: `${listing.product.name} — ${listing.product.brand_name}`,
    description,
    alternates: { canonical: `/product/${id}` },
    openGraph: {
      type: "website",
      title: `${listing.product.name} — ${listing.product.brand_name}`,
      description,
      url: `/product/${id}`,
      images: image ? [image] : undefined,
    },
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
  // Per-product deep-link into the dispensary menu (primary CTA); falls back to
  // the dispensary-level menu_url when a row has no product_url.
  const buyUrl = listing.product_url ?? dispensary.menu_url

  // "More from this brand" rail (cached per brand). Exclude the current
  // listing. Secondary content: degrade to no rail rather than 500 the page
  // if the brand fetch fails.
  const brandListings = (
    await getInventoryByBrand(product.brand_name).catch(() => [])
  )
    .filter((l) => l.id !== listing.id)
    .slice(0, 12)

  // Prefer the indexable /brand/[slug] page when this brand has a canonical
  // row; otherwise fall back to the (noindex) search filter. Reuses the cached
  // brands list — no extra DB round-trip. This is the main internal link that
  // keeps brand landing pages from being orphaned.
  const brands = await getBrands().catch(() => [])
  const brandRow = brands.find(
    (b) =>
      (product.brand_id && b.id === product.brand_id) ||
      b.canonical_name === product.brand_name
  )
  const brandHref = brandRow?.slug
    ? `/brand/${brandRow.slug}`
    : `/search?brand=${encodeURIComponent(product.brand_name)}`

  return (
    <PageContainer className="max-w-5xl py-6 md:py-8">
      <JsonLd data={productJsonLd(listing)} />
      <Breadcrumbs
        items={[
          {
            name:
              product.category.charAt(0).toUpperCase() +
              product.category.slice(1),
            href: `/search?category=${encodeURIComponent(product.category)}`,
          },
          { name: product.name, href: `/product/${id}` },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image — shorter on mobile (single column) so the title, price, and
            key facts sit higher; square on md+ where it shares the row. */}
        <div className="relative aspect-[4/3] md:aspect-square bg-muted rounded-xl overflow-hidden border border-border">
          <ProductHeroImage
            imageUrl={imageUrl}
            alt={product.name}
            category={product.category}
          />
          {isOnSale && (
            <div className="absolute top-3 left-3">
              <DealBadge percent={discount_percent} />
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
            <h1 className="font-heading text-3xl font-bold text-foreground mt-1">
              {product.name}
            </h1>
            <Link
              href={brandHref}
              className="text-muted-foreground mt-0.5 inline-block hover:text-foreground transition-colors"
            >
              {product.brand_name}
            </Link>
          </div>

          <div>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-3xl font-bold text-foreground">
                {formatPrice(price) ?? (
                  <span className="text-base font-normal text-muted-foreground">
                    See dispensary for price
                  </span>
                )}
              </span>
              {showStrike && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(original_price)}
                </span>
              )}
              {showStrike && (
                <span className="text-sm font-semibold text-primary">
                  Save {formatPrice((original_price ?? 0) - (price ?? 0))}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Price updated {formatRelativeTime(listing.last_seen_at)} · confirm
              at dispensary before you go
            </p>
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

          <Link
            href={`/dispensary/${dispensary.slug}`}
            className="block bg-muted rounded-xl p-4 border border-border hover:border-primary/40 transition-colors"
          >
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
          </Link>

          {/* Desktop actions — inline beside the image. On mobile these move to
              a sticky bar pinned to the bottom of the page (below). */}
          <div className="hidden md:flex gap-3">
            {buyUrl && (
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 h-12 px-4 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="truncate">Buy at {dispensary.name}</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            )}
            <UpvoteButton
              productId={product.id}
              withLabel
              className="h-12 px-4 shrink-0"
            />
          </div>
        </div>
      </div>

      {/* More from this brand */}
      {brandListings.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-heading text-lg font-bold text-foreground">
              More from {product.brand_name}
            </h2>
            <Link
              href={brandHref}
              className="text-sm text-primary hover:underline shrink-0"
            >
              View all →
            </Link>
          </div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-subtle -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-2 items-stretch snap-x">
            {brandListings.map((l) => (
              <div
                key={l.id}
                className="w-[46vw] sm:w-52 max-w-[14rem] shrink-0 snap-start"
              >
                <ProductCard listing={l} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky buy bar — the money action is otherwise ~700px down the
          single-column page. Sticky (not fixed) so it un-pins at the end and
          never covers the footer; pb clears the iOS home indicator. Hidden on
          md+ where the inline Buy row already sits beside the image. */}
      {buyUrl && (
        <div className="md:hidden sticky bottom-0 z-40 -mx-4 mt-8 flex items-center gap-3 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6">
          <div className="min-w-0 shrink-0">
            <p className="text-lg font-bold leading-tight text-foreground">
              {formatPrice(price) ?? (
                <span className="text-sm font-normal text-muted-foreground">
                  See dispensary
                </span>
              )}
            </p>
            {showStrike && (
              <p className="text-xs text-muted-foreground line-through">
                {formatPrice(original_price)}
              </p>
            )}
          </div>
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="truncate">Buy at {dispensary.name}</span>
            <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
          <UpvoteButton productId={product.id} className="h-12 w-12 shrink-0" />
        </div>
      )}
    </PageContainer>
  )
}
