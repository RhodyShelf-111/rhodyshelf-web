import { getInventory } from "@/lib/queries/products"
import { MenuClient } from "../menu/menu-client"
import type { Metadata } from "next"

export const revalidate = 1800

export const metadata: Metadata = {
  title: "Deals",
  description:
    "Cannabis deals and discounts across Rhode Island dispensaries. Find products on sale now.",
}

export default async function DealsPage() {
  const allListings = await getInventory()
  const deals = allListings.filter((l) => (l.discount_amount ?? 0) > 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Deals
        </h1>
        <p className="text-muted-foreground mt-1">
          {deals.length} products on sale right now
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
