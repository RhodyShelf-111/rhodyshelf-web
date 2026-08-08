import Link from "next/link"
import { PackageX } from "lucide-react"
import type { Metadata } from "next"
import { getBrandNames } from "@/lib/queries/products"
import { HeroSearch } from "@/components/search/hero-search"
import { PageContainer } from "@/components/layout/page-container"

// This boundary sits nearer than (browse)/not-found.tsx, so it wins for the
// notFound() thrown by product/[id]/page.tsx — the same mechanism documented in
// (browse)/not-found.tsx.
export const metadata: Metadata = {
  title: "This listing is off the menu",
}

/**
 * 404 for a product link whose listing is gone.
 *
 * Product pages only serve fresh (< 24h) listings, so a shared product URL
 * dead-ends the moment the SKU clears a menu — routine, not exceptional. The
 * generic "the page you're looking for doesn't exist or may have moved" told
 * the highest-intent visitor on the site (someone who was texted a deal) that
 * the page never existed, and handed them nothing to do about it. Say what
 * actually happened and put a search box in front of them instead.
 *
 * Renders only the body: the (browse) layout already supplies the single
 * header/footer chrome around this (see (browse)/not-found.tsx).
 */
export default async function ProductNotFound() {
  // Secondary content on an error path — a failed brand fetch must not turn a
  // 404 into a 500. The search box still works with an empty local seed.
  const brands = await getBrandNames().catch(() => [])

  return (
    <PageContainer className="max-w-xl py-16 md:py-24">
      <div className="text-center">
        <div className="mb-5 flex justify-center">
          <PackageX className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="font-heading mb-2 text-3xl font-bold text-foreground">
          This listing is off the menu
        </h1>
        <p className="text-muted-foreground">
          Rhode Island dispensary stock changes throughout the day, and this one
          is no longer listed. Search the name — another shop may still have it.
        </p>
      </div>

      <HeroSearch
        brands={brands}
        className="mx-auto mt-6"
        placeholder="Search by product, brand, or strain..."
      />

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/deals"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Today&apos;s deals
        </Link>
        <Link
          href="/drops"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          New drops
        </Link>
        <Link
          href="/search"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Browse all products
        </Link>
      </div>
    </PageContainer>
  )
}
