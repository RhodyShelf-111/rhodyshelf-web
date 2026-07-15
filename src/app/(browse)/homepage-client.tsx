"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { CategorySection, InventoryListing } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"
import { getCategoryIcon } from "@/lib/utils"

interface HomepageClientProps {
  sections: CategorySection[]
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function HomepageClient({ sections }: HomepageClientProps) {
  const [shuffled, setShuffled] = useState<Map<string, InventoryListing[]>>(
    () => new Map(sections.map((s) => [s.key, s.listings.slice(0, 6)]))
  )

  // Shuffle on mount so each page load shows different cards. Intentionally a
  // post-mount setState: shuffling during render would cause an SSR/client
  // hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShuffled(
      new Map(sections.map((s) => [s.key, shuffle(s.listings).slice(0, 6)]))
    )
  }, [sections])

  return (
    <div className="space-y-4">
        {sections.map((section) => {
          const cards = shuffled.get(section.key) ?? section.listings.slice(0, 6)
          return (
            <section key={section.key} className="rounded-xl bg-card border border-border overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{getCategoryIcon(section.key)}</span>
                  <h2 className="font-heading text-[17px] font-bold text-foreground">
                    {section.label}
                  </h2>
                  <span className="text-[13px] text-muted-foreground">
                    {section.count.toLocaleString()} products
                  </span>
                </div>
                <Link
                  href={`/search?category=${encodeURIComponent(section.key)}`}
                  className="-my-3 inline-flex min-h-11 shrink-0 items-center py-3 text-sm text-primary hover:underline"
                >
                  View all →
                </Link>
              </div>

              {/* Product cards row — horizontal scroll on every breakpoint so
                  mobile gets real merchandising, not just a list of links.
                  snap-proximity (not -mandatory) lets the last card rest at the
                  end instead of being yanked back and clipped; scroll-px matches
                  the rail padding so a snapped card isn't flush to the edge;
                  overscroll-x-contain stops an iOS edge swipe from triggering
                  back-navigation off the homepage. */}
              <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 overflow-x-auto overscroll-x-contain scroll-px-3 sm:scroll-px-4 scrollbar-subtle items-stretch snap-x snap-proximity">
                {cards.map((listing) => (
                  <div
                    key={listing.id}
                    className="w-[46vw] sm:w-56 max-w-[15rem] shrink-0 snap-start"
                  >
                    <ProductCard listing={listing} />
                  </div>
                ))}
              </div>

              {/* Trailing browse CTA (mobile) */}
              <Link
                href={`/search?category=${encodeURIComponent(section.key)}`}
                className="sm:hidden flex items-center justify-between px-4 py-3 text-sm font-medium text-primary border-t border-border hover:bg-muted transition-colors"
              >
                <span>Browse all {section.count.toLocaleString()} {section.label}</span>
                <span aria-hidden>→</span>
              </Link>
            </section>
          )
        })}
    </div>
  )
}
