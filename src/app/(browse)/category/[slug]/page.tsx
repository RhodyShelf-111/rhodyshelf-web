import { notFound } from "next/navigation"
import {
  getInventoryByCategory,
  HOMEPAGE_CATEGORIES,
  INITIAL_LISTINGS,
} from "@/lib/queries/products"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { CategoryNav } from "@/components/layout/category-nav"
import { JsonLd } from "@/components/seo/json-ld"
import {
  collectionPageJsonLd,
  ITEM_LIST_MAX,
} from "@/lib/seo/structured-data"
import { pageOpenGraph } from "@/lib/seo/og"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { MenuClient } from "../../menu/menu-client"
import type { Metadata } from "next"

export const revalidate = 1800

// Only the 7 known categories are valid landing pages; anything else 404s
// rather than rendering an empty page for an arbitrary slug.
export const dynamicParams = false

export function generateStaticParams() {
  return HOMEPAGE_CATEGORIES.map((c) => ({ slug: c.key }))
}

function categoryFor(slug: string) {
  return HOMEPAGE_CATEGORIES.find((c) => c.key === slug) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = categoryFor(slug)
  if (!category) return { title: "Category Not Found" }

  const title = `${category.label} — Rhode Island Cannabis Menus`
  const description = `Browse ${category.label.toLowerCase()} from cannabis dispensaries across Rhode Island. Compare prices, potency, and deals — updated daily.`

  return {
    title,
    description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: pageOpenGraph({ title, description, url: `/category/${slug}` }),
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = categoryFor(slug)
  if (!category) notFound()

  // The full category is fetched (cached) for the count + SEO, but only the
  // first slice is serialized into the payload; the grid fetches the rest from
  // /api/listings (same getInventoryByCategory source, one snapshot). Shipping
  // the whole category up front is what made these pages slow to first paint on
  // cellular — flower alone is ~1,100 listings / ~1 MB.
  const all = await getInventoryByCategory(slug)
  const total = all.length
  const listings = all.slice(0, INITIAL_LISTINGS)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: `${category.label} — Rhode Island Cannabis`,
          description: `${category.label} available across Rhode Island dispensaries.`,
          path: `/category/${slug}`,
          itemCount: total,
          // ITEM_LIST_MAX (25) ≤ one page, so page 1 covers the JSON-LD list.
          itemPaths: listings
            .slice(0, ITEM_LIST_MAX)
            .map((l) => `/product/${l.id}`),
        })}
      />
      <Breadcrumbs
        items={[{ name: category.label, href: `/category/${slug}` }]}
      />

      <PageHeading
        title={category.label}
        description={`${total.toLocaleString()} ${category.label.toLowerCase()} across Rhode Island dispensaries`}
      />

      <p className="text-muted-foreground max-w-2xl mb-4 -mt-2">
        Compare {category.label.toLowerCase()} prices, potency, and deals from
        every Rhode Island dispensary in one place. Menus refresh throughout the
        day.
      </p>

      <CategoryNav activeSlug={slug} />

      {total > 0 ? (
        <MenuClient
          listings={listings}
          headingLabel={category.label}
          loadRest={{ total, scope: "category", value: slug }}
        />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-foreground mb-2">
            No {category.label.toLowerCase()} available right now
          </p>
          <p className="text-sm text-muted-foreground">
            Menus refresh throughout the day — check back soon.
          </p>
        </div>
      )}
    </PageContainer>
  )
}
