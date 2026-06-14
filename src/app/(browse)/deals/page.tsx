import Link from "next/link"
import { getDeals } from "@/lib/queries/products"
import { MenuClient } from "../menu/menu-client"
import type { Metadata } from "next"

export const revalidate = 900

export const metadata: Metadata = {
  title: "Deals",
  description:
    "Cannabis deals and discounts across Rhode Island dispensaries. Find products on sale now.",
}

export default async function DealsPage() {
  // Top deals by discount percent, capped server-side; total is uncapped.
  const { listings: deals, total } = await getDeals()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Deals
        </h1>
        <p className="text-muted-foreground mt-1">
          {total.toLocaleString()} products on sale right now
          {total > deals.length
            ? ` — showing the top ${deals.length} by discount`
            : ""}
        </p>
      </div>

      {deals.length > 0 ? (
        <MenuClient listings={deals} />
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
    </div>
  )
}
