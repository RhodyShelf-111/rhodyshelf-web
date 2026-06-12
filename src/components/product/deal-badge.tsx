import { cn } from "@/lib/utils"

interface DealBadgeProps {
  className?: string
}

export function DealBadge({ className }: DealBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md",
        "bg-red-950/70 text-red-300 border border-red-900/60",
        className
      )}
    >
      On Sale
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
