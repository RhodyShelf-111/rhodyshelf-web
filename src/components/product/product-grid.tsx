"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import type { InventoryListing, ProductFilters } from "@/lib/types"
import { ProductCard } from "./product-card"
import { EAGER_IMAGE_COUNT } from "@/lib/image-priority"
import { ProductFiltersPanel } from "./product-filters"
import { ProductSort } from "./product-sort"
import { applyFilters, deriveFacetOptions } from "@/lib/filter-utils"
import { FilterSheet } from "@/components/filters/filter-sheet"
import { Button } from "@/components/ui/button"
import { Loader2, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductGridProps {
  listings: InventoryListing[]
  initialFilters?: ProductFilters
  showFilters?: boolean
  pageSize?: number
  /** Resolves a listing's "just dropped" badge. A function rather than a
   *  prebuilt map because the grid can swap its own listings in (see loadRest),
   *  and a map built by the caller from the first slice would leave every
   *  later-arriving card unbadged. */
  dropBadgeFor?: (
    listing: InventoryListing
  ) => { label: string; className: string } | null
  /** Forwarded to each ProductCard; false on single-dispensary pages. */
  showDispensary?: boolean
  /**
   * Reports the filters after every user change (never for the initial
   * state), so a host can mirror them elsewhere — MenuClient writes them
   * into the URL.
   */
  onFiltersChange?: (filters: ProductFilters) => void
  /**
   * Progressive loading. When set, `listings` is only the server-rendered first
   * slice of a larger set; the grid fetches the whole set once from
   * /api/listings (a single cached snapshot) and swaps it in, so the initial
   * payload — and first paint on cellular — stays small while client-side
   * filtering stays complete. `total` is the server's count (a display estimate
   * while loading); `scope`/`value` identify what to fetch. Omit it and the
   * grid behaves exactly as before (all listings up front).
   */
  loadRest?: {
    total: number
    scope: LoadRestScope
    /** Required for keyed scopes; omitted for the whole-site ones. */
    value?: string
  }
}

/**
 * Scopes /api/listings can serve a full set for. The keyed ones identify a
 * subset by slug or name; drops and deals are whole-site lists with nothing to
 * key on, so they carry no value.
 */
export type LoadRestScope =
  | "category"
  | "dispensary"
  | "brand"
  | "drops"
  | "deals"

const KEYLESS_SCOPES = new Set<LoadRestScope>(["drops", "deals"])

/**
 * How long to wait — after the page's own load, in idle time — before warming
 * the full set for a shopper who hasn't asked for it yet.
 */
const FULL_SET_IDLE_MS = 1000

/**
 * How many filters actually narrow the grid. `sort` rides along in the same
 * ProductFilters object but reorders rather than removes, so counting it would
 * badge the Filters button "1" on a page with a default sort (/deals), render
 * a chip row holding nothing but "Clear all", and — worst — make the heading
 * abandon the server's true total mid-load (see resultTotal) in favour of the
 * loaded slice's size.
 */
export function countActiveFilters(filters: ProductFilters): number {
  return Object.entries(filters).filter(
    ([key, value]) =>
      key !== "sort" && value != null && value !== "" && value !== false
  ).length
}

export function ProductGrid({
  listings,
  initialFilters = {},
  showFilters = true,
  pageSize = 50,
  dropBadgeFor,
  showDispensary = true,
  onFiltersChange,
  loadRest,
}: ProductGridProps) {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters)
  const [displayCount, setDisplayCount] = useState(pageSize)
  // The full set fetched in the background for a progressive list (see
  // loadRest). null = not loaded yet (or the fetch failed); an array (even
  // empty) = the authoritative full set has arrived.
  const [rest, setRest] = useState<InventoryListing[] | null>(null)
  const [loadingRest, setLoadingRest] = useState(false)
  const [loadError, setLoadError] = useState(false)
  // Bumped by the retry button to re-run the fetch effect.
  const [retryTick, setRetryTick] = useState(0)
  // Gate for the full-set fetch (see loadRest). It stays shut until the shopper
  // needs the whole set — filtering, sorting, or paging past the slice — so a
  // session that lands, reads two rows and taps a card never pays for ~1 MB of
  // JSON (117 KB gzipped on /category/flower) over the same connection that is
  // still pulling product images. Deep-linked filters/sort need it up front:
  // they apply to the whole category, not to the slice we happen to hold.
  const [wantFullSet, setWantFullSet] = useState(
    () => countActiveFilters(initialFilters) > 0 || initialFilters.sort != null
  )
  const requestFullSet = useCallback(() => setWantFullSet(true), [])

  // Mirror filter state up — but never the untouched initial state (reference
  // check): on first mount MenuClient hasn't read the URL params yet, and a
  // mount-time report would overwrite them with the empty defaults. Also
  // holds across StrictMode re-runs and the host's remount-by-key.
  useEffect(() => {
    if (filters === initialFilters) return
    onFiltersChange?.(filters)
  }, [filters, initialFilters, onFiltersChange])

  // Fetch the WHOLE category/dispensary set once from /api/listings — a single
  // cached snapshot — so client-side filtering has a complete, self-consistent
  // list. `listings` (the server-rendered first slice) is only for instant
  // paint; once the full set arrives it replaces that slice. Fetching in one
  // request (not page-by-page across cache generations) is what keeps this
  // gap-free: offset pagination over independently-cached pages can silently
  // drop rows after an inventory sync. `restTotal` is a display estimate only,
  // never a loop bound. Primitive deps so a fresh loadRest object per render
  // can't restart the fetch. Held behind `wantFullSet` so this megabyte lands
  // when the shopper needs it, not on top of the first paint.
  const restTotal = loadRest?.total
  const restScope = loadRest?.scope
  const restValue = loadRest?.value
  useEffect(() => {
    if (!restScope || !wantFullSet) return
    // Keyed scopes are meaningless without their key; the whole-site ones
    // (drops, deals) have nothing to key on, so requiring a value here would
    // silently strand them on the server-rendered slice.
    if (!KEYLESS_SCOPES.has(restScope) && !restValue) return
    const controller = new AbortController()
    let cancelled = false
    setLoadingRest(true)
    setLoadError(false)
    ;(async () => {
      const url = restValue
        ? `/api/listings?scope=${restScope}&value=${encodeURIComponent(restValue)}`
        : `/api/listings?scope=${restScope}`
      // Retry a transient failure a couple of times before giving up — this
      // page exists for slow/flaky cellular, where one dropped request must
      // not leave a silently truncated menu.
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const res = await fetch(url, { signal: controller.signal })
          // A 400/404 is the route telling us the scope or value is wrong —
          // retrying it just spends two more requests and ~1.2s of "Loading"
          // to get the same answer. Only 5xx and network faults are transient.
          if (res.status >= 400 && res.status < 500) {
            setLoadError(true)
            setLoadingRest(false)
            return
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = (await res.json()) as { listings: InventoryListing[] }
          if (cancelled) return
          // Replace the slice with the full set — even when empty (a genuinely
          // sold-out category) — so the grid reflects reality, not stale rows.
          setRest(data.listings ?? [])
          setLoadingRest(false)
          return
        } catch (err) {
          if (cancelled || (err as Error)?.name === "AbortError") return
          if (attempt === 2) {
            // Exhausted retries. Keep the first slice, but flag the failure so
            // the UI surfaces the true total + a retry — never a silently
            // truncated menu that claims the full count in the heading.
            setLoadError(true)
            setLoadingRest(false)
            return
          }
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
        }
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [restScope, restValue, retryTick, wantFullSet])

  // A shopper who lingers still gets the full set — complete filter facets, no
  // "Loading" beat when they finally do filter — just not while the first
  // screen of product images is still arriving. So: wait for the page's own
  // load event, then take an idle slot. Someone who leaves before that fetches
  // nothing at all.
  useEffect(() => {
    if (!restScope || wantFullSet) return
    const warm = () => setWantFullSet(true)

    // Desktop renders the filter sidebar on screen from the start, so its
    // options can't wait for a signal of intent — an incomplete brand list
    // there is silently wrong. Yield a tick, then fetch.
    if (showFilters && window.matchMedia?.("(min-width: 1024px)")?.matches) {
      const id = window.setTimeout(warm, 0)
      return () => window.clearTimeout(id)
    }

    let idleId: number | undefined
    let timerId: number | undefined
    const schedule = () => {
      // requestIdleCallback where it exists (not Safari < 17, not jsdom): the
      // fetch should slot into a quiet moment, never in front of a scroll.
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(warm, { timeout: FULL_SET_IDLE_MS })
      } else {
        timerId = window.setTimeout(warm, FULL_SET_IDLE_MS)
      }
    }
    if (document.readyState === "complete") schedule()
    else window.addEventListener("load", schedule, { once: true })

    return () => {
      window.removeEventListener("load", schedule)
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
      if (timerId !== undefined) window.clearTimeout(timerId)
    }
  }, [restScope, wantFullSet, showFilters])

  // Once the full set has loaded it IS the working set (one consistent snapshot
  // that supersets the slice), even if empty; until then (loading, or the fetch
  // failed and we're degraded to the partial slice) use the server slice.
  const fullyLoaded = rest !== null
  const allListings = rest ?? listings

  const filtered = useMemo(
    () => applyFilters(allListings, filters),
    [allListings, filters]
  )
  const displayed = filtered.slice(0, displayCount)

  // Filter options narrow to the listings matching the OTHER active filters
  // (faceted): pick a dispensary and the brand list only shows brands it
  // stocks. Section visibility keys off the page's full listing set so a
  // narrowed one-option list doesn't make its whole section vanish.
  const facets = useMemo(
    () => deriveFacetOptions(allListings, filters),
    [allListings, filters]
  )
  const pageFacets = useMemo(
    () => deriveFacetOptions(allListings, {}),
    [allListings]
  )
  const { categories, brands, dispensaries, strainTypes } = facets

  const updateFilter = useCallback(
    (key: keyof ProductFilters, value: ProductFilters[keyof ProductFilters]) => {
      // Any filter or sort is a question about the whole category, not about
      // the slice we happen to hold.
      requestFullSet()
      setFilters((prev) => ({ ...prev, [key]: value || undefined }))
      setDisplayCount(pageSize)
    },
    [pageSize, requestFullSet]
  )

  const clearFilters = useCallback(() => {
    requestFullSet()
    setFilters({})
    setDisplayCount(pageSize)
  }, [pageSize, requestFullSet])

  const retryLoadRest = useCallback(() => setRetryTick((t) => t + 1), [])

  const activeFilterCount = countActiveFilters(filters)

  // Until the full set has actually loaded — while loading, or after a failed
  // fetch that left us on the partial slice — show the server's true total, so
  // an unfiltered heading never undercounts to the slice size (which would hide
  // that more products exist). Once loaded, show the real count. A jumpy but
  // honest denominator beats a silent truncation. Only stabilizes to the total
  // when unfiltered; a filter shows how many loaded rows match.
  const resultTotal =
    activeFilterCount === 0 && restTotal != null && !fullyLoaded
      ? restTotal
      : filtered.length

  // Page against the honest total too: while the full set is still outstanding
  // the slice can't answer "how many are left", and "Load more (46 remaining)"
  // on a 1,041-product category is a lie the shopper acts on.
  const hasMore = displayCount < resultTotal

  const filterPanel = (
    <ProductFiltersPanel
      filters={filters}
      categories={categories}
      brands={brands}
      dispensaries={dispensaries}
      strainTypes={strainTypes}
      visibleSections={{
        category: pageFacets.categories.length > 1,
        brand: pageFacets.brands.length > 1,
        dispensary: pageFacets.dispensaries.length > 1,
      }}
      onFilterChange={updateFilter}
      onClear={clearFilters}
    />
  )

  return (
    <div className="flex gap-6">
      {/* Desktop filter sidebar */}
      {showFilters && (
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          {filterPanel}
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar: count + sort + mobile filter button. Sticky under the 64px
            header on mobile — a filtered category runs 11,000px+ and each
            "Load more" adds another ~9,500px, so a non-sticky row means the
            only way back to Filters/Sort is a dozen viewport-heights of
            scrolling. Bleeds into the PageContainer gutter so cards don't slide
            past its edges, and opaque rather than the header's translucent
            treatment — product photography smudges straight through a 4px
            backdrop blur. The desktop layout has the sidebar, so it goes back
            to a plain row at lg. */}
        <div className="sticky top-16 z-30 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0">
          {/* Live region: changing a filter swaps the whole result set with no
              other feedback, so a screen-reader user hears the new count
              instead of silence. */}
          <p
            className="text-sm text-muted-foreground whitespace-nowrap"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            Showing{" "}
            <span className="font-medium text-foreground">
              {Math.min(displayCount, filtered.length).toLocaleString()}
            </span>{" "}
            of {resultTotal.toLocaleString()} products
          </p>

          {/* Reaching for sort or filters is the earliest signal that the slice
              won't do — start the full-set fetch on the way down, before the
              sheet has finished opening. */}
          <div
            className="flex items-center gap-2"
            onPointerDownCapture={requestFullSet}
            onFocusCapture={requestFullSet}
          >
            <ProductSort
              value={filters.sort}
              onChange={(sort) => updateFilter("sort", sort)}
            />

            {/* Mobile filter button — FilterSheet is the one bottom-sheet
                chrome (handle, aligned header, swipe-to-dismiss) shared with
                the search page. */}
            {showFilters && (
              <FilterSheet
                resultCount={resultTotal}
                triggerClassName="lg:hidden inline-flex items-center gap-1.5 h-11 px-3 text-sm rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                trigger={
                  <>
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-[11px] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </>
                }
              >
                {filterPanel}
              </FilterSheet>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.category && (
              <FilterChip
                label={
                  filters.category.charAt(0).toUpperCase() +
                  filters.category.slice(1)
                }
                onRemove={() => updateFilter("category", undefined)}
              />
            )}
            {filters.brand && (
              <FilterChip
                label={filters.brand}
                onRemove={() => updateFilter("brand", undefined)}
              />
            )}
            {filters.dispensary && (
              <FilterChip
                label={
                  dispensaries.find((d) => d.slug === filters.dispensary)?.name ??
                  filters.dispensary
                }
                onRemove={() => updateFilter("dispensary", undefined)}
              />
            )}
            {filters.strainType && (
              <FilterChip
                label={filters.strainType}
                onRemove={() => updateFilter("strainType", undefined)}
              />
            )}
            {filters.onSale && (
              <FilterChip
                label="On Sale"
                onRemove={() => updateFilter("onSale", undefined)}
              />
            )}
            {filters.search && (
              <FilterChip
                label={`"${filters.search}"`}
                onRemove={() => updateFilter("search", undefined)}
              />
            )}
            {/* min-h-11 matches the filter sheet's own Clear-all (filter-bar
                row) — the one-tap escape from a filter that returned nothing
                was a 16px-tall sliver. */}
            <button
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center px-1 text-xs text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Product grid */}
        {displayed.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
              {displayed.map((listing, index) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  dropBadge={dropBadgeFor?.(listing)}
                  showDispensary={showDispensary}
                  eager={index < EAGER_IMAGE_COUNT}
                />
              ))}
            </div>

            {loadingRest ? (
              // The rest of the category/dispensary is still streaming in from
              // /api/listings — surface it so the shopper knows more (and more
              // filter options) are on the way, and so an in-progress filter
              // that matches nothing loaded yet doesn't read as a dead end.
              <LoadingMore total={restTotal ?? filtered.length} />
            ) : loadError ? (
              // The full-set fetch failed after retries — we're showing only
              // the first slice. Say so and offer a retry instead of silently
              // capping the menu.
              <RetryLoad total={restTotal} onRetry={retryLoadRest} />
            ) : (
              hasMore && (
                <div className="flex justify-center mt-8">
                  {/* The only pagination control on the page, reached after
                      ~9,000px of scrolling: h-11 on mobile so a miss doesn't
                      cost another scroll back down. */}
                  <Button
                    variant="outline"
                    className="h-11 px-6 sm:h-8"
                    onClick={() => {
                      // Page 2 already reaches past the server-rendered slice.
                      requestFullSet()
                      setDisplayCount((prev) => prev + pageSize)
                    }}
                  >
                    Load more ({(resultTotal - displayCount).toLocaleString()}{" "}
                    remaining)
                  </Button>
                </div>
              )
            )}
          </>
        ) : loadingRest ? (
          // Nothing matches the loaded rows yet, but more are still arriving —
          // show progress instead of a premature "no products" state.
          <LoadingMore total={restTotal ?? 0} />
        ) : loadError ? (
          // Filter matched nothing in the loaded slice AND the full set failed
          // to load — the match may be in the un-fetched rows, so offer a retry
          // rather than a misleading "no products match."
          <RetryLoad total={restTotal} onRetry={retryLoadRest} empty />
        ) : activeFilterCount === 0 ? (
          // Empty with nothing filtered. Reachable when the full set comes back
          // legitimately empty (the API can answer from a newer, emptier cache
          // generation than the HTML did), and blaming filters there would offer
          // a "Clear all filters" button that clears nothing.
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-foreground mb-2">
              Nothing in stock right now
            </p>
            <p className="text-sm text-muted-foreground">
              Rhode Island menus refresh throughout the day — check back soon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-foreground mb-2">
              No products match your filters
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Try removing a filter or searching for something else.
            </p>
            <Button
              variant="outline"
              className="h-11 px-6 sm:h-8"
              onClick={clearFilters}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingMore({ total }: { total: number }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {total > 0
        ? `Loading all ${total.toLocaleString()} products…`
        : "Loading products…"}
    </div>
  )
}

// Shown when the full-set fetch failed after its retries: the grid is capped at
// the first slice, so tell the shopper the rest didn't load and give them a way
// to get them (instead of a silently truncated menu).
function RetryLoad({
  total,
  onRetry,
  empty = false,
}: {
  total?: number
  onRetry: () => void
  empty?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        empty ? "py-16" : "py-8"
      )}
      role="status"
    >
      <p className="text-sm text-muted-foreground">
        {total != null
          ? `Couldn't load all ${total.toLocaleString()} products.`
          : "Couldn't load all products."}
      </p>
      <Button variant="outline" className="h-11 px-6 sm:h-8" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  // The whole chip removes the filter, not just the ×: at text-xs that glyph
  // measures 8×16px, so most taps landed on the (previously inert) label and
  // the shopper was stranded on a one-product view. h-11 on mobile / the
  // original compact size from sm up — the same treatment as the search page's
  // category chips.
  return (
    <button
      onClick={onRemove}
      className="inline-flex h-11 items-center gap-1 rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80 sm:h-auto sm:px-2.5 sm:py-1"
      aria-label={`Remove ${label} filter`}
    >
      {label}
      <span aria-hidden="true">&times;</span>
    </button>
  )
}
