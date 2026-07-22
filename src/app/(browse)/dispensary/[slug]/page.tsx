import { notFound } from "next/navigation"
import { MapPin, ExternalLink } from "lucide-react"
import { getDispensaryBySlug, getDispensaries } from "@/lib/queries/dispensaries"
import {
  getInventoryByDispensary,
  INITIAL_LISTINGS,
} from "@/lib/queries/products"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { JsonLd } from "@/components/seo/json-ld"
import { storeJsonLd } from "@/lib/seo/structured-data"
import { pageOpenGraph } from "@/lib/seo/og"
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
    openGraph: pageOpenGraph({
      title,
      description,
      url: `/dispensary/${slug}`,
    }),
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

  // The full menu is fetched (cached) by dispensary id — robust to a null slug
  // — for the count + SEO, but only the first slice ships in the payload; the
  // grid fetches the rest from /api/listings (same source, one snapshot) so a
  // big store's ~900 listings aren't shipped up front.
  const all = await getInventoryByDispensary(dispensary.id)
  const total = all.length
  const dispensaryListings = all.slice(0, INITIAL_LISTINGS)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd data={storeJsonLd(dispensary, total)} />
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
              {total.toLocaleString()} products available
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

      {/* Keyword intro only when there IS a live menu — otherwise it would
          contradict the empty state below and get ISR-cached that way. */}
      {total > 0 && (
        <p className="text-muted-foreground max-w-2xl mb-6 -mt-2">
          Full recreational cannabis menu for {dispensary.name}
          {dispensary.city ? ` in ${dispensary.city}, RI` : " in Rhode Island"} —
          compare live prices, potency, and deals. Menus refresh throughout the
          day.
        </p>
      )}

      {total > 0 ? (
        <MenuClient
          listings={dispensaryListings}
          showDispensary={false}
          headingLabel={`${dispensary.name} menu`}
          loadRest={{ total, scope: "dispensary", value: dispensary.slug }}
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
