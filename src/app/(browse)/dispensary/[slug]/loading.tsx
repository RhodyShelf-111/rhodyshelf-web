import { PageContainer } from "@/components/layout/page-container"
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

// Instant placeholder while a dispensary's full menu (~hundreds of listings)
// streams in — keeps the tap from looking frozen on slow connections.
export default function DispensaryLoading() {
  return (
    <PageContainer className="py-6 md:py-8">
      {/* Breadcrumbs */}
      <Skeleton className="mb-4 h-4 w-40" />

      {/* Heading: title + city/count, with a trailing "Visit Site" action */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-11 w-28 rounded-lg sm:h-9" />
      </div>

      {/* Intro copy */}
      <Skeleton className="mb-6 -mt-2 h-4 w-full max-w-2xl" />

      {/* Results top bar: count + sort/filter */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <ProductGridSkeleton />
    </PageContainer>
  )
}
