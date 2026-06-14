import Link from "next/link"
import { MapPin, Tag, ShoppingBag } from "lucide-react"
import { getDispensaries } from "@/lib/queries/dispensaries"
import type { Metadata } from "next"

export const revalidate = 1800

export const metadata: Metadata = {
  title: "Dispensaries",
  description:
    "Browse every Rhode Island cannabis dispensary. See menus, product counts, and deals at each location.",
}

export default async function DispensaryListPage() {
  const dispensaries = await getDispensaries()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Dispensaries
        </h1>
        <p className="text-muted-foreground mt-1">
          {dispensaries.length} locations across Rhode Island
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dispensaries.map((d) => (
          <Link
            key={d.id}
            href={`/dispensary/${d.slug}`}
            className="group p-5 rounded-xl border border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {d.name}
                </h2>
                {d.city && (
                  <p className="text-sm text-muted-foreground">
                    {d.city}, RI
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                {d.product_count} products
              </span>
              {d.deal_count > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <Tag className="w-3.5 h-3.5" />
                  {d.deal_count} deals
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
