import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * A single card-shaped placeholder that mirrors ProductCard's box model
 * (square image plate + the same stack of text rows) so the skeleton grid
 * reserves the real card's height and the swap to real content doesn't shift
 * layout.
 */
function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-1 flex-col px-3 py-2.5">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          {/* Name — two reserved lines (real card: min-h-[2.25rem]) */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-20" />
          {/* THC line — always reserved on the real card */}
          <Skeleton className="h-3 w-16" />
        </div>
        {/* Dispensary + actions, pinned to the bottom. The real card stacks a
            dispensary line over a 44px touch-target button row on mobile
            (collapsing to one 28px row at sm+) — reserve the taller mobile
            height so the grid doesn't grow when real cards swap in. */}
        <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-11 w-full rounded-md sm:h-7 sm:w-16" />
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
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid gap-3 md:gap-4", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
