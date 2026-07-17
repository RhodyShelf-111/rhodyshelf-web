import Link from "next/link"
import { getDrops } from "@/lib/queries/products"
import { DropsClient } from "./drops-client"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { JsonLd } from "@/components/seo/json-ld"
import {
  collectionPageJsonLd,
  ITEM_LIST_MAX,
} from "@/lib/seo/structured-data"
import { pageOpenGraph } from "@/lib/seo/og"
import type { Metadata } from "next"

export const revalidate = 3600 // 1 hour

const TITLE = "New Cannabis Drops — Rhode Island Dispensaries"
const DESCRIPTION =
  "Newly added cannabis products across Rhode Island dispensaries. See what just hit the shelves in the last 14 days."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/drops" },
  openGraph: pageOpenGraph({ title: TITLE, description: DESCRIPTION, url: "/drops" }),
}

export default async function DropsPage() {
  // 14-day window is now enforced in RhodyShelf DB via RLS on product_drops.
  const drops = await getDrops()

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/drops",
          itemCount: drops.length,
          itemPaths: drops.slice(0, ITEM_LIST_MAX).map((d) => `/product/${d.id}`),
        })}
      />
      <PageHeading
        title="New Drops"
        description="Products added in the last 14 days"
      />

      {drops.length > 0 ? (
        <DropsClient drops={drops} />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-foreground mb-2">
            No new products in the last 14 days
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            New arrivals show up here as dispensaries add them. In the meantime,
            browse the full selection.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse all products
          </Link>
        </div>
      )}
    </PageContainer>
  )
}
