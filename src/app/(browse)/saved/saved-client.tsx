"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bookmark, ChevronUp, CloudOff } from "lucide-react"
import type { UpvotedListing } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { useSavedProductIds } from "@/hooks/use-upvotes"

export function SavedClient() {
  const savedIds = useSavedProductIds()
  const idsKey = savedIds.join(",")

  const [mounted, setMounted] = useState(false)
  // null = not loaded yet; [] = loaded, nothing resolved
  const [listings, setListings] = useState<UpvotedListing[] | null>(null)
  // Third state alongside null/[]: the lookup FAILED. Without it a 503 was
  // indistinguishable from "we looked and found nothing", and the page told
  // the visitor their whole saved list had been delisted from every Rhode
  // Island menu — while it sat intact in localStorage the entire time.
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => setMounted(true), [])

  // Fetch whenever the saved set actually changes. idsKey only changes on a
  // real add/remove, so this runs once per change (no render loop). We never
  // blank `listings` on a refetch, so un-saving filters out instantly via
  // savedSet below with no loading flash.
  useEffect(() => {
    if (!mounted) return
    if (savedIds.length === 0) {
      setListings([])
      setLoadFailed(false)
      return
    }
    const ids = [...savedIds].reverse() // newest saved first
    let cancelled = false
    setLoadFailed(false)
    fetch(`/api/saved?ids=${ids.join(",")}`)
      .then((r) => {
        // /api/saved answers 503 with `{ listings: [] }` on a query failure —
        // the same shape as a genuine no-match, so status is the only signal.
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => {
        if (!cancelled) setListings((d.listings ?? []) as UpvotedListing[])
      })
      .catch(() => {
        // Leave `listings` alone: null keeps "we never loaded" distinct from
        // "loaded, nothing resolved", and a previous successful load stays on
        // screen rather than collapsing to an empty page.
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, mounted, retryTick])

  const retry = useCallback(() => setRetryTick((t) => t + 1), [])

  const savedSet = useMemo(() => new Set(savedIds), [idsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const displayed = useMemo(
    () => (listings ?? []).filter((l) => savedSet.has(l.product.id)),
    [listings, savedSet]
  )
  const inStock = useMemo(() => displayed.filter((l) => l.inStock), [displayed])
  const outOfStock = useMemo(
    () => displayed.filter((l) => !l.inStock),
    [displayed]
  )

  const loading =
    !mounted || (savedIds.length > 0 && listings === null && !loadFailed)
  // Only when the failure left us with nothing to show — a failed *refetch*
  // keeps the last good list on screen instead of blanking it.
  const failedWithNothing = !loading && loadFailed && displayed.length === 0
  const isEmpty = !loading && !failedWithNothing && displayed.length === 0

  return (
    <PageContainer className="py-6 md:py-8">
      <PageHeading
        title="Saved"
        description={
          loading
            ? "Loading your saved products…"
            : displayed.length > 0
              ? summaryLine(inStock.length, outOfStock.length)
              : failedWithNothing
                ? `${savedIds.length} product${savedIds.length === 1 ? "" : "s"} saved on this device`
                : "Products you upvote are saved here, on this device"
        }
      />

      {loading ? (
        // Sized from localStorage (known synchronously) and height-matched to
        // the real card by the shared skeleton — the old bespoke placeholder
        // was ~150px shorter per row, so the page jumped when the fetch landed.
        <ProductGridSkeleton
          count={Math.min(savedIds.length || 10, 12)}
          // sm:gap-4 (not the shared md:gap-4 default) to match this page's own
          // grid — otherwise the 640-767px range shifts by 4px per gap.
          className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-4"
        />
      ) : failedWithNothing ? (
        <LoadFailedState onRetry={retry} />
      ) : isEmpty ? (
        <EmptyState hasSaved={savedIds.length > 0} />
      ) : (
        <div className="space-y-10">
          {inStock.length > 0 && <CardGrid listings={inStock} />}

          {outOfStock.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm uppercase tracking-wide text-muted-foreground">
                  Out of stock
                </h2>
                <span className="text-xs text-muted-foreground">
                  {outOfStock.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-prose">
                Not on any Rhode Island menu right now. We&apos;ll keep them here
                in case they come back.
              </p>
              <CardGrid listings={outOfStock} />
            </section>
          )}
        </div>
      )}
    </PageContainer>
  )
}

/** Human summary of the saved list's stock split, shown under the title. */
function summaryLine(inStockCount: number, outCount: number): string {
  const total = inStockCount + outCount
  const products = `${total} product${total === 1 ? "" : "s"}`
  if (outCount === 0) return `${products} you've upvoted, in stock now`
  if (inStockCount === 0) return `${products} you've upvoted — none in stock right now`
  return `${products} you've upvoted · ${inStockCount} in stock · ${outCount} out of stock`
}

function CardGrid({ listings }: { listings: UpvotedListing[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
      {listings.map((listing) => (
        <ProductCard
          key={listing.id}
          listing={listing}
          stock={{
            inStock: listing.inStock,
            dispensaryCount: listing.dispensaryCount,
          }}
        />
      ))}
    </div>
  )
}

/**
 * The lookup failed. The saved list itself lives in localStorage and is
 * untouched — say that plainly, because the alternative copy ("no longer in
 * our Rhode Island catalog") is an obituary for a list that is still there.
 */
function LoadFailedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      role="status"
    >
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <CloudOff className="w-6 h-6 text-muted-foreground" aria-hidden />
      </div>
      <p className="font-heading text-xl font-semibold text-foreground mb-2">
        We couldn&apos;t load your saved products
      </p>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Nothing was lost — your list is safe on this device. We just couldn&apos;t
        reach the menus to look them up.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center justify-center h-11 sm:h-10 px-5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState({ hasSaved }: { hasSaved: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bookmark className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="font-heading text-xl font-semibold text-foreground mb-2">
        {hasSaved ? "We couldn't find your saved products" : "Nothing saved yet"}
      </p>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {hasSaved ? (
          "The products you saved are no longer in our Rhode Island catalog. Save more as you browse."
        ) : (
          <>
            Tap the{" "}
            <ChevronUp
              className="inline-block w-4 h-4 align-text-bottom text-primary"
              aria-hidden
            />{" "}
            upvote on any product to keep it here. Your list lives on this
            device — no account needed.
          </>
        )}
      </p>
      <Link
        href="/search"
        className="inline-flex items-center h-10 px-5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Browse products
      </Link>
    </div>
  )
}
