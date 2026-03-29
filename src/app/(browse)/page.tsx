import Link from "next/link"
import { getInventory, getDrops } from "@/lib/queries/products"
import { getDispensaries } from "@/lib/queries/dispensaries"
import { ProductCard } from "@/components/product/product-card"
import { getFreshnessBadge } from "@/lib/utils"
import { ArrowRight, MapPin } from "lucide-react"

export const revalidate = 1800

const CATEGORIES = [
  "Flower",
  "Concentrates",
  "Edibles",
  "Pre-Rolls",
  "Vapes",
  "Tinctures",
  "Topicals",
]

export default async function HomePage() {
  const [allListings, drops, dispensaries] = await Promise.all([
    getInventory(),
    getDrops(14),
    getDispensaries(),
  ])

  const deals = allListings.filter((l) => (l.discount_amount ?? 0) > 0)
  const brandCount = new Set(allListings.map((l) => l.product.brand_name)).size

  // Pick 6 random deals
  const featuredDeals = shuffleAndTake(deals, 6)

  // Pick 6 latest drops
  const latestDrops = drops.slice(0, 6)
  const dropBadges = new Map(
    latestDrops
      .map((d) => {
        const badge = getFreshnessBadge(d.dropped_at)
        return badge ? ([d.id, badge] as const) : null
      })
      .filter(Boolean) as [string, { label: string; className: string }][]
  )

  return (
    <div>
      {/* Hero */}
      <section className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Rhode Island
            <br />
            Dispensary Menus
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Browse cannabis products across {dispensaries.length} dispensaries.
            Find deals, discover new drops.
          </p>

          {/* Category pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/menu?category=${encodeURIComponent(cat.toLowerCase())}`}
                className="px-4 py-2 text-sm font-medium rounded-full border border-border bg-white text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* Stats */}
          <p className="mt-6 text-sm text-muted-foreground">
            {allListings.length.toLocaleString()} products &middot;{" "}
            {dispensaries.length} dispensaries &middot; {brandCount}+ brands
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* Deals */}
        {featuredDeals.length > 0 && (
          <section className="py-8">
            <SectionHeader title="Deals Right Now" href="/deals" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {featuredDeals.map((listing) => (
                <ProductCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        )}

        {/* Drops */}
        {latestDrops.length > 0 && (
          <section className="py-8">
            <SectionHeader title="Just Dropped" href="/drops" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {latestDrops.map((listing) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  dropBadge={dropBadges.get(listing.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Dispensaries */}
        <section className="py-8 pb-12">
          <SectionHeader title="Dispensaries" href="/dispensary" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dispensaries.map((d) => (
              <Link
                key={d.id}
                href={`/dispensary/${d.slug}`}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {d.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.city}, RI &middot; {d.product_count} products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-heading text-2xl font-bold text-foreground">
        {title}
      </h2>
      <Link
        href={href}
        className="text-sm text-primary hover:underline flex items-center gap-1"
      >
        See all <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

function shuffleAndTake<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}
