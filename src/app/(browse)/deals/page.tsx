import Link from "next/link"
import { DEALS_CAP, getDeals } from "@/lib/queries/products"
import { MenuClient } from "../menu/menu-client"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { JsonLd } from "@/components/seo/json-ld"
import {
  collectionPageJsonLd,
  ITEM_LIST_MAX,
} from "@/lib/seo/structured-data"
import { pageOpenGraph } from "@/lib/seo/og"
import type { Metadata } from "next"

export const revalidate = 900

/**
 * How many deals get serialized into the page.
 *
 * getDeals() already caps at 400 server-side, but the grid renders 50 at a time
 * and nothing past card 50 is reachable without a tap — so the page was putting
 * ~780 KB of RSC payload (70 KB gzipped) on the wire for 219 listings today and
 * up to 400 on a heavy sale day. 150 leaves three full pages of "Load more"
 * behind the fold. Not disclosed in the heading: the grid fetches the rest
 * (up to DEALS_CAP), so the slice is a paint optimization, not a shorter list.
 */
export const DEALS_SHOWN = 150

const TITLE = "Cannabis Deals — Rhode Island Dispensaries"
const DESCRIPTION =
  "Cannabis deals and discounts across Rhode Island dispensaries. Find products on sale right now, ranked by discount."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/deals" },
  openGraph: pageOpenGraph({ title: TITLE, description: DESCRIPTION, url: "/deals" }),
}

export default async function DealsPage() {
  // Top deals by discount percent, capped server-side; total is uncapped.
  const { listings, total } = await getDeals()
  // Ordered by discount desc, so the first slice is the best deals — the reason
  // anyone opens this page. The rest arrives from /api/listings via loadRest,
  // which matters for correctness and not just payload size: the grid filters
  // over exactly the array it holds, so a capped page would filter the top 150
  // only and could report "no edibles on sale" while some sat at rank 200.
  const deals = listings.slice(0, DEALS_SHOWN)
  // What /api/listings?scope=deals can actually hand back (getDeals is capped);
  // `total` above is the uncapped count and stays the headline number.
  const fullSetSize = Math.min(total, DEALS_CAP)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/deals",
          itemCount: total,
          itemPaths: deals.slice(0, ITEM_LIST_MAX).map((l) => `/product/${l.id}`),
        })}
      />
      <PageHeading
        title="Deals"
        description={`${total.toLocaleString()} products on sale right now`}
      />

      {deals.length > 0 ? (
        <MenuClient
          listings={deals}
          defaultSort="discount-desc"
          headingLabel="Deals"
          // Only fetch the rest when there IS a rest.
          // The endpoint serves getDeals(), which is capped at DEALS_CAP — so
          // the grid must be told THAT number, not the uncapped headline count.
          // Handing it `total` would make the heading promise rows the fetch can
          // never return, and "Load more (N remaining)" would never reach zero.
          loadRest={
            fullSetSize > deals.length
              ? { total: fullSetSize, scope: "deals" }
              : undefined
          }
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
