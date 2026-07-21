import { HOMEPAGE_CATEGORIES } from "@/lib/queries/products"
import { CategoryNavLink } from "@/components/layout/category-nav-link"
import { cn, getCategoryIcon } from "@/lib/utils"

/**
 * Category switcher chips for the /category/[slug] pages.
 *
 * Without this, switching categories means going back to the homepage: the
 * grid's own Category filter derives its options from the listings on screen,
 * which on a category page are all one category. Chips keep the swap to a
 * single tap and double as category-to-category internal linking — and they
 * carry the active filter params across the switch (CategoryNavLink), so a
 * brand/dispensary filter survives flipping categories.
 *
 * prefetch={false} (inside CategoryNavLink) to match the homepage chips —
 * category routes carry the site's largest payloads and all 7 sit in the
 * viewport together.
 */
export function CategoryNav({ activeSlug }: { activeSlug?: string }) {
  return (
    <nav
      aria-label="Browse by category"
      className="mb-6 flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hidden [mask-image:linear-gradient(to_right,#000_90%,transparent)] md:[mask-image:none] md:flex-wrap md:overflow-visible"
    >
      {HOMEPAGE_CATEGORIES.map((c) => {
        const active = c.key === activeSlug
        return (
          <CategoryNavLink
            key={c.key}
            href={`/category/${c.key}`}
            ariaCurrent={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-primary/40 bg-accent text-primary"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted"
            )}
          >
            <span aria-hidden="true">{getCategoryIcon(c.key)}</span>
            {c.label}
          </CategoryNavLink>
        )
      })}
    </nav>
  )
}
