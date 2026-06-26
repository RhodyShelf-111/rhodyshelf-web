"use client"

import { useRouter } from "next/navigation"
import { Sheet, SheetContent } from "@/components/ui/sheet"

/**
 * Client shell for the product quick-look drawer rendered by the @modal
 * intercepting route. The drawer is uncontrolled (`defaultOpen`) so Base UI
 * owns the open/close animation; closing it (X, Escape, or backdrop click)
 * plays the slide-out, and only once that animation completes do we
 * `router.back()` to drop the intercepted /product/[id] entry and reveal the
 * brand grid exactly where the shopper left it.
 */
export function ProductDrawer({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <Sheet
      defaultOpen
      onOpenChangeComplete={(open) => {
        if (!open) router.back()
      }}
    >
      <SheetContent side="right" className="gap-0 overflow-y-auto">

        {children}
      </SheetContent>
    </Sheet>
  )
}
