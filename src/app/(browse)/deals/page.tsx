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
            No deals right now
          </p>
          <p className="text-sm text-muted-foreground">
            Check back after 5 PM when menus are updated.
          </p>
        </div>
      )}
    </div>
  )
}
