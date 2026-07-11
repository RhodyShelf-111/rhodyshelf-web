import Link from "next/link"
import { MapPin, Tag, ShoppingBag } from "lucide-react"
import { getDispensaries } from "@/lib/queries/dispensaries"
import type { DispensaryWithCounts } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import type { Metadata } from "next"

export const revalidate = 1800

export const metadata: Metadata = {
  title: "Dispensaries",
  description:
    "Browse every Rhode Island cannabis dispensary. See menus, product counts, and deals at each location.",
  alternates: { canonical: "/dispensary" },
}

export default async function DispensaryListPage() {
  const dispensaries = await getDispensaries()
  // Biggest live menus first; dispensaries without fresh inventory sink to the
  // bottom. Stable alphabetical tiebreak.
  const sorted = [...dispensaries].sort(
    (a, b) => b.product_count - a.product_count || a.name.localeCompare(b.name)
  )
  const liveCount = sorted.filter((d) => d.product_count > 0).length

  return (
    <PageContainer className="py-6 md:py-8">
      <PageHeading
        title="Dispensaries"
        description={
          liveCount === dispensaries.length
            ? `${dispensaries.length} locations across Rhode Island`
            : `${liveCount} of ${dispensaries.length} Rhode Island locations with live menus`
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((d) => (
          <DispensaryCard key={d.id} dispensary={d} />
        ))}
      </div>
    </PageContainer>
  )
}

function DispensaryCard({ dispensary: d }: { dispensary: DispensaryWithCounts }) {
  const hasMenu = d.product_count > 0

  const inner = (
    <>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            hasMenu ? "bg-primary/10" : "bg-muted"
          )}
        >
          <MapPin
            className={cn(
              "w-5 h-5",
              hasMenu ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <div className="min-w-0">
          <h2
            className={cn(
              "font-semibold leading-tight line-clamp-2",
              hasMenu
                ? "text-foreground group-hover:text-primary transition-colors"
                : "text-foreground"
            )}
          >
            {d.name}
          </h2>
          {d.city && (
            <p className="text-sm text-muted-foreground mt-0.5">{d.city}, RI</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-auto pt-4 text-sm text-muted-foreground">
        {hasMenu ? (
          <>
            <span className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              {d.product_count.toLocaleString()} products
            </span>
            {d.deal_count > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <Tag className="w-3.5 h-3.5" />
                {d.deal_count} deals
              </span>
            )}
          </>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Menu coming soon
          </span>
        )}
      </div>
    </>
  )

  if (!hasMenu) {
    // No fresh inventory yet — show the location but don't link into an empty
    // menu page.
    return (
      <div
        aria-disabled="true"
        className="flex flex-col h-full p-5 rounded-xl border border-border bg-card/60 opacity-75 cursor-default"
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={`/dispensary/${d.slug}`}
      className="group flex flex-col h-full p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      {inner}
    </Link>
  )
}
