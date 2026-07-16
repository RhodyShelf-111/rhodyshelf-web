import { notFound } from "next/navigation"
import { MapPin, ExternalLink } from "lucide-react"
import { getDispensaryBySlug, getDispensaries } from "@/lib/queries/dispensaries"
import { getInventoryByDispensary } from "@/lib/queries/products"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { JsonLd } from "@/components/seo/json-ld"
import { storeJsonLd } from "@/lib/seo/structured-data"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { MenuClient } from "../../menu/menu-client"
import type { Metadata } from "next"

export const revalidate = 1800

export async function generateStaticParams() {
  const dispensaries = await getDispensaries()
  return dispensaries
    .filter((d) => d.slug)
    .map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const dispensary = await getDispensaryBySlug(slug)
  if (!dispensary) return { title: "Dispensary Not Found" }

  const loc = dispensary.city ? `${dispensary.city}, RI` : "Rhode Island"
  const title = `${dispensary.name} Menu — Cannabis Dispensary in ${loc}`
  const description = `Browse ${dispensary.name}'s full cannabis menu in ${loc}. Compare prices, potency, and deals across Rhode Island dispensaries.`

  return {
    title,
    description,
    alternates: { canonical: `/dispensary/${slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/dispensary/${slug}`,
    },
  }
}

export default async function DispensaryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const dispensary = await getDispensaryBySlug(slug)
  if (!dispensary) notFound()

  const dispensaryListings = await getInventoryByDispensary(dispensary.id)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd data={storeJsonLd(dispensary, dispensaryListings.length)} />
      <Breadcrumbs
        items={[
          { name: "Dispensaries", href: "/dispensary" },
          { name: dispensary.name, href: `/dispensary/${slug}` },
        ]}
      />

      {/* Header */}
      <PageHeading
        title={dispensary.name}
        description={
          <div className="space-y-1">
            {dispensary.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {dispensary.city}, RI
              </span>
            )}
            <span className="block text-sm">
              {dispensaryListings.length} products available
            </span>
          </div>
        }
        actions={
          dispensary.menu_url && (
            <a
              href={dispensary.menu_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center h-11 sm:h-9 px-4 sm:px-3 text-sm sm:text-[0.8rem] font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              Visit Site
              <ExternalLink className="w-4 h-4 sm:w-3.5 sm:h-3.5 ml-1.5" />
            </a>
          )
        }
      />

      <p className="text-muted-foreground max-w-2xl mb-6 -mt-2">
        Full recreational cannabis menu for {dispensary.name}
        {dispensary.city ? ` in ${dispensary.city}, RI` : " in Rhode Island"} —
        compare live prices, potency, and deals. Menus refresh throughout the
        day.
      </p>

      {dispensaryListings.length > 0 ? (
        <MenuClient
          listings={dispensaryListings}
          showDispensary={false}
          headingLabel={`${dispensary.name} menu`}
        />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-foreground mb-2">
            No products available
          </p>
          <p className="text-sm text-muted-foreground">
            This dispensary&apos;s menu may be updating.
          </p>
        </div>
      )}
    </PageContainer>
  )
}
