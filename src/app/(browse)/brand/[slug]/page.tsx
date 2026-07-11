import { notFound } from "next/navigation"
import {
  getBrandBySlug,
  getBrands,
  getInventoryByBrand,
} from "@/lib/queries/products"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { PageContainer } from "@/components/layout/page-container"
import { MenuClient } from "../../menu/menu-client"
import type { Metadata } from "next"

export const revalidate = 3600

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

  return {
    title: `${brand.canonical_name} Products`,
    description: `Browse all ${brand.canonical_name} cannabis products available across Rhode Island dispensaries.`,
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

  const brandListings = await getInventoryByBrand(brand.canonical_name)

  return (
    <PageContainer className="py-6 md:py-8">
      <Breadcrumbs
        items={[{ name: brand.canonical_name, href: `/brand/${slug}` }]}
      />

      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {brand.canonical_name}
        </h1>
        <p className="text-muted-foreground mt-1">
          {brandListings.length} products across Rhode Island
        </p>
      </div>

      {brandListings.length > 0 ? (
        <MenuClient listings={brandListings} />
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
