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
  "Browse cannabis menus across 9 Rhode Island dispensaries in one place. Search products, compare prices, find deals, and buy direct."

const abs = (path: string) => new URL(path, BASE_URL).toString()

/** Organization entity for the home page (brand knowledge panel). */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
    logo: abs("/icon.png"),
    description: SITE_DESCRIPTION,
  }
}

/** WebSite entity with a SearchAction (enables the sitelinks search box). */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
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
    data.offers = {
      "@type": "Offer",
      priceCurrency: "USD",
      price: listing.price.toFixed(2),
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

/** CollectionPage for a brand's product listing page. */
export function collectionPageJsonLd(opts: {
  name: string
  description: string
  path: string
  itemCount: number
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: BASE_URL },
    ...(opts.itemCount > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: opts.itemCount,
          },
        }
      : {}),
  }
}
