import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price for display. Returns null for missing prices.
 */
export function formatPrice(price: number | null): string | null {
  if (price == null) return null
  return `$${price.toFixed(2)}`
}

/**
 * Compact relative time, e.g. "just now", "12m ago", "3h ago", "2d ago".
 * Used to show how fresh an inventory price is. Computed at render time, so on
 * ISR pages it is accurate to within the route's revalidate window.
 */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  const wks = Math.floor(days / 7)
  return `${wks}w ago`
}

/** How far back /drops looks. Mirrors the window getDrops() queries. */
export const DROP_WINDOW_DAYS = 14

/**
 * Freshness badge for a drop.
 *
 * The label states the actual age rather than a mood word. "Just Dropped"
 * covered days 0–3 and "New" covered days 8–14, so a card never said when its
 * product actually landed — and because /drops sorts newest-first, every card
 * in the opening screens read "Just Dropped", making the badge pure decoration
 * exactly where a shopper is looking. The colour still tiers by recency; only
 * the wording carries the date now.
 */
export function getFreshnessBadge(droppedAt: string): {
  label: string
  className: string
} | null {
  const days = Math.floor(
    (Date.now() - new Date(droppedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (days < 0 || days > DROP_WINDOW_DAYS) return null

  const label =
    days === 0
      ? "Dropped today"
      : days === 1
        ? "Dropped yesterday"
        : `Dropped ${days}d ago`

  if (days <= 3) {
    return {
      label,
      className: "bg-emerald-950/90 text-emerald-300 border border-emerald-900/60",
    }
  }
  if (days <= 7) {
    return {
      label,
      className: "bg-emerald-950/80 text-emerald-400 border border-emerald-900/50",
    }
  }
  return { label, className: "bg-muted text-muted-foreground border-border" }
}

/**
 * Generate a URL-safe slug from a name.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Get a category icon emoji fallback when no product image exists.
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    // DB values (singular)
    flower: "🌿",
    concentrate: "💧",
    edible: "🍪",
    "pre-roll": "🚬",
    vape: "💨",
    tincture: "💊",
    topical: "🧴",
    accessory: "🛒",
    other: "🌱",
    // Plural aliases (for display names / filter UI)
    concentrates: "💧",
    edibles: "🍪",
    "pre-rolls": "🚬",
    vapes: "💨",
    tinctures: "💊",
    topicals: "🧴",
    accessories: "🛒",
  }
  return icons[category?.toLowerCase()] ?? "🌿"
}
