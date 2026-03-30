import { notFound } from "next/navigation"
import { MapPin, ExternalLink } from "lucide-react"
import { getDispensaryBySlug, getDispensaries } from "@/lib/queries/dispensaries"
import { getInventory } from "@/lib/queries/products"
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

  return {
    title: `${dispensary.name} Menu`,
    description: `Browse ${dispensary.name}'s full cannabis menu in ${dispensary.city ?? "Rhode Island"}. Compare prices and find deals.`,
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

  const allListings = await getInventory()
  const dispensaryListings = allListings.filter(
    (l) => l.dispensary.slug === slug
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {dispensary.name}
            </h1>
            {dispensary.city && (
              <p className="text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {dispensary.city}, RI
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {dispensaryListings.length} products available
            </p>
          </div>

          {dispensary.menu_url && (
            <a
              href={dispensary.menu_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-7 px-2.5 text-[0.8rem] font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              Visit Site
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          )}
        </div>
      </div>

      {dispensaryListings.length > 0 ? (
        <MenuClient listings={dispensaryListings} />
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
    </div>
  )
}
