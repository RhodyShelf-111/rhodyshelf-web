import Link from "next/link"
import type { CategorySection } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"
import { EAGER_IMAGE_COUNT } from "@/lib/image-priority"
import { CategoryIcon } from "@/components/ui/category-icon"

interface CategoryRailsProps {
  sections: CategorySection[]
}

/** Cards rendered per rail, out of the larger random sample the server draws
 *  for each category (re-drawn every revalidation, so the rails still rotate). */
export const CARDS_PER_RAIL = 6

/**
 * The homepage category rails.
 *
 * A server component on purpose. This used to re-pick all 42 cards in a mount
 * effect so every load showed different products, which meant the browser
 * started fetching the server-rendered images, then threw them away
 * milliseconds later — ~29 of ~73 image requests on every homepage load were
 * for cards that never made it to paint. It also made the LCP image
 * unprioritizable (any eager hint would be spent on a discarded card) and
 * re-snapped the scroll rails mid-load.
 *
 * Variety now comes from the server instead: getHomepageSections draws a fresh
 * random sample per category on each revalidation, so the rails still change —
 * every 30 minutes rather than every load, and for free.
 */
export function CategoryRails({ sections }: CategoryRailsProps) {
  return (
    <div className="space-y-4">
        {sections.map((section, sectionIndex) => {
          const cards = section.listings.slice(0, CARDS_PER_RAIL)
          return (
            <section key={section.key} className="rounded-xl bg-card border border-border overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <CategoryIcon category={section.key} className="size-5 text-muted-foreground" />
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
              <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 overflow-x-auto overscroll-x-contain scroll-px-3 sm:scroll-px-4 [--rail-gutter:0.75rem] sm:[--rail-gutter:1rem] scrollbar-subtle rail-fade items-stretch snap-x snap-proximity">
                {cards.map((listing, cardIndex) => (
                  <div
                    key={listing.id}
                    className="w-[46vw] sm:w-56 max-w-[15rem] shrink-0 snap-start"
                  >
                    {/* Only the first rail is above the fold, and it holds the
                        LCP candidate. Hinting its cards eager/high-priority has
                        them requested while the HTML is still parsing, instead
                        of after layout runs the lazy-load observer. Every later
                        rail stays lazy. */}
                    {/* The rail slot is 46vw on phones and a fixed 224px (w-56)
                        from sm up — not the responsive grid's 50/33/25vw, which
                        would have the browser download a 640px source for a
                        224px card on desktop. */}
                    <ProductCard
                      listing={listing}
                      eager={sectionIndex === 0 && cardIndex < EAGER_IMAGE_COUNT}
                      sizes="(max-width: 640px) 46vw, 224px"
                    />
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
