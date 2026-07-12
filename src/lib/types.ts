// Product from the products table (joined via current_inventory)
export interface Product {
  id: string
  name: string
  brand_id: string | null
  brand_name: string
  category: string
  subcategory: string | null
  weight_grams: number | null
  weight_display: string | null
  strain_type: string | null
  strain_name: string | null
  // Product-level fallback image (most recent ci.image_url across dispensaries,
  // populated by the D4 sync). Per-dispensary image lives on InventoryListing.image_url.
  image_url: string | null
}

// Dispensary from the dispensaries table (joined via current_inventory)
export interface Dispensary {
  id: string
  name: string
  slug: string
  city: string | null
  menu_url: string | null
}

// A single inventory listing — 1 product at 1 dispensary
// This is the core data model: 1 card = 1 InventoryListing
export interface InventoryListing {
  id: string
  price: number | null
  original_price: number | null
  discount_amount: number | null
  discount_percent: number | null
  thc_percent: number | null
  cbd_percent: number | null
  // Per-dispensary image URL (preferred over product.image_url for card display)
  image_url: string | null
  // Direct deep-link to the product on the dispensary's menu page (primary CTA target)
  product_url: string | null
  last_seen_at: string
  product: Product
  dispensary: Dispensary
}

// One upvoted product resolved for the Saved page: a single representative
// listing (deduped across dispensaries) plus its live stock status. Out-of-stock
// upvotes still resolve to a card — via their last-known listing, or a synthetic
// listing built from the products row once every inventory snapshot is purged.
export interface UpvotedListing extends InventoryListing {
  // True when the product has at least one fresh (< 24h) listing at an active
  // dispensary. False means out of stock — the listing carries last-known info.
  inStock: boolean
  // How many active dispensaries currently carry it (fresh). 0 when out of stock.
  dispensaryCount: number
}

// Product event from partitioned product_events table
export interface ProductEvent {
  product_id: string
  dispensary_id: string
  event_date: string
}

// A drop = an inventory listing enriched with event date
export interface DropListing extends InventoryListing {
  dropped_at: string // event_date from product_events
}

// Dispensary with product count for the dispensary list page
export interface DispensaryWithCounts extends Dispensary {
  product_count: number
  deal_count: number
}

// One homepage category rail: a small sample of listings + the true count
export interface CategorySection {
  key: string
  label: string
  count: number
  listings: InventoryListing[]
}

// Normalized server-side search input, derived from /search URL params
export interface SearchQuery {
  q?: string
  category?: string
  brand?: string
  dispensary?: string
  onSale?: boolean
  sort: NonNullable<ProductFilters["sort"]>
}

// One page of server-side search results
export interface SearchPage {
  listings: InventoryListing[]
  total: number
  pageSize: number
}

// Filter state for the menu page
export interface ProductFilters {
  category?: string
  brand?: string
  dispensary?: string
  strainType?: string
  minPrice?: number
  maxPrice?: number
  minThc?: number
  onSale?: boolean
  search?: string
  sort?:
    | "price-asc"
    | "price-desc"
    | "thc-desc"
    | "name-asc"
    | "newest"
    | "brand-asc"
    | "discount-desc"
}

// Brand for brand pages
export interface Brand {
  id: string
  canonical_name: string
  slug: string
  category: string | null
}

// Search autocomplete suggestion (from /api/search/suggest)
export type SuggestionType = "product" | "brand" | "strain"
export interface Suggestion {
  type: SuggestionType
  value: string
}
