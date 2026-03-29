import { cn } from "@/lib/utils"

interface DealBadgeProps {
  className?: string
}

export function DealBadge({ className }: DealBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md",
        "bg-[var(--color-sale-bg)] text-[var(--color-sale)] border border-red-200",
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
