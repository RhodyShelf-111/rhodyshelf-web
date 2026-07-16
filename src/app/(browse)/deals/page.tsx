import Link from "next/link"
import { getDeals } from "@/lib/queries/products"
import { MenuClient } from "../menu/menu-client"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { JsonLd } from "@/components/seo/json-ld"
import { collectionPageJsonLd } from "@/lib/seo/structured-data"
import type { Metadata } from "next"

export const revalidate = 900

const TITLE = "Cannabis Deals — Rhode Island Dispensaries"
const DESCRIPTION =
  "Cannabis deals and discounts across Rhode Island dispensaries. Find products on sale right now, ranked by discount."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/deals" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: "/deals" },
}

export default async function DealsPage() {
  // Top deals by discount percent, capped server-side; total is uncapped.
  const { listings: deals, total } = await getDeals()

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/deals",
          itemCount: total,
          itemPaths: deals.map((l) => `/product/${l.id}`),
        })}
      />
      <PageHeading
        title="Deals"
        description={
          <>
            {total.toLocaleString()} products on sale right now
            {total > deals.length
              ? ` — showing the top ${deals.length} by discount`
              : ""}
          </>
        }
      />

      {deals.length > 0 ? (
        <MenuClient
          listings={deals}
          defaultSort="discount-desc"
          headingLabel="Deals"
        />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-foreground mb-2">
            No deals listed right now
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Menus refresh throughout the day — check back soon, or browse the
            full selection.
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
