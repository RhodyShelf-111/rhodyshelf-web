@AGENTS.md

RhodyShelf is a cannabis price-comparison site for Rhode Island. See
[README.md](README.md) for the stack and [docs/architecture.md](docs/architecture.md)
for how the data layer works.

## Commands

```bash
npm run verify     # lint + typecheck + test — run this before pushing
npm run test       # vitest, single run
npm run typecheck  # tsc --noEmit
npm run dev        # dev server
```

If `typecheck` reports errors in `.next/types/validator.ts` — missing route
modules, or a layout not satisfying `LayoutConfig` — the build artifacts are
stale, not your code. `tsconfig.json` includes `.next/types/**` and
`.next/dev/types/**`, so a `.next` predating a route move typechecks the old
route table. `rm -rf .next` and re-run. CI never hits this; it checks out clean.

## Data layer

`src/lib/queries/products.ts` and `dispensaries.ts` own every Supabase read.
Nothing else queries the database.

- **Never pass the catalog to a client component.** Doing this once shipped
  10.5MB pages. Filter, sort, and paginate in Postgres, or ship a bounded slice
  and let the client fetch the rest from a route handler.
- **Keep request APIs (`cookies()`, `headers()`) out of `src/app/(browse)/layout.tsx`.**
  That absence is the only reason every browse route is static/ISR. The age-gate
  cookie is read client-side in `age-gate.tsx` for exactly this reason.
- **The service-role key bypasses RLS**, so the 24h freshness window is applied
  explicitly in every query via `freshnessCutoff()`. RLS only protects anon.
  Forget it and you serve products that sold out weeks ago.
- **PostgREST caps every response at 1000 rows.** Any potentially-large read
  must go through the range-pagination helper `fetchAllListings()`. The biggest
  dispensary is ~925 fresh rows and growing.
- **Throw on query errors inside `unstable_cache`.** Returning a degraded value
  caches the degradation for the whole revalidate window; throwing makes ISR keep
  serving the last good render. Dynamic routes catch per-request.

## Traps that don't announce themselves

Each of these has cost real debugging time. They fail silently — no error, no
warning, just wrong output.

**`products.weight_grams` carries three different units, and two of them print
as "mg".** Never divide the raw column. Go through `src/lib/product-units.ts`
(`netWeightGrams`, `thcMilligrams`) or `formatUnitPrice` in `src/lib/utils.ts`.
Flower-equivalent rows are deliberately refused rather than converted — a
confidently wrong $/dose is worse than a blank one. `thc_percent` is polluted
the same way and is sanitized separately in `queries/products.ts`.

**Adding a sort means updating four lists together.** `/search` sorts in
PostgREST; every other grid sorts in JS. `searchListings`' sort switch has a
`default:` that falls through to `brand-asc`, so a sort the server can't express
shows its label and silently returns alphabetical results. Update `SORT_OPTIONS`
(`lib/sort.ts`), `VALID_SORTS` (`lib/search-params.ts`), `SORT_VALUES`
(`lib/filter-params.ts`), and the `sort` union in `lib/types.ts` — and add it to
`UNROUNDTRIPPABLE_SORTS` (`components/search/filter-bar.tsx`) if there's no
column to order on.

**A green vitest run does not prove a server component works.** The jsdom
renderer ignores `"use client"`, so anything crossing the RSC boundary behaves
differently in the real app. A constant exported from a client module and read
by a server component returns a *stub*, not the value — comparisons against it
silently go falsy while the test still passes. Never export non-component values
from a `"use client"` module. Verify boundary changes in a browser, not just in
tests.

**`AgeGate` belongs in the root layout** (`src/app/layout.tsx`), not the browse
layout. Only the root layout composes with `not-found.tsx`, so root mounting is
what gates 404s too. Adding a second one double-gates every route. A test
asserts it stays out of `(browse)`.

**Horizontal card rails need `scroll-px-*` matching every `px-*`.** A
`snap-start` child aligns to the scrollport inset by `scroll-padding`, which
defaults to 0 — so the browser self-scrolls the rail on load and drags the first
card out from under its heading. Only rails long enough to overflow are
affected, which makes it look random. Regression test in `brand-group.test.tsx`.

**Bottom sheets need `useSwipeDismiss`** (`src/hooks/use-swipe-dismiss.ts`).
Base UI's `Dialog` ships no drag gesture, so a grab handle without this hook is
an affordance that promises a gesture the sheet doesn't implement.

## Database

The remote Supabase project is the source of truth; `supabase/migrations/`
mirrors it for review.

**Logic that must survive the sync belongs in a trigger.** An external service
rewrites a large share of `products` and `current_inventory` every run, so a
one-time `UPDATE` does not stick. Brand canonicalization, `product_drops`, and
`product_restocks` are all in-database triggers for this reason.

The Supabase MCP honours `begin; …; rollback;` in a single `execute_sql` call,
so trigger behavior can be tested against real production rows without writing
anything.

## Matching products across dispensaries

Dispensary feeds don't share product ids — the same SKU at three shops is
usually three `products` rows, and grouping by `product_id` links only ~4% of
the catalog. Match on **brand + normalized name + pack size + category**
(`src/lib/price-comparison.ts`), which links ~12%. Reuse the already-cached
brand listings rather than adding a query.

## Analytics

PostHog is cookieless and **Production-only on purpose**. Do not add the key to
Dev or Preview — hot-reload pageviews and test clicks would be most of the
dataset the kill criterion in `docs/analytics.md` reads. Bounce rate is
meaningless here (autocapture and `$pageleave` are off by design); use event
ratios like `buy_click` per product-page view.

## Testing

- Run: `npm run test` (vitest, jsdom). Watch mode: `npm run test:watch`. Tests are colocated: `foo.ts` → `foo.test.ts`. See TESTING.md.
- 100% test coverage is the goal — tests make vibe coding safe.
- When writing new functions, write a corresponding test.
- When fixing a bug, write a regression test.
- When adding error handling, write a test that triggers the error.
- When adding a conditional (if/else, switch), write tests for BOTH paths.
- Never commit code that makes existing tests fail.
