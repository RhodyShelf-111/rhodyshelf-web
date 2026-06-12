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
 * Get freshness badge for a drop based on days since it appeared.
 */
export function getFreshnessBadge(droppedAt: string): {
  label: string
  className: string
} | null {
  const days = Math.floor(
    (Date.now() - new Date(droppedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  if (days <= 3) {
    return {
      label: "Just Dropped",
      className: "bg-emerald-950/70 text-emerald-300 border border-emerald-900/60",
    }
  }
  if (days <= 7) {
    return {
      label: "Fresh",
      className: "bg-emerald-950/50 text-emerald-400 border border-emerald-900/50",
    }
  }
  if (days <= 14) {
    return {
      label: "This Week",
      className: "bg-muted text-muted-foreground border-border",
    }
  }
  return null
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
