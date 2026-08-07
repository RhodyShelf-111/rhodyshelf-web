import { PageContainer } from "@/components/layout/page-container"
import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors the ranked-row layout, not the product grid — this page is a list. */
export default function BestValueLoading() {
  return (
    <PageContainer className="py-6 md:py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      {/* Category tabs */}
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-lg" />
        ))}
      </div>

      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, s) => (
          <div key={s}>
            <div className="mb-2 flex items-baseline justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex min-h-14 items-center gap-3 px-3 py-2.5 sm:px-4">
                  <Skeleton className="h-4 w-4 shrink-0" />
                  <Skeleton className="h-11 w-11 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40 max-w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="shrink-0 space-y-1.5 text-right">
                    <Skeleton className="ml-auto h-5 w-16" />
                    <Skeleton className="ml-auto h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
