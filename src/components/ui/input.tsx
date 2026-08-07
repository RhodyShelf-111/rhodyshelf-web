import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// The resting border is muted-foreground/70, not --input. Measured against the
// real dark tokens, --input (#2d3d2d) is 1.67:1 on --background and 1.41:1 on
// --popover, and the dark:bg-input/30 fill is ~1.1:1 — so the field had no
// visible edge in the filter panels, where a placeholder is the only label.
// muted-foreground/70 composites to 4.26:1 on --background, 4.07:1 on --card
// and 3.85:1 on --popover, clearing WCAG 1.4.11's 3:1 for a control boundary
// on every surface the Input sits on.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-muted-foreground/70 bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
