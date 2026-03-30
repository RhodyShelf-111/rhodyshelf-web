// Product from the products table (joined via current_inventory)
export interface Product {
  id: string
  name: string
  brand_name: string
  category: string
  subcategory: string | null
  weight_display: string | null
  strain_type: string | null
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
  discount_amount: number | null
  thc_percent: number | null
  cbd_percent: number | null
  last_seen_at: string
  product: Product
  dispensary: Dispensary
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
  address: string | null
  latitude: number | null
  longitude: number | null
  product_count: number
  deal_count: number
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
  sort?: "price-asc" | "price-desc" | "thc-desc" | "name-asc" | "newest" | "brand-asc"
}

// Brand for brand pages
export interface Brand {
  id: string
  canonical_name: string
  slug: string
  category: string | null
  is_active: boolean
}
