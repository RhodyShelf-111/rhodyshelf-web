import { PageContainer } from "@/components/layout/page-container"
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

// Shown instantly on navigation while the category's results payload streams
// in — the category pages carry the site's largest payloads, so a frozen
// screen here is what read as "nothing happened" on cellular.
export default function CategoryLoading() {
  return (
    <PageContainer className="py-6 md:py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-32" />

      {/* Heading + description */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {/* Intro copy */}
      <Skeleton className="mb-4 -mt-2 h-4 w-full max-w-2xl" />

      {/* Category switcher chips */}
      <div className="mb-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Results top bar: count + sort/filter */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <ProductGridSkeleton />
    </PageContainer>
  )
}
