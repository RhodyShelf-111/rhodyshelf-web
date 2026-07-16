import { describe, it, expect } from "vitest"
import {
  organizationJsonLd,
  websiteJsonLd,
  productJsonLd,
  storeJsonLd,
  collectionPageJsonLd,
} from "./structured-data"
import type { Dispensary, InventoryListing } from "@/lib/types"

// NEXT_PUBLIC_SITE_URL is not set under vitest, so builders fall back to the
// production base URL — assertions below rely on that.
const BASE = "https://rhodyshelf.com"

const dispensary: Dispensary = {
  id: "d1",
  name: "Sweetspot Exeter",
  slug: "sweetspot-exeter",
  city: "Exeter",
  menu_url: "https://sweetspot.example/menu",
}

function makeListing(overrides: Partial<InventoryListing> = {}): InventoryListing {
  return {
    id: "l1",
    price: 10,
    original_price: null,
    discount_amount: null,
    discount_percent: null,
    thc_percent: 22.5,
    cbd_percent: null,
    image_url: "https://images.example/x.jpg",
    product_url: null,
    last_seen_at: "2026-07-15T12:00:00.000Z",
    product: {
      id: "p1",
      name: "Lifted Gummies 5pk",
      brand_id: null,
      brand_name: "Lovewell Farms",
      category: "edible",
      subcategory: null,
      weight_grams: null,
      weight_display: null,
      strain_type: "hybrid",
      strain_name: null,
      image_url: null,
    },
    dispensary,
    ...overrides,
  }
}

describe("productJsonLd", () => {
  it("emits a complete Offer when the listing has a price", () => {
    const data = productJsonLd(makeListing())
    const offer = data.offers as Record<string, unknown>
    expect(offer.price).toBe("10.00")
    expect(offer.priceCurrency).toBe("USD")
    expect(offer.availability).toBe("https://schema.org/InStock")
    expect(offer.itemCondition).toBe("https://schema.org/NewCondition")
    expect(offer.url).toBe(`${BASE}/product/l1`)
    expect(offer.seller).toEqual({
      "@type": "Organization",
      name: "Sweetspot Exeter",
    })
  })

  it("derives priceValidUntil as last_seen_at + 48h (date only)", () => {
    const data = productJsonLd(makeListing({ last_seen_at: "2026-07-15T12:00:00.000Z" }))
    const offer = data.offers as Record<string, unknown>
    expect(offer.priceValidUntil).toBe("2026-07-17")
  })

  it("omits offers entirely when price is unknown", () => {
    const data = productJsonLd(makeListing({ price: null }))
    expect(data).not.toHaveProperty("offers")
  })
})

describe("storeJsonLd", () => {
  it("carries a stable @id and a city-level address", () => {
    const data = storeJsonLd(dispensary, 5)
    expect(data["@id"]).toBe(`${BASE}/dispensary/sweetspot-exeter#store`)
    expect(data.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Exeter",
      addressRegion: "RI",
      addressCountry: "US",
    })
  })

  it("omits the address node when city is unknown", () => {
    const data = storeJsonLd({ ...dispensary, city: null }, 5)
    expect(data).not.toHaveProperty("address")
  })
})

describe("collectionPageJsonLd", () => {
  it("emits ItemList with positioned absolute item URLs, capped at 25", () => {
    const paths = Array.from({ length: 30 }, (_, i) => `/product/p${i}`)
    const data = collectionPageJsonLd({
      name: "Edibles",
      description: "d",
      path: "/category/edible",
      itemCount: 30,
      itemPaths: paths,
    })
    const list = data.mainEntity as {
      numberOfItems: number
      itemListElement: { position: number; url: string }[]
    }
    expect(list.numberOfItems).toBe(30)
    expect(list.itemListElement).toHaveLength(25)
    expect(list.itemListElement[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      url: `${BASE}/product/p0`,
    })
    expect(list.itemListElement[24].position).toBe(25)
  })

  it("keeps mainEntity but omits itemListElement when itemPaths is absent, and links isPartOf to the WebSite @id", () => {
    const data = collectionPageJsonLd({
      name: "Dispensaries",
      description: "d",
      path: "/dispensary",
      itemCount: 9,
    })
    expect(data.isPartOf).toEqual({ "@id": `${BASE}#website` })
    const list = data.mainEntity as Record<string, unknown>
    expect(list.numberOfItems).toBe(9)
    expect(list).not.toHaveProperty("itemListElement")
  })

  it("omits mainEntity for an empty collection", () => {
    const data = collectionPageJsonLd({
      name: "Empty",
      description: "d",
      path: "/category/topical",
      itemCount: 0,
    })
    expect(data).not.toHaveProperty("mainEntity")
  })
})

describe("organization/website graph", () => {
  it("links WebSite.publisher to the Organization @id", () => {
    const org = organizationJsonLd()
    const site = websiteJsonLd()
    expect(org["@id"]).toBe(`${BASE}#organization`)
    expect(site.publisher).toEqual({ "@id": `${BASE}#organization` })
  })

  it("exposes a support contact on the Organization", () => {
    const org = organizationJsonLd()
    expect(org.contactPoint).toMatchObject({ email: "hello@rhodyshelf.com" })
  })
})
