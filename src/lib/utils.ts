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
      className: "bg-green-100 text-green-800 border-green-200",
    }
  }
  if (days <= 7) {
    return {
      label: "Fresh",
      className: "bg-green-50 text-green-700 border-green-200",
    }
  }
  if (days <= 14) {
    return {
      label: "This Week",
      className: "bg-gray-100 text-gray-600 border-gray-200",
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
    flower: "🌿",
    concentrates: "💧",
    edibles: "🍪",
    "pre-rolls": "🚬",
    vapes: "💨",
    tinctures: "💊",
    topicals: "🧴",
  }
  return icons[category?.toLowerCase()] ?? "🌿"
}
