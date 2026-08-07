import { notFound } from "next/navigation"
import {
  getBrandBySlug,
  getBrands,
  getInventoryByBrand,
} from "@/lib/queries/products"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { JsonLd } from "@/components/seo/json-ld"
import {
  collectionPageJsonLd,
  ITEM_LIST_MAX,
} from "@/lib/seo/structured-data"
import { pageOpenGraph } from "@/lib/seo/og"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { MenuClient } from "../../menu/menu-client"
import type { Metadata } from "next"

export const revalidate = 3600

/**
 * How many of a brand's listings get serialized into the page.
 *
 * A big brand runs 240-260 listings (~720-840 KB of RSC payload) while the grid
 * renders 50 at a time — so the shopper waited on 5x the data they could see.
 * Same trade the /deals cap makes. Not disclosed in the heading: the grid
 * fetches the rest, so the slice is a paint optimization, not a shorter list.
 */
export const BRAND_LISTINGS_SHOWN = 150

export async function generateStaticParams() {
  const brands = await getBrands()
  return brands
    .filter((b) => b.slug)
    .map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) return { title: "Brand Not Found" }

  const title = `${brand.canonical_name} Products`
  const description = `Browse all ${brand.canonical_name} cannabis products available across Rhode Island dispensaries.`

  return {
    title,
    description,
    alternates: { canonical: `/brand/${slug}` },
    openGraph: pageOpenGraph({ title, description, url: `/brand/${slug}` }),
  }
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) notFound()

  const all = await getInventoryByBrand(brand.canonical_name)
  const total = all.length
  // Sorted A-Z by product name, so the slice is the front of the list the
  // shopper is already reading; the rest arrives from /api/listings?scope=brand
  // via loadRest below.
  const brandListings = all.slice(0, BRAND_LISTINGS_SHOWN)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: `${brand.canonical_name} Products`,
          description: `${brand.canonical_name} cannabis products available across Rhode Island dispensaries.`,
          path: `/brand/${slug}`,
          // The brand's true catalog size, not the rendered slice.
          itemCount: total,
          itemPaths: brandListings
            .slice(0, ITEM_LIST_MAX)
            .map((l) => `/product/${l.id}`),
        })}
      />
      <Breadcrumbs
        items={[{ name: brand.canonical_name, href: `/brand/${slug}` }]}
      />

      <PageHeading
        title={brand.canonical_name}
        description={`${total.toLocaleString()} products across Rhode Island`}
      />

      {brandListings.length > 0 ? (
        <MenuClient
          listings={brandListings}
          headingLabel={`${brand.canonical_name} products`}
          // Only fetch the rest when there IS a rest. Without this a big brand
          // would filter over its alphabetically-first slice only, so asking
          // for its edibles could come back empty while they sat past "M".
          loadRest={
            total > brandListings.length
              ? { total, scope: "brand", value: slug }
              : undefined
          }
        />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-foreground mb-2">
            No products currently available
          </p>
          <p className="text-sm text-muted-foreground">
            This brand may not have active inventory right now.
          </p>
        </div>
      )}
    </PageContainer>
  )
}
