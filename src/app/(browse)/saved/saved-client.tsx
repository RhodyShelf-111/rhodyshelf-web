"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bookmark, ChevronUp } from "lucide-react"
import type { UpvotedListing } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { useSavedProductIds } from "@/hooks/use-upvotes"

export function SavedClient() {
  const savedIds = useSavedProductIds()
  const idsKey = savedIds.join(",")

  const [mounted, setMounted] = useState(false)
  // null = not loaded yet; [] = loaded, nothing resolved
  const [listings, setListings] = useState<UpvotedListing[] | null>(null)

  useEffect(() => setMounted(true), [])

  // Fetch whenever the saved set actually changes. idsKey only changes on a
  // real add/remove, so this runs once per change (no render loop). We never
  // blank `listings` on a refetch, so un-saving filters out instantly via
  // savedSet below with no loading flash.
  useEffect(() => {
    if (!mounted) return
    if (savedIds.length === 0) {
      setListings([])
      return
    }
    const ids = [...savedIds].reverse() // newest saved first
    let cancelled = false
    fetch(`/api/saved?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((d) => {
        if (!cancelled) setListings((d.listings ?? []) as UpvotedListing[])
      })
      .catch(() => {
        if (!cancelled) setListings((prev) => prev ?? [])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, mounted])

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

  const loading = !mounted || (savedIds.length > 0 && listings === null)
  const isEmpty = !loading && displayed.length === 0

  return (
    <PageContainer className="py-6 md:py-8">
      <PageHeading
        title="Saved"
        description={
          loading
            ? "Loading your saved products…"
            : displayed.length > 0
              ? summaryLine(inStock.length, outOfStock.length)
              : "Products you upvote are saved here, on this device"
        }
      />

      {loading ? (
        <SkeletonGrid />
      ) : isEmpty ? (
        <EmptyState hasSaved={savedIds.length > 0} />
      ) : (
        <div className="space-y-10">
          {inStock.length > 0 && <CardGrid listings={inStock} />}

          {outOfStock.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="aspect-square bg-muted animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasSaved }: { hasSaved: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bookmark className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="font-heading text-xl font-bold text-foreground mb-2">
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
        className="inline-flex items-center h-10 px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Browse products
      </Link>
    </div>
  )
}
