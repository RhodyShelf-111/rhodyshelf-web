import Link from "next/link"
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
    </div>
  )
}
