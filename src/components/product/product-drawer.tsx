"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { InventoryListing } from "@/lib/types"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ProductQuickLook } from "@/components/product/product-quick-look"
import { getRememberedListing } from "@/lib/listing-cache"

type DrawerState =
  | { status: "ready"; listing: InventoryListing }
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }

/**
 * Client shell for the product quick-look drawer rendered by the @modal
 * intercepting route. It opens instantly and, on the common path, renders from
 * the listing the shopper's grid/rail already loaded into memory (see
 * listing-cache) — so there is no server round-trip between the click and a
 * fully-populated drawer. Only a cold cache miss (a product the client never
 * carried) shows a skeleton while it fetches /api/product/[id].
 *
 * The drawer is uncontrolled (`defaultOpen`) so Base UI owns the open/close
 * animation; closing it (X, Escape, or backdrop click) plays the slide-out, and
 * only once that animation completes do we `router.back()` to drop the
 * intercepted /product/[id] entry and reveal the grid where the shopper left it.
 */
export function ProductDrawer({ id }: { id: string }) {
  const router = useRouter()
  const [state, setState] = useState<DrawerState>(() => {
    const remembered = getRememberedListing(id)
    return remembered
      ? { status: "ready", listing: remembered }
      : { status: "loading" }
  })

  // Cache miss only: fetch the listing so the drawer can still populate. On a
  // hit the initial state is already "ready", so this returns immediately.
  useEffect(() => {
    if (state.status !== "loading") return
    const controller = new AbortController()
    fetch(`/api/product/${id}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.ok) {
          const body: { listing: InventoryListing | null } = await res.json()
          setState(
            body.listing
              ? { status: "ready", listing: body.listing }
              : { status: "missing" }
          )
        } else if (res.status === 404) {
          setState({ status: "missing" })
        } else {
          // 5xx / transient — don't claim the product is gone.
          setState({ status: "error" })
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") {
          setState({ status: "error" })
        }
      })
    return () => controller.abort()
    // `state.status` is only read to gate the initial fetch; re-running on it
    // would refetch after we set "ready"/"missing". Keyed by id upstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <Sheet
      defaultOpen
      onOpenChangeComplete={(open) => {
        if (!open) router.back()
      }}
    >
      <SheetContent side="right" className="gap-0 overflow-y-auto">
        {state.status === "ready" ? (
          <ProductQuickLook listing={state.listing} />
        ) : state.status === "missing" ? (
          <div className="p-8 text-center">
            <SheetTitle className="font-medium text-foreground">
              Product not found
            </SheetTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              It may no longer be in stock.
            </p>
          </div>
        ) : state.status === "error" ? (
          <div className="p-8 text-center">
            <SheetTitle className="font-medium text-foreground">
              Couldn&rsquo;t load this product
            </SheetTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Something went wrong.{" "}
              {/* Hard link (not next/link) so it bypasses interception and
                  loads the full standalone page, which fetches server-side. */}
              <a
                href={`/product/${id}`}
                className="text-primary hover:underline"
              >
                Open the full page &rarr;
              </a>
            </p>
          </div>
        ) : (
          <QuickLookSkeleton />
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Placeholder shaped like ProductQuickLook, shown only on a cold cache miss. */
function QuickLookSkeleton() {
  return (
    <div className="flex flex-col">
      <SheetTitle className="sr-only">Loading product</SheetTitle>
      {/* Image plate */}
      <div className="aspect-square shrink-0 animate-pulse border-b border-border bg-muted" />
      {/* Details */}
      <div className="flex flex-col gap-4 p-4">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="flex gap-3">
          <div className="h-16 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}
