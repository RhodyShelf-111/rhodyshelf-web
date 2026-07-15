"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import type { InventoryListing } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ProductQuickLook } from "@/components/product/product-quick-look"
import { SheetTitle } from "@/components/ui/sheet"
import { getRememberedListing } from "@/lib/listing-cache"

// The sheet only ever mounts on a client-side navigation (the @modal intercept),
// so window is present; the guard just silences React's SSR warning.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

const ENTER_MS = 300
const EXIT_MS = 260

type DrawerState =
  | { status: "ready"; listing: InventoryListing }
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }

/**
 * Client shell for the product quick-look rendered by the @modal intercepting
 * route. On phones it presents as a bottom sheet (slides up, grab handle,
 * swipe-down to dismiss, safe-area aware); on `sm+` pointer layouts it stays a
 * right-hand drawer. Either way it opens instantly and, on the common path,
 * renders from the listing the shopper's grid/rail already loaded into memory
 * (see listing-cache) — so there is no server round-trip between the click and a
 * fully-populated view. Only a cold cache miss (a product the client never
 * carried) shows a skeleton while it fetches /api/product/[id].
 *
 * The sheet is uncontrolled (`defaultOpen`) so Base UI owns the open/close
 * animation for the X, Escape, and backdrop paths; once that animation completes
 * we `router.back()` to drop the intercepted /product/[id] entry and reveal the
 * grid where the shopper left it. A swipe-to-dismiss runs its own follow-through
 * animation from the drag position and then calls the same `router.back()`.
 */
export function ProductDrawer({ id }: { id: string }) {
  const [state, setState] = useState<DrawerState>(() => {
    const remembered = getRememberedListing(id)
    return remembered
      ? { status: "ready", listing: remembered }
      : { status: "loading" }
  })

  // Cache miss only: fetch the listing so the sheet can still populate. On a
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
    <QuickLookSheet>
      {state.status === "ready" ? (
        <ProductQuickLook listing={state.listing} />
      ) : state.status === "missing" ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <SheetTitle className="font-medium text-foreground">
            Product not found
          </SheetTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            It may no longer be in stock.
          </p>
        </div>
      ) : state.status === "error" ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <SheetTitle className="font-medium text-foreground">
            Couldn&rsquo;t load this product
          </SheetTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong.{" "}
            {/* Hard link (not next/link) so it bypasses interception and
                loads the full standalone page, which fetches server-side. */}
            <a href={`/product/${id}`} className="text-primary hover:underline">
              Open the full page &rarr;
            </a>
          </p>
        </div>
      ) : (
        <QuickLookSkeleton />
      )}
    </QuickLookSheet>
  )
}

/**
 * The responsive sheet chrome: Base UI Dialog (modal semantics — scroll lock,
 * outside-press + Escape dismissal signals) styled as a bottom sheet on touch
 * layouts and a right drawer on `sm+`, plus a grab handle wired to a
 * swipe-to-dismiss gesture.
 *
 * The dialog is held open (`open` is a constant) and every close path — the X,
 * Escape, a backdrop tap, or a downward swipe — funnels through `animateClose`,
 * which slides the sheet off-screen and then `router.back()`s to drop the
 * intercepted /product/[id] entry. We own the enter/exit/drag transitions
 * imperatively rather than leaning on Base UI's CSS-transition-completion hooks,
 * so the motion is fully under our control and closing is never left half-done.
 */
