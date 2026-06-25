import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Crumb {
  name: string
  /** App-relative path (e.g. "/dispensary"). Used for the link and to build the
   *  absolute URL in the BreadcrumbList JSON-LD. */
  href: string
}

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rhodyshelf.com"

/**
 * Breadcrumb trail for deep pages (product, dispensary, brand). Renders a
 * visible, accessible nav plus schema.org BreadcrumbList structured data so the
 * trail can show up as rich results in search.
 *
 * "Home" is prepended automatically — callers pass only the trail after it.
 * The last crumb renders as the current page (not a link); every crumb is still
 * emitted with an absolute URL in the JSON-LD, as Google recommends.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[]
  className?: string
}) {
  const all: Crumb[] = [{ name: "Home", href: "/" }, ...items]

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: new URL(crumb.href, BASE_URL).toString(),
    })),
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        {all.map((crumb, i) => {
          const isLast = i === all.length - 1
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-x-1.5">
              {i > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="truncate max-w-[60vw] sm:max-w-xs font-medium text-foreground"
                >
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </nav>
  )
}
