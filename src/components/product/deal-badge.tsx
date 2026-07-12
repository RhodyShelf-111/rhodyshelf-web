import { cn } from "@/lib/utils"

interface DealBadgeProps {
  className?: string
  // When set (and > 0), the badge shows the discount magnitude, e.g. "32% off",
  // which lets shoppers tell a small markdown from a big one at a glance.
  percent?: number | null
}

export function DealBadge({ className, percent }: DealBadgeProps) {
  const label =
    percent != null && percent > 0 ? `${Math.round(percent)}% off` : "On Sale"
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md",
        "bg-red-950/70 text-red-300 border border-red-900/60",
        className
      )}
    >
      {label}
    </span>
  )
}

interface StockBadgeProps {
  inStock: boolean
  className?: string
}

/** Live availability pill for the Saved page — a green "In stock" or a muted
 *  "Out of stock", each led by a status dot so it reads at a glance in a grid. */
export function StockBadge({ inStock, className }: StockBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border backdrop-blur-sm",
        inStock
          ? "bg-emerald-950/70 text-emerald-300 border-emerald-900/60"
          : "bg-background/80 text-muted-foreground border-border",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          inStock ? "bg-emerald-400" : "bg-muted-foreground/60"
        )}
        aria-hidden
      />
      {inStock ? "In stock" : "Out of stock"}
    </span>
  )
}

interface DropBadgeProps {
  label: string
  badgeClassName: string
  className?: string
}

export function DropBadge({ label, badgeClassName, className }: DropBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border",
        badgeClassName,
        className
      )}
    >
      {label}
    </span>
  )
}