function QuickLookSheet({ children }: { children: ReactNode }) {
  const router = useRouter()
  const popupRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<{
    startY: number
    lastY: number
    lastT: number
    height: number
  } | null>(null)
  const navigatedRef = useRef(false)
  const closingRef = useRef(false)

  const media = (query: string) =>
    typeof window !== "undefined" && window.matchMedia(query).matches
  const isDesktop = () => media("(min-width: 640px)")
  const reduceMotion = () => media("(prefers-reduced-motion: reduce)")
  // Off-screen resting transform for the current layout: below on the bottom
  // sheet, to the right on the desktop drawer.
  const offscreen = () => (isDesktop() ? "translateX(100%)" : "translateY(100%)")

  const navigateBack = () => {
    if (navigatedRef.current) return
    navigatedRef.current = true
    router.back()
  }

  // Slide + fade the sheet in on mount, from off-screen to rest. Runs before
  // paint so the first frame is already off-screen (no flash at rest position).
  useIsomorphicLayoutEffect(() => {
    const popup = popupRef.current
    const backdrop = backdropRef.current
    if (!popup) return
    const ms = reduceMotion() ? 0 : ENTER_MS
    popup.style.transition = "none"
    popup.style.transform = offscreen()
    if (backdrop) {
      backdrop.style.transition = "none"
      backdrop.style.opacity = "0"
    }
    void popup.offsetHeight // flush the starting frame
    const id = requestAnimationFrame(() => {
      popup.style.transition = `transform ${ms}ms cubic-bezier(0.32,0.72,0,1), opacity ${ms}ms ease`
      popup.style.transform = "translate(0px, 0px)"
      if (backdrop) {
        backdrop.style.transition = `opacity ${ms}ms ease`
        backdrop.style.opacity = "1"
      }
    })
    return () => cancelAnimationFrame(id)
  }, [])

  // Animate the sheet away then drop the intercepted route. `from` seeds the
  // starting transform for a swipe (so the slide-out continues from the finger).
  const animateClose = (from?: string) => {
    if (closingRef.current) return
    closingRef.current = true
    const popup = popupRef.current
    const backdrop = backdropRef.current
    const ms = reduceMotion() ? 0 : EXIT_MS
    if (popup) {
      if (from != null) {
        popup.style.transition = "none"
        popup.style.transform = from
        void popup.offsetHeight // make `from` the transition's starting point
      }
      popup.style.transition = `transform ${ms}ms cubic-bezier(0.32,0.72,0,1), opacity ${ms}ms ease`
      popup.style.transform = offscreen()
    }
    if (backdrop) {
      backdrop.style.transition = `opacity ${ms}ms ease`
      backdrop.style.opacity = "0"
    }
    window.setTimeout(navigateBack, ms + 40)
  }

  // Escape fallback: Base UI's own handler can miss when focus never lands
  // inside the sheet, so we also listen here while it's mounted.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") animateClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Move focus into the sheet so keyboard / screen-reader users enter the dialog
  // instead of being stranded on the card behind it. Deferred a tick so it lands
  // after Base UI's own on-open focus handling settles; preventScroll keeps the
  // enter animation from being interrupted by a focus-driven scroll.
  useEffect(() => {
    const id = window.setTimeout(
      () => closeRef.current?.focus({ preventScroll: true }),
      60
    )
    return () => window.clearTimeout(id)
  }, [])

  // --- Swipe-to-dismiss (mobile only: the handle these fire from is sm:hidden).
  // Driven imperatively so the product view doesn't re-render on every move.
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || closingRef.current) return
    const popup = popupRef.current
    if (!popup) return
    // Keep receiving moves even if the finger slides off the handle. Guarded
    // because a stray/synthetic pointer id can throw here.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    dragRef.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      height: popup.getBoundingClientRect().height,
    }
    popup.style.transition = "none"
    if (backdropRef.current) backdropRef.current.style.transition = "none"
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const popup = popupRef.current
    if (!drag || !popup) return
    const dy = Math.max(0, e.clientY - drag.startY)
    drag.lastY = e.clientY
    drag.lastT = e.timeStamp
    popup.style.transform = `translateY(${dy}px)`
    const backdrop = backdropRef.current
    if (backdrop) {
      const progress = drag.height > 0 ? Math.min(dy / drag.height, 1) : 0
      backdrop.style.opacity = String(1 - progress * 0.9)
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const popup = popupRef.current
    dragRef.current = null
    if (!drag || !popup) return
    const dy = Math.max(0, e.clientY - drag.startY)
    const dt = Math.max(1, e.timeStamp - drag.lastT)
    const velocity = (e.clientY - drag.lastY) / dt // px/ms; downward is positive
    // Dismiss on a decisive drag past a third of the sheet, or a quick flick.
    if (dy > drag.height * 0.3 || velocity > 0.45) {
      animateClose(`translateY(${dy}px)`)
    } else {
      // Spring back to rest.
      const ms = reduceMotion() ? 0 : 220
      popup.style.transition = `transform ${ms}ms cubic-bezier(0.32,0.72,0,1)`
      popup.style.transform = "translateY(0px)"
      const backdrop = backdropRef.current
      if (backdrop) {
        backdrop.style.transition = `opacity ${ms}ms ease`
        backdrop.style.opacity = "1"
      }
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) animateClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          ref={backdropRef}
          className="fixed inset-0 z-50 bg-black/55 supports-backdrop-filter:backdrop-blur-xs"
        />
        <Dialog.Popup
          ref={popupRef}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-popover text-popover-foreground shadow-2xl outline-none",
            // Mobile: bottom sheet, capped so the backdrop stays tappable above it.
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-border",
            // sm+: right-hand drawer, full height.
            "sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:border-t-0 sm:border-l"
          )}
        >
          {/* Grab handle — mobile only; the drag lives here so it never fights
              the product view's own vertical scrolling. */}
          <div
            className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1.5 active:cursor-grabbing sm:hidden"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden="true"
          >
            <div className="h-1 w-9 rounded-full bg-muted-foreground/40" />
          </div>

          {/* Pinned close — stays put over any scroll; a translucent pill keeps
              it legible over light product packshots. */}
          <Dialog.Close
            ref={closeRef}
            className="absolute top-2.5 right-2.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Dialog.Close>

          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Placeholder shaped like ProductQuickLook, shown only on a cold cache miss. */
function QuickLookSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetTitle className="sr-only">Loading product</SheetTitle>
      {/* Image plate */}
      <div className="h-56 shrink-0 animate-pulse border-b border-border bg-muted sm:h-auto sm:aspect-square" />
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
      </div>
    </div>
  )
}
