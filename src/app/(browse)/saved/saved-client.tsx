"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bookmark, ChevronUp } from "lucide-react"
import type { InventoryListing } from "@/lib/types"
import { ProductCard } from "@/components/product/product-card"
import { PageContainer } from "@/components/layout/page-container"
import { useSavedProductIds } from "@/hooks/use-upvotes"

export function SavedClient() {
  const savedIds = useSavedProductIds()
  const idsKey = savedIds.join(",")

  const [mounted, setMounted] = useState(false)
  // null = not loaded yet; [] = loaded, nothing fresh
  const [listings, setListings] = useState<InventoryListing[] | null>(null)

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
        if (!cancelled) setListings((d.listings ?? []) as InventoryListing[])
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

  const loading = !mounted || (savedIds.length > 0 && listings === null)
  const isEmpty = !loading && displayed.length === 0

  return (
    <PageContainer className="py-6 md:py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">Saved</h1>
        <p className="text-muted-foreground mt-1">
          {loading
            ? "Loading your saved products…"
            : displayed.length > 0
              ? `${displayed.length} product${displayed.length === 1 ? "" : "s"} you've upvoted, kept here for you`
              : "Products you upvote are saved here, on this device"}
        </p>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : isEmpty ? (
        <EmptyState hasSaved={savedIds.length > 0} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {displayed.map((listing) => (
            <ProductCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </PageContainer>
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
        {hasSaved ? "Your saved products aren't available right now" : "Nothing saved yet"}
      </p>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {hasSaved ? (
          "The items you saved are out of the current menu window. Save more as you browse."
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
