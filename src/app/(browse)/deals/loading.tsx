import { PageContainer } from "@/components/layout/page-container"
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function DealsLoading() {
  return (
    <PageContainer className="py-6 md:py-8">
      {/* Heading + description */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-64 max-w-full" />
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
