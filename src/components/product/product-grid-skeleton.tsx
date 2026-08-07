import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * A single card-shaped placeholder that mirrors ProductCard's box model
 * (square image plate + the same stack of text rows) so the skeleton grid
 * reserves the real card's height and the swap to real content doesn't shift
 * layout.
 *
 * Every height below is the RENDERED height of the row it stands in for, not a
 * loose approximation — the two have to agree to the pixel or the grid drops by
 * the difference on every row the moment real cards arrive. Measured on the real
 * card at a 390px viewport:
 *
 *   category · strain   text-[12px]              -> 18px
 *   name                min-h-[2.25rem]          -> 36px
 *   brand               text-[13px]              -> 19.5px
 *   price               text-sm                  -> 20px
 *   $/g · THC           text-[13px] min-h-[1rem] -> 19.5px
 *   dispensary line     text-[12px] + icon       -> 18px
 *   action row          h-11 / sm:h-7            -> 44px / 28px
 *
 * (The 19.5s are 13px text at the inherited 1.5 line-height. Rounding them up
 * to h-5 leaves the skeleton 1px TOO TALL per card — small, but free to fix.)
 *
 * The earlier version used h-3/h-4 rows on a space-y-1.5 stack, which came out
 * 21px short per card — a visible ~130px lurch over six rows on a phone.
 */
function ProductCardSkeleton({
  showDispensary = true,
}: {
  showDispensary?: boolean
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* The real plate ends in a hairline against the text block. It costs no
          height either way (box-sizing is border-box, so aspect-square resolves
          against the border box — measured 214x214 with the border present), so
          this is purely so the placeholder reads as the same card. */}
      <Skeleton className="aspect-square rounded-none border-b border-border/60" />
      <div className="flex flex-1 flex-col px-3 py-2.5">
        {/* space-y-1 (not 1.5) — the real card's stack gap. */}
        <div className="space-y-1">
          <Skeleton className="h-[18px] w-16" />
          {/* Name — two reserved lines (real card: min-h-[2.25rem] = 36px) */}
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-[19.5px] w-24" />
          <Skeleton className="h-5 w-20" />
          {/* $/g · THC line — always reserved on the real card */}
          <Skeleton className="h-[19.5px] w-16" />
        </div>
        {/* Dispensary + actions, pinned to the bottom. The real card stacks the
            dispensary line over the action row at EVERY breakpoint (only the
            row's own height shrinks, 44px -> 28px), so this stays a column;
            an sm:flex-row here collapsed two rows into one and left the desktop
            skeleton short. */}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {/* Single-dispensary pages hide this line on the real card (it would
              repeat the page title), so reserving it there would over-reserve
              26px per row and jump the grid UP when content lands. */}
          {showDispensary && <Skeleton className="h-[18px] w-20" />}
          <Skeleton className="h-11 w-full rounded-md sm:ml-auto sm:h-7 sm:w-16" />
        </div>
      </div>
    </div>
  )
}

/**
 * Placeholder grid shown by the list routes' loading.tsx while the (often
 * large) results payload streams in over the network — instant feedback in
 * place of a frozen screen, which matters most on slow cellular connections
 * where the category/dispensary payloads take a beat to arrive.
 *
 * `className` defaults to ProductGrid's column counts; the search results grid
 * passes its own (denser) breakpoints so its loading state matches.
 */
export function ProductGridSkeleton({
  count = 12,
  className = "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  showDispensary = true,
}: {
  count?: number
  className?: string
  /** Match the route's real cards: /dispensary/[slug] renders them without the
   *  dispensary line, so its placeholder must not reserve one. */
  showDispensary?: boolean
}) {
  return (
    <div aria-hidden="true" className={cn("grid gap-3 md:gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} showDispensary={showDispensary} />
      ))}
    </div>
  )
}
