"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { XIcon } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EXIT_MS = 260
const SPRING_MS = 220

/**
 * The mobile filter bottom sheet chrome, shared by the search FilterBar and
 * the ProductGrid pages so both surfaces stay identical:
 *
 * - a grab handle + a real header row, so the title and the close button sit
 *   on one line (the close used to float absolutely, misaligned with the
 *   title);
 * - swipe-down-to-dismiss from the handle/header — the same gesture as the
 *   product quick-look sheet. The drag zone is only the non-scrolling
 *   header, so it never fights the filter list's own scrolling.
 *
 * The swipe follows the product drawer's approach: drive the drag and the
 * dismissal slide imperatively (inline transform), and only then flip the
 * dialog closed — Base UI's own exit transition runs while the sheet is
 * already off-screen, so there's no jump. See [[bottom-sheet-quick-look]]
 * gotchas for why imperative beats its CSS-transition hooks here.
 */
export function FilterSheet({
  trigger,
  triggerClassName,
  title = "Filters",
  resultCount,
  children,
}: {
  trigger: ReactNode
  triggerClassName?: string
  title?: string
  /**
   * When set, a bar pinned under the filter list offers "Show N results" as
   * the sheet's primary exit — the count updates live as filters change, so
   * the shopper knows what they'll land on before closing.
   */
  resultCount?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startY: number
    lastY: number
    lastT: number
    height: number
  } | null>(null)
  const closingRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)

  // Fresh gesture state each time the sheet opens (content remounts, refs
  // on this component don't).
  useEffect(() => {
    if (open) closingRef.current = false
  }, [open])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const reduceMotion = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)

  const backdrop = () =>
    document.querySelector<HTMLElement>("[data-slot=sheet-overlay]")

  // Slide the sheet the rest of the way out from the drag position, then
  // actually close the dialog (it's off-screen by then, so Base UI's own
  // exit transition is invisible).
  const animateDismiss = (fromY: number) => {
    if (closingRef.current) return
    closingRef.current = true
    const popup = popupRef.current
    const ms = reduceMotion() ? 0 : EXIT_MS
    if (popup) {
      popup.style.transition = "none"
      popup.style.transform = `translateY(${fromY}px)`
      void popup.offsetHeight // make `fromY` the transition's starting point
      popup.style.transition = `transform ${ms}ms cubic-bezier(0.32,0.72,0,1)`
      popup.style.transform = "translateY(100%)"
    }
    const overlay = backdrop()
    if (overlay) {
      overlay.style.transition = `opacity ${ms}ms ease`
      overlay.style.opacity = "0"
    }
    closeTimerRef.current = window.setTimeout(() => setOpen(false), ms)
  }

  // --- Swipe-to-dismiss, driven imperatively so the filter list doesn't
  // re-render on every pointer move.
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
    const overlay = backdrop()
    if (overlay) overlay.style.transition = "none"
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const popup = popupRef.current
    if (!drag || !popup || closingRef.current) return
    const dy = Math.max(0, e.clientY - drag.startY)
    drag.lastY = e.clientY
    drag.lastT = e.timeStamp
    popup.style.transform = `translateY(${dy}px)`
    const overlay = backdrop()
    if (overlay) {
      const progress = drag.height > 0 ? Math.min(dy / drag.height, 1) : 0
      overlay.style.opacity = String(1 - progress * 0.9)
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const popup = popupRef.current
    dragRef.current = null
    if (!drag || !popup || closingRef.current) return
    const dy = Math.max(0, e.clientY - drag.startY)
    const dt = Math.max(1, e.timeStamp - drag.lastT)
    const velocity = (e.clientY - drag.lastY) / dt // px/ms; downward positive
    // Dismiss on a decisive drag past a third of the sheet, or a quick flick.
    if (dy > drag.height * 0.3 || velocity > 0.45) {
      animateDismiss(dy)
    } else {
      // Spring back to rest.
      const ms = reduceMotion() ? 0 : SPRING_MS
      popup.style.transition = `transform ${ms}ms cubic-bezier(0.32,0.72,0,1)`
      popup.style.transform = "translateY(0px)"
      const overlay = backdrop()
      if (overlay) {
        overlay.style.transition = `opacity ${ms}ms ease`
        overlay.style.opacity = "1"
      }
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true)
        } else {
          // Funnel EVERY close path — X, Escape, backdrop tap, swipe —
          // through the same slide-out, so the sheet always leaves the way
          // it can be flung. Without this, tap-closes got Base UI's short
          // fade-rise while swipes slid the full height.
          animateDismiss(0)
        }
      }}
    >
      <SheetTrigger className={triggerClassName}>{trigger}</SheetTrigger>
      <SheetContent
        ref={popupRef}
        side="bottom"
        showCloseButton={false}
        className="max-h-[85dvh] gap-0 rounded-t-2xl"
      >
        {/* Handle + header — the swipe's drag zone (touch-none so a drag
            can't scroll the page underneath). */}
        <div
          data-testid="filter-sheet-drag-zone"
          // border-b grounds the pinned header: without it the filter list
          // scrolls straight into the title row with no visual separation.
          className="shrink-0 touch-none select-none border-b border-border"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="flex cursor-grab justify-center pt-2.5 pb-1.5 active:cursor-grabbing"
            aria-hidden="true"
          >
            <div className="h-1 w-9 rounded-full bg-muted-foreground/40" />
          </div>
          <div className="flex items-center justify-between gap-2 pb-2 pl-4 pr-2.5">
            <SheetTitle className="text-lg font-bold">{title}</SheetTitle>
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 shrink-0"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </div>

        {/* The filter list owns the scrolling; the header above stays put.
            min-h-0 lets this flex child shrink below its content height so
            overflow-y-auto can actually engage under max-h-[85dvh]. The
            safe-area padding lives here only when no footer sits below to
            carry it. */}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3",
            resultCount !== undefined
              ? "pb-4"
              : "pb-[max(2rem,env(safe-area-inset-bottom))]"
          )}
        >
          {children}
        </div>

        {resultCount !== undefined && (
          // Same pinned-bar treatment as the product sheet's Buy bar: the
          // apply-and-see action stays reachable through any filter
          // scrolling, padded clear of the phone's home indicator.
          <div className="shrink-0 border-t border-border bg-popover/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-backdrop-filter:bg-popover/80">
            <SheetClose
              render={
                <Button className="h-12 w-full rounded-lg text-sm font-semibold" />
              }
            >
              Show {resultCount.toLocaleString()}{" "}
              {resultCount === 1 ? "result" : "results"}
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
