"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import type { CategorySection, InventoryListing } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"
import { ProductDetailDrawer } from "@/components/product/product-detail"
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
  const [selectedListing, setSelectedListing] = useState<InventoryListing | null>(null)

  // Shuffle on mount so each page load shows different cards
  useEffect(() => {
    setShuffled(
      new Map(sections.map((s) => [s.key, shuffle(s.listings).slice(0, 6)]))
    )
  }, [sections])

  const handleCardClick = useCallback((listing: InventoryListing) => {
    setSelectedListing(listing)
  }, [])

  return (
    <>
      <div className="space-y-4">
        {sections.map((section) => {
          const cards = shuffled.get(section.key) ?? section.listings.slice(0, 6)
          return (
            <section key={section.key} className="rounded-xl bg-card border border-border overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(section.key)}</span>
                  <h2 className="font-heading text-[17px] font-bold text-foreground">
                    {section.label}
                  </h2>
                  <span className="text-[13px] text-muted-foreground">
                    {section.count.toLocaleString()} products
                  </span>
                </div>
                <Link
                  href={`/search?category=${encodeURIComponent(section.key)}`}
                  className="text-sm text-primary hover:underline shrink-0"
                >
                  View all →
                </Link>
              </div>

              {/* Product cards row — hidden on mobile */}
              <div className="hidden sm:flex gap-4 p-4 overflow-x-auto scrollbar-subtle items-stretch">
                {cards.map((listing) => (
                  <div key={listing.id} className="w-56 shrink-0">
                    <ProductCard
                      listing={listing}
                      onClick={() => handleCardClick(listing)}
                    />
                  </div>
                ))}
              </div>

              {/* Mobile: full-width tap target */}
              <Link
                href={`/search?category=${encodeURIComponent(section.key)}`}
                className="sm:hidden flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <span>Browse {section.label}</span>
                <span className="text-primary">→</span>
              </Link>
            </section>
          )
        })}
      </div>

      <ProductDetailDrawer
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
      />
    </>
  )
}
