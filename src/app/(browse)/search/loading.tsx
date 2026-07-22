import { PageContainer } from "@/components/layout/page-container"
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

// Shown on the initial load of /search (e.g. a "View all" tap from the
// homepage) while the first page of results streams in.
export default function SearchLoading() {
  return (
    <PageContainer className="py-6 md:py-8">
      {/* Heading + description */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      {/* Search box */}
      <Skeleton className="mb-4 h-11 w-full max-w-lg rounded-xl" />

      {/* Filter row: count + category chips */}
      <div className="mb-4 space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      <ProductGridSkeleton className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" />
    </PageContainer>
  )
}
