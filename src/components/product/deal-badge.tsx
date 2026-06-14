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
