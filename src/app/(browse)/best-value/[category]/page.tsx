import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getInventoryByCategory } from "@/lib/queries/products"
import {
  rankByValue,
  isValueCategory,
  VALUE_CATEGORIES,
  VALUE_UNIT,
  formatUnitRate,
} from "@/lib/value-ranking"
import { ValueRow } from "@/components/product/value-row"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { JsonLd } from "@/components/seo/json-ld"
import { collectionPageJsonLd, ITEM_LIST_MAX } from "@/lib/seo/structured-data"
import { pageOpenGraph } from "@/lib/seo/og"
import { cn } from "@/lib/utils"
import { CATEGORY_COPY, valueDisclaimer } from "../copy"

export const revalidate = 1800 // matches getInventoryByCategory's cache window

/**
 * The rankable categories are a fixed, fully enumerable set, so anything else is
 * a real 404 rather than a page that renders empty chrome with a 200. Matches
 * /category/[slug]; without it an unknown segment gets served as 200 by the
 * @modal catch-all, which is what /brand/[slug] and /dispensary/[slug] do today.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return VALUE_CATEGORIES.map((category) => ({ category }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  if (!isValueCategory(category)) return {}
  const copy = CATEGORY_COPY[category]
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: `/best-value/${category}` },
    openGraph: pageOpenGraph({
      title: copy.title,
      description: copy.description,
      url: `/best-value/${category}`,
    }),
  }
}

export default async function BestValueCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  if (!isValueCategory(category)) notFound()

  const copy = CATEGORY_COPY[category]
  // Reuses the same cached fetch as /category/[slug] — no extra query, and no
  // new entry under tags: ["inventory"]. All ranking happens in TypeScript,
  // where it is reachable by tests.
  const listings = await getInventoryByCategory(category)
  const sections = rankByValue(listings, category)

  const itemPaths = sections
    .flatMap((s) => s.rows)
    .slice(0, ITEM_LIST_MAX)
    .map((r) => `/product/${r.listing.id}`)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: copy.title,
          description: copy.description,
          path: `/best-value/${category}`,
          itemCount: itemPaths.length,
          itemPaths,
        })}
      />

      <PageHeading
        title={copy.heading}
        description={
          <>
            <p>{copy.subheading}</p>
            {/* The most important line on the page. Ranking by price alone
                would otherwise read as a quality judgement, which it is not. */}
            <p className="mt-1 text-sm">{valueDisclaimer(VALUE_UNIT[category])}</p>
          </>
        }
      />

      <CategoryTabs active={category} />

      {sections.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 space-y-8">
          {sections.map((section) => (
            <section key={section.band.id} aria-labelledby={`band-${section.band.id}`}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2
                  id={`band-${section.band.id}`}
                  className="font-heading text-lg font-semibold text-foreground"
                >
                  {section.band.label}
                </h2>
                <p className="shrink-0 text-[12px] text-muted-foreground">
                  typical {formatUnitRate(section.typicalUnitRate, section.unit)}{" "}
                  · {section.candidateCount} products
                </p>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {section.rows.map((row, i) => (
                  <ValueRow
                    key={row.listing.id}
                    row={row}
                    band={section.band}
                    rank={i + 1}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  )
}

/** One tap between the four rankable categories. */
function CategoryTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Product type" className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {VALUE_CATEGORIES.map((c) => {
          const isActive = c === active
          return (
            <li key={c} className="shrink-0">
              <Link
                href={`/best-value/${c}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {CATEGORY_COPY[c].tab}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Reachable for real: the 24h freshness window empties if a sync run fails, and
 * a size band is dropped when too few products share it.
 */
function EmptyState() {
  return (
    <div className="py-16 text-center">
      <p className="mb-2 text-lg font-medium text-foreground">
        Not enough current listings to rank
      </p>
      <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
        Value rankings need a decent number of products at the same size to
        compare against. Check back after the next menu update.
      </p>
      <Link
        href="/search"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Browse all products
      </Link>
    </div>
  )
}
