import { getInventory } from "@/lib/queries/products"
import { MenuClient } from "./menu-client"
import type { Metadata } from "next"

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: "Browse Menu",
  description:
    "Browse cannabis products across 8 Rhode Island dispensaries. Filter by category, brand, strain, price, and THC.",
}

export default async function MenuPage() {
  const listings = await getInventory()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Browse Menu
        </h1>
        <p className="text-muted-foreground mt-1">
          {listings.length.toLocaleString()} products across 8 Rhode Island
          dispensaries
        </p>
      </div>

      <MenuClient listings={listings} />
    </div>
  )
}
