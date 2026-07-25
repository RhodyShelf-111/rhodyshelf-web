"use client"

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react"

const EXIT_MS = 260
const SPRING_MS = 220
/** Drag past this share of the sheet's height and it dismisses. */
const DISMISS_TRAVEL = 0.3
/** …or flick faster than this (px/ms, downward). */
const DISMISS_VELOCITY = 0.45

export interface SwipeDismiss {
  /** Attach to the sheet popup — the element that actually slides. */
  popupRef: RefObject<HTMLDivElement | null>
  /** Spread onto the non-scrolling drag zone (grab handle / header row). */
  dragHandlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void
  }
  /** Pass straight to `<Sheet onOpenChange>`. */
  onOpenChange: (next: boolean) => void
}

/**
 * Swipe-down-to-dismiss for a bottom sheet.
 *
 * Base UI's Dialog has no drag gesture of its own, so every bottom sheet that
 * shows a grab handle has to implement one — otherwise the handle is a promise
 * the sheet doesn't keep. Shared by the filter sheet and the mobile nav menu so
 * the two can't drift.
 *
 * The gesture is driven imperatively (inline transform on the popup) rather
 * than through React state: the sheet's contents don't re-render on every
 * pointer move, and the dismissal slide finishes *before* the dialog is flipped
 * closed, so Base UI's own exit transition runs while the sheet is already
 * off-screen and there's no jump. See [[bottom-sheet-quick-look]] for why
 * imperative beats its CSS-transition hooks here.
 *
 * Attach `dragHandlers` only to a region that does not scroll, or the drag will
 * fight the content's own scrolling. That region also wants `touch-none`, so
 * the browser doesn't claim the gesture for panning first.
 */
export function useSwipeDismiss({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}): SwipeDismiss {
  const popupRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startY: number
    lastY: number
    lastT: number
    height: number
  } | null>(null)
  const closingRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)

  // Fresh gesture state each time the sheet opens (the content remounts, refs
  // on the host component don't).
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

  // Slide the sheet the rest of the way out from wherever the drag left it,
  // then actually close the dialog.
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
    if (dy > drag.height * DISMISS_TRAVEL || velocity > DISMISS_VELOCITY) {
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

  return {
    popupRef,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    onOpenChange: (next: boolean) => {
      if (next) {
        setOpen(true)
      } else {
        // Funnel EVERY close path — X, Escape, backdrop tap, swipe, a nav tap —
        // through the same slide-out, so the sheet always leaves the way it can
        // be flung. Without this, tap-closes got Base UI's short fade-rise while
        // swipes slid the full height.
        animateDismiss(0)
      }
    },
  }
}
