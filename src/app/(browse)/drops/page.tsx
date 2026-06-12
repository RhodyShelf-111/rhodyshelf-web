import { getDrops } from "@/lib/queries/products"
import { DropsClient } from "./drops-client"
import type { Metadata } from "next"

export const revalidate = 3600 // 1 hour

export const metadata: Metadata = {
  title: "New Drops",
  description:
    "Newly added cannabis products across Rhode Island dispensaries. See what just hit the shelves.",
}

export default async function DropsPage() {
  // 14-day window is now enforced in RhodyShelf DB via RLS on product_drops.
  const drops = await getDrops()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          New Drops
        </h1>
        <p className="text-muted-foreground mt-1">
          Products added in the last 14 days
        </p>
      </div>

      {drops.length > 0 ? (
        <DropsClient drops={drops} />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-foreground mb-2">
            No new products this week
          </p>
          <p className="text-sm text-muted-foreground">
            Check back soon for new arrivals.
          </p>
        </div>
      )}
    </div>
  )
}
