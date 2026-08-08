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

/**
 * How many drops get serialized into the page.
 *
 * The 14-day window holds ~430 listings and the grid only ever renders 50 at a
 * time, so shipping the whole window put ~950 KB of RSC payload (97 KB gzipped)
 * on the wire — the heaviest route on the site, and one the nav prefetches — to
 * paint cards almost no session scrolls to.
 *
 * This is a first-paint slice, not a shorter window: the grid fetches the rest
 * from /api/listings?scope=drops via loadRest, so filtering still runs over all
 * 14 days. Deliberately not disclosed in the heading for that reason.
 */
export const DROPS_SHOWN = 150

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
  const all = await getDrops()
  // Newest first (getDrops orders by dropped_at desc), so the first slice is
  // the freshest end — the whole point of the page. The rest of the window
  // arrives from /api/listings via loadRest, which keeps client-side filtering
  // over the complete 14 days rather than just the newest slice.
  const drops = all.slice(0, DROPS_SHOWN)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/drops",
          // The true window size, not the rendered cap — the collection really
          // does hold this many.
          itemCount: all.length,
          itemPaths: drops.slice(0, ITEM_LIST_MAX).map((d) => `/product/${d.id}`),
        })}
      />
      <PageHeading
        title="New Drops"
        description="Products added in the last 14 days"
      />

      {drops.length > 0 ? (
        <DropsClient
          drops={drops}
          total={all.length > drops.length ? all.length : undefined}
        />
      ) : (
        <div className="text-center py-16">
          <p className="text-subhead font-medium text-foreground mb-2">
            No new products in the last 14 days
          </p>
          <p className="text-body text-muted-foreground mb-6">
            New arrivals show up here as dispensaries add them. In the meantime,
            browse the full selection.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center h-10 px-5 text-body font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse all products
          </Link>
        </div>
      )}
    </PageContainer>
  )
}
