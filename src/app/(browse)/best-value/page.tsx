import Link from "next/link"
import type { Metadata } from "next"
import { ChevronRight } from "lucide-react"
import { getInventoryByCategory } from "@/lib/queries/products"
import { rankByValue, VALUE_CATEGORIES } from "@/lib/value-ranking"
import { ValueRow } from "@/components/product/value-row"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeading } from "@/components/layout/page-heading"
import { JsonLd } from "@/components/seo/json-ld"
import { collectionPageJsonLd, ITEM_LIST_MAX } from "@/lib/seo/structured-data"
import { pageOpenGraph } from "@/lib/seo/og"
import { CATEGORY_COPY, INDEX_COPY, VALUE_DISCLAIMER } from "./copy"

export const revalidate = 1800

export const metadata: Metadata = {
  title: INDEX_COPY.title,
  description: INDEX_COPY.description,
  alternates: { canonical: "/best-value" },
  openGraph: pageOpenGraph({
    title: INDEX_COPY.title,
    description: INDEX_COPY.description,
    url: "/best-value",
  }),
}

const PREVIEW_ROWS = 5

export default async function BestValueIndexPage() {
  // One cached fetch per category, all already warm from /category/[slug].
  const perCategory = await Promise.all(
    VALUE_CATEGORIES.map(async (category) => {
      const listings = await getInventoryByCategory(category)
      const sections = rankByValue(listings, category, {
        rowsPerBand: PREVIEW_ROWS,
      })
      // Lead with the biggest band — the size most people actually buy.
      const headline = sections.reduce<(typeof sections)[number] | null>(
        (best, s) => (best && best.candidateCount >= s.candidateCount ? best : s),
        null
      )
      return { category, headline }
    })
  )

  const populated = perCategory.filter((c) => c.headline !== null)

  const itemPaths = populated
    .flatMap((c) => c.headline!.rows)
    .slice(0, ITEM_LIST_MAX)
    .map((r) => `/product/${r.listing.id}`)

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd
        data={collectionPageJsonLd({
          name: INDEX_COPY.title,
          description: INDEX_COPY.description,
          path: "/best-value",
          itemCount: itemPaths.length,
          itemPaths,
        })}
      />

      <PageHeading
        title={INDEX_COPY.heading}
        description={
          <>
            <p>{INDEX_COPY.subheading}</p>
            <p className="mt-1 text-sm">{VALUE_DISCLAIMER}</p>
          </>
        }
      />

      {populated.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-2 text-lg font-medium text-foreground">
            Not enough current listings to rank
          </p>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
            Check back after the next menu update.
          </p>
          <Link
            href="/search"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse all products
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {populated.map(({ category, headline }) => (
            <section key={category} aria-labelledby={`cat-${category}`}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2
                  id={`cat-${category}`}
                  className="font-heading text-lg font-semibold text-foreground"
                >
                  {CATEGORY_COPY[category].tab}
                  <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                    {headline!.band.label}
                  </span>
                </h2>
                <Link
                  href={`/best-value/${category}`}
                  className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  All sizes
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {headline!.rows.map((row, i) => (
                  <ValueRow
                    key={row.listing.id}
                    row={row}
                    band={headline!.band}
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
