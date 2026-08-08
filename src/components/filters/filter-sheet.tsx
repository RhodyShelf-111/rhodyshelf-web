"use client"

import { useState, type ReactNode } from "react"
import { XIcon } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useSwipeDismiss } from "@/hooks/use-swipe-dismiss"
import { cn } from "@/lib/utils"

/**
 * The mobile filter bottom sheet chrome, shared by the search FilterBar and
 * the ProductGrid pages so both surfaces stay identical:
 *
 * - a grab handle + a real header row, so the title and the close button sit
 *   on one line (the close used to float absolutely, misaligned with the
 *   title);
 * - swipe-down-to-dismiss from the handle/header — the same gesture as the
 *   product quick-look sheet and the mobile nav menu, via useSwipeDismiss. The
 *   drag zone is only the non-scrolling header, so it never fights the filter
 *   list's own scrolling.
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
  const { popupRef, dragHandlers, onOpenChange } = useSwipeDismiss({
    open,
    setOpen,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
          {...dragHandlers}
        >
          <div
            className="flex cursor-grab justify-center pt-2.5 pb-1.5 active:cursor-grabbing"
            aria-hidden="true"
          >
            <div className="h-1 w-9 rounded-full bg-muted-foreground/40" />
          </div>
          <div className="flex items-center justify-between gap-2 pb-2 pl-4 pr-2.5">
            <SheetTitle className="text-subhead font-semibold">{title}</SheetTitle>
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
                <Button className="h-12 w-full rounded-lg text-body font-medium" />
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
