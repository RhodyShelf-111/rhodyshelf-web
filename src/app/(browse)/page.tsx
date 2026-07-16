import Link from "next/link"
import { getHomepageSections, getBrandNames } from "@/lib/queries/products"
import { HeroSearch } from "@/components/search/hero-search"
import { PageContainer } from "@/components/layout/page-container"
import { HomepageClient } from "./homepage-client"
import { getCategoryIcon } from "@/lib/utils"
import { JsonLd } from "@/components/seo/json-ld"
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data"
import type { Metadata } from "next"

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: "RhodyShelf — Rhode Island Cannabis Menus & Deals",
  description:
    "Browse cannabis products across 9 Rhode Island dispensaries. Search by brand, category, strain, price, and more.",
  alternates: { canonical: "/" },
}

export default async function HomePage() {
  // Each section carries a ~24-listing random sample plus the true count —
  // the full catalog never leaves the server.
  const [sections, brands] = await Promise.all([
    getHomepageSections(),
    getBrandNames(),
  ])

  return (
    <PageContainer className="py-6 md:py-8">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      {/* Hero */}
      <div className="mb-8">
        <h1 className="font-heading text-[clamp(1.625rem,3.2vw,2.5rem)] font-bold tracking-tight leading-[1.1] text-foreground mb-2">
          Search RI dispensary menus, all in one place.
        </h1>
        <p className="text-muted-foreground text-base md:text-lg mb-5 max-w-2xl lg:max-w-none lg:whitespace-nowrap">
          Browse every Rhode Island dispensary menu, compare prices across the state, and find what you&apos;re looking for.
        </p>
        <HeroSearch
          brands={brands}
          className="max-w-xl"
        />

        {/* Quick-browse category chips — one-tap jump from the hero into the
            most-searched categories. Server-rendered from the same sections
            shown below, so the labels and counts always stay in sync.
            Horizontally scrollable on mobile, wraps on desktop. */}
        {sections.length > 0 && (
          <nav
            aria-label="Browse by category"
            className="mt-4 flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hidden [mask-image:linear-gradient(to_right,#000_90%,transparent)] md:[mask-image:none] md:flex-wrap md:overflow-visible"
          >
            {sections.map((section) => (
              <Link
                key={section.key}
                href={`/category/${section.key}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span aria-hidden="true">{getCategoryIcon(section.key)}</span>
                {section.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Category sections */}
      <HomepageClient sections={sections} />
    </PageContainer>
  )
}
