import Link from "next/link"
import { getBrands } from "@/lib/queries/products"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { JsonLd } from "@/components/seo/json-ld"
import { collectionPageJsonLd } from "@/lib/seo/structured-data"
import type { Metadata } from "next"

export const revalidate = 3600

const TITLE = "Cannabis Brands — Rhode Island Dispensaries"
const DESCRIPTION =
  "Browse every cannabis brand carried across Rhode Island dispensaries. Find a brand to see its products, prices, and where to buy."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/brand" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: "/brand" },
}

export default async function BrandListPage() {
  // Only brands with a real slug have an indexable landing page.
  const brands = (await getBrands()).filter((b) => b.slug)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/brand",
          itemCount: brands.length,
          itemPaths: brands.map((b) => `/brand/${b.slug}`),
        })}
      />
      <PageHeading
        title={TITLE}
        description={`${brands.length} brands across Rhode Island dispensaries`}
      />

      {brands.length > 0 ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {brands.map((b) => (
            <li key={b.id}>
              <Link
                href={`/brand/${b.slug}`}
                className="flex min-h-11 items-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="truncate">{b.canonical_name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-foreground mb-2">
            No brands available right now
          </p>
          <p className="text-sm text-muted-foreground">
            Menus refresh throughout the day — check back soon.
          </p>
        </div>
      )}
    </PageContainer>
  )
}
