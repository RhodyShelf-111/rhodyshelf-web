import { getHomepageSections, getBrandNames } from "@/lib/queries/products"
import { HeroSearch } from "@/components/search/hero-search"
import { HomepageClient } from "./homepage-client"
import type { Metadata } from "next"

export const revalidate = 1800 // 30 minutes

export const metadata: Metadata = {
  title: "RhodyShelf — Rhode Island Cannabis Menus & Deals",
  description:
    "Browse cannabis products across 9 Rhode Island dispensaries. Search by brand, category, strain, price, and more.",
}

export default async function HomePage() {
  // Each section carries a ~24-listing random sample plus the true count —
  // the full catalog never leaves the server.
  const [sections, brands] = await Promise.all([
    getHomepageSections(),
    getBrandNames(),
  ])

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
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
      </div>

      {/* Category sections */}
      <HomepageClient sections={sections} />
    </div>
  )
}
