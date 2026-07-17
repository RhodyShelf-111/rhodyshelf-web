import type { Dispensary, InventoryListing } from "@/lib/types"

/**
 * schema.org structured-data builders. Each returns a plain JSON-LD object to
 * be rendered via <JsonLd>. Absolute URLs are built from the site base so the
 * markup is valid regardless of which page embeds it.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rhodyshelf.com"

const SITE_NAME = "RhodyShelf"
const SITE_DESCRIPTION =
  "Browse cannabis menus across 9 Rhode Island dispensaries in one place. Search products, compare prices, find deals, and see where to buy."

// Stable node identifiers so the home-page Organization and WebSite entities
// form a single connected graph (WebSite.publisher → Organization).
const ORG_ID = `${BASE_URL}#organization`
const WEBSITE_ID = `${BASE_URL}#website`

const abs = (path: string) => new URL(path, BASE_URL).toString()

/** Organization entity for the home page (brand knowledge panel). */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: BASE_URL,
    logo: abs("/icon.png"),
    description: SITE_DESCRIPTION,
    // Aggregator serving the whole state — reinforces the geographic scope.
    areaServed: { "@type": "State", name: "Rhode Island" },
    knowsAbout: [
      "Rhode Island cannabis dispensaries",
      "cannabis menus",
      "cannabis deals",
      "cannabis strains",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@rhodyshelf.com",
    },
  }
}

/** WebSite entity with a SearchAction (enables the sitelinks search box). */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: BASE_URL,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

/** Product + Offer for a single listing's detail page. */
export function productJsonLd(listing: InventoryListing): Record<string, unknown> {
  const p = listing.product
  const image = listing.image_url ?? p.image_url
  const descriptionBits = [p.strain_type, p.strain_name, p.category].filter(
    Boolean
  )

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.id,
    category: p.category,
    ...(image ? { image: [image] } : {}),
    ...(p.brand_name
      ? { brand: { "@type": "Brand", name: p.brand_name } }
      : {}),
    ...(descriptionBits.length
      ? { description: `${p.name} — ${descriptionBits.join(", ")}.` }
      : {}),
  }

  // A valid Offer needs a price; skip offers entirely when price is unknown.
  if (listing.price != null) {
    // Cap the price's validity at ~48h from when we last saw it: listings are
    // only shown while fresh (<24h), so this never advertises a stale price as
    // still valid. Clears Google's "priceValidUntil" non-critical warning.
    const priceValidUntil = new Date(
      new Date(listing.last_seen_at).getTime() + 48 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10)

    data.offers = {
      "@type": "Offer",
      priceCurrency: "USD",
      price: listing.price.toFixed(2),
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      url: abs(`/product/${listing.id}`),
      seller: { "@type": "Organization", name: listing.dispensary.name },
    }
  }

  return data
}

/** Store (LocalBusiness) for a dispensary page. Address is city-level only. */
export function storeJsonLd(
  dispensary: Dispensary,
  productCount: number
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": abs(`/dispensary/${dispensary.slug}#store`),
    name: dispensary.name,
    url: abs(`/dispensary/${dispensary.slug}`),
    ...(dispensary.menu_url ? { sameAs: dispensary.menu_url } : {}),
    ...(dispensary.city
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: dispensary.city,
            addressRegion: "RI",
            addressCountry: "US",
          },
        }
      : {}),
    ...(productCount > 0
      ? {
          makesOffer: {
            "@type": "Offer",
            itemOffered: {
              "@type": "AggregateOffer",
              offerCount: productCount,
            },
          },
        }
      : {}),
  }
}

/** Cap on ItemList entries — keeps the JSON-LD lean; callers should pre-slice
 *  their listing arrays to this so they don't map thousands of paths only for
 *  the excess to be discarded here. */
export const ITEM_LIST_MAX = 25

/**
 * CollectionPage for a listing/hub page (brand, category, dispensary index,
 * deals, drops). Pass `itemPaths` (app-relative URLs of the first items shown)
 * to emit an explicit ItemList of ListItem URLs — this gives Google the
 * page→child relationships and is eligible for list carousels (unlike price
 * rich results, which cannabis policy blocks). Capped at ITEM_LIST_MAX.
 */
export function collectionPageJsonLd(opts: {
  name: string
  description: string
  path: string
  itemCount: number
  itemPaths?: string[]
}): Record<string, unknown> {
  const itemListElement = (opts.itemPaths ?? [])
    .slice(0, ITEM_LIST_MAX)
    .map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(p),
    }))

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    isPartOf: { "@id": WEBSITE_ID },
    ...(opts.itemCount > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: opts.itemCount,
            ...(itemListElement.length ? { itemListElement } : {}),
          },
        }
      : {}),
  }
}
