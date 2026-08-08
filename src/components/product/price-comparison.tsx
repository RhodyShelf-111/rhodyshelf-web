import Link from "next/link"
import { MapPin, TrendingDown } from "lucide-react"
import type { PriceComparison } from "@/lib/price-comparison"
import { cn, formatPrice } from "@/lib/utils"

interface PriceComparisonPanelProps {
  comparison: PriceComparison
  className?: string
  /** Id for the heading this section is labelled by. Overridable because the
   *  quick-look sheet can open OVER a product page that already renders this
   *  panel, and two identical ids in one document would point both sections'
   *  aria-labelledby at the first heading. A prop rather than useId() because
   *  this is a server component on the product page. */
  headingId?: string
}

/**
 * "The same thing is cheaper two towns over" — the one fact a price-comparison
 * site owes a visitor who is one tap from a dispensary checkout, and which the
 * product page otherwise never showed.
 *
 * Server component: every row is a plain link, so this ships no client JS.
 */
export function PriceComparisonPanel({
  comparison,
  className,
  headingId = "price-comparison-heading",
}: PriceComparisonPanelProps) {
  const { rows, savings } = comparison
  const cheapest = rows.find((r) => r.isCheapest && !r.isCurrent)

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h2
          id={headingId}
          className="font-heading text-[15px] font-semibold text-foreground"
        >
          At {rows.length} dispensaries
        </h2>
        {savings != null && cheapest && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-900/60 bg-emerald-950/70 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
            <TrendingDown className="h-3 w-3" aria-hidden />
            Save {formatPrice(savings)}
          </span>
        )}
      </div>

      <ul className="divide-y divide-border">
        {rows.map(({ listing, isCurrent, isCheapest, delta }) => {
          const body = (
            <>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm",
                    isCurrent
                      ? "font-semibold text-foreground"
                      : "font-medium text-foreground"
                  )}
                >
                  {listing.dispensary.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  {listing.dispensary.city && (
                    <>
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">
                        {listing.dispensary.city}, RI
                      </span>
                    </>
                  )}
                  {isCurrent && (
                    <span className="shrink-0">
                      {listing.dispensary.city ? "· " : ""}You&apos;re viewing
                      this
                    </span>
                  )}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isCheapest ? "text-primary" : "text-foreground"
                  )}
                >
                  {formatPrice(listing.price) ?? (
                    <span className="text-[13px] font-normal text-muted-foreground">
                      See dispensary
                    </span>
                  )}
                </p>
                {/* Only the gap is worth words: "same price" and "you're the
                    one being compared against" both read as no delta. */}
                {delta != null && delta !== 0 && (
                  <p
                    className={cn(
                      "text-[12px]",
                      delta < 0 ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {delta < 0 ? "−" : "+"}
                    {formatPrice(Math.abs(delta))}
                  </p>
                )}
                {isCheapest && (
                  <p className="text-[11px] font-medium text-primary">
                    Lowest
                  </p>
                )}
              </div>
            </>
          )

          // The row being viewed is not a link to itself.
          return (
            <li key={listing.id}>
              {isCurrent ? (
                <div className="flex items-center gap-3 bg-muted/40 px-4 py-3">
                  {body}
                </div>
              ) : (
                <Link
                  href={`/product/${listing.id}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ul>

      <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
        Same product and size, matched across menus. Prices change often —
        confirm at the dispensary.
      </p>
    </section>
  )
}
