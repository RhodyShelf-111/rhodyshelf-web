# Architecture

How RhodyShelf's data layer works, and why it works that way. [CLAUDE.md](../CLAUDE.md)
has the short version as rules; this is the reasoning behind them.

## The shape of the problem

RhodyShelf doesn't own its data. An external service (`rhodyshelf-sync`) reads
dispensary menus and upserts `current_inventory` roughly daily. This app is
read-only against that table, which produces three constraints that drive most
of the design:

1. **Rows are never deleted.** A sold-out product keeps its row; `last_seen_at`
   simply stops advancing. "In stock" is therefore a *query concern*, not a
   column.
2. **The sync rewrites a large share of rows every run.** Any data fix applied
   as a one-time `UPDATE` is gone within days.
3. **Feeds don't share identifiers.** The same SKU at three dispensaries is
   usually three `products` rows.

## Reads and caching

All catalog reads live in `src/lib/queries/products.ts` and `dispensaries.ts`.
Nothing else touches the database.

Queries are wrapped in `unstable_cache` with the tag `inventory` and a 30-minute
revalidate, and pages set matching `export const revalidate` values (900s for
`/deals`, 1800s for most browse routes, 3600s for brand pages, 86400s for static
copy). Because the sync runs about daily, these windows are generous by design —
the catalog is not real-time and never claims to be.

### Freshness is explicit, always

The server uses the **service-role key, which bypasses RLS**. The 24h freshness
window that anon clients get from RLS therefore does not apply, and every query
must filter `.gt("last_seen_at", freshnessCutoff())` itself.

The one deliberate exception is `getUpvotedListings()`, which reads *stale* rows
on purpose: `/saved` shows out-of-stock items with their status, and that
requires seeing rows the freshness window would hide.

### The 1000-row ceiling

PostgREST caps every response at `max_rows=1000`. Any read that could exceed it
goes through `fetchAllListings()`, which range-paginates. The largest single
dispensary is ~925 fresh rows — already close enough that an unpaginated read
would start silently truncating rather than erroring.

### Errors throw inside cached functions

Returning a fallback value from inside `unstable_cache` caches that fallback for
the entire revalidate window — one transient blip degrades the site for 30
minutes. Throwing instead makes `unstable_cache`/ISR keep serving the last good
render. Dynamic routes catch per-request.

### What must not cross the boundary

`src/app/(browse)/layout.tsx` contains **no request APIs** — no `cookies()`, no
`headers()`. That absence is the only reason browse routes can be static/ISR.
The age gate needs a cookie, so it reads `document.cookie` client-side rather
than forcing the whole route group dynamic. This trade is intentional: the gate
is cosmetic (content is always in the DOM), and closing that hole would mean
giving up static rendering site-wide.

Similarly, the catalog itself must never be passed to a client component.
`/category` and `/dispensary` ship only the first `INITIAL_LISTINGS` (96) rows,
then `ProductGrid` fetches the full set **once** from `/api/listings`.

**One fetch, not page-by-page** — this is load-bearing. Page 1 is ISR-baked and
pages 2+ would come from the live cache, i.e. different cache generations. Offset
pagination across them silently drops rows whenever an inventory sync lands
mid-scroll. A single fetch from a single cached snapshot is gap-free. On failure
(after retries) the grid shows a Retry control and keeps an honest total —
"Showing 96 of 1,083" — rather than pretending the short list is complete.

`/api/listings` allowlists its `category` value against `HOMEPAGE_CATEGORIES`
and 400s otherwise, so the route can't be used to flood the cache with
arbitrary keys.

## Units: `weight_grams` means three different things

This is the single most dangerous column in the schema. Dose-priced categories
(edible, tincture, topical) use three conventions, and **two of them display as
"mg"**, so the unit suffix alone cannot separate them:

| Convention | Signal | Example | Meaning |
|---|---|---|---|
| THC mg ÷ 1000 | mg label, value < 1 | `0.1` | 100mg THC |
| Flower-equivalent grams | mg label, value ≥ 1 | `3.33` | ~100mg THC at 30mg/g |
| Real net mass | `g` label, 4.3–250 | `250` | 250 actual grams |

Gram categories (flower, vape, concentrate, pre-roll) are clean — parsed
`weight_display` and `weight_grams` never disagree across the live catalog.

Resolution happens **at the read boundary** in `src/lib/product-units.ts`, not
in the database. A written column would be overwritten by the next sync; a read
boundary survives it. Call `netWeightGrams()` or `thcMilligrams()`; never divide
the raw column.

Flower-equivalent rows return `null` rather than being converted. The 30mg/g
equivalence is a strong inference, not a verified fact, and a confidently wrong
price-per-dose is worse than a blank one. Confirming Rhode Island's actual
equivalence constant would unlock roughly 110 more listings and is close to a
one-line change.

`thc_percent` is polluted the same way and is sanitized separately in
`queries/products.ts` via `POTENCY_BY_WEIGHT`.

## Sorting is split across two engines

`SORT_OPTIONS` in `src/lib/sort.ts` is one shared vocabulary over two different
implementations:

- **Grids** (`/category`, `/dispensary`, `/brand`, `/deals`, `/drops`) sort in
  JS inside `applyFilters` (`src/lib/filter-utils.ts`). Anything expressible in
  JS works.
- **`/search`** sorts in PostgREST via `.order()` in `searchListings`, over
  paginated server results.

The trap: that switch has a `default:` falling through to `brand-asc`. A sort the
server can't express doesn't error — the shopper picks "Best value per gram",
sees that label, and gets an A–Z list with no indication anything went wrong.

`UNROUNDTRIPPABLE_SORTS` in `components/search/filter-bar.tsx` is the guard,
filtering those options out of `/search` only. `discount-desc` and
`unit-price-asc` both live there: discount has no column, and $/g is
`price / weight_grams` with a null guard. Promoting either to `/search` needs a
real orderable column — a generated `price_per_gram` would do it.

There's a second gate: `VALID_SORTS` in `lib/search-params.ts`. `/search` keeps
filters in the URL, so a sort missing from that set bounces back to `brand-asc`
on the next navigation even if the server could honour it.

## Search

`src/lib/search-terms.ts` is the single source of truth for what a query means.
Both server-side search and the client-side grid filter import from it so they
can't drift.

Two rules: queries match against name, brand, strain name, **strain type**, and
**category**; and a multi-word query splits on whitespace with every token
required to match somewhere (AND across words, OR across fields).

Both matter together. Adding fields without tokenizing still fails every
two-word query; tokenizing without the fields still misses `indica` — which is a
strain type on ~590 listings but appears in only 14 product names. Adding a
field means updating `SEARCH_FIELDS` and `searchHaystack` together.

## Cross-dispensary matching

Grouping by `product_id` links about 4% of the catalog. Matching on **brand +
normalized name (lowercased, non-alphanumerics stripped) + pack size** links
about 12%. Category is compared too, so a brand that names an edible and a
pre-roll alike can't cross-match.

Roughly 12% of fresh listings have at least one other shop carrying the same
product and size, and about half of those show a price another shop beats.

The comparison costs no extra query — it's derived from the `getInventoryByBrand()`
result the product page already fetches for its "More from this brand" rail. Any
new surface wanting this should reuse that cached array. Logic is in
`src/lib/price-comparison.ts`.

## Database-side logic

Because the sync rewrites rows constantly, anything that must persist lives in a
trigger:

- **Brand canonicalization** — `normalize_brand()` + `brand_canonical_map` +
  a `BEFORE INSERT OR UPDATE` trigger rewrites variant spellings to a canonical
  name on every write. A one-time UPDATE would not survive the next sync. The
  `brand_dedup_candidates` view (pg_trgm) is the re-scan queue for new merges.
- **`product_drops`** — `AFTER INSERT` on `current_inventory`. Because the sync
  upserts on `(product_id, dispensary_id)`, only genuinely new pairs take the
  INSERT path, giving exact first-seen semantics. Forward-looking; existing
  inventory was not backfilled, since stamping old rows "now" would flood
  `/drops` with the entire catalog.
- **`product_restocks`** — `AFTER UPDATE`, since a restock is an update, not an
  insert. Two details are load-bearing: the `WHEN` clause keeps the function body
  out of the ~4.5k rows a sync touches, and a 3-day absence floor prevents a
  single missed sync run from registering as a restock. Nothing reads this table
  yet.

To test trigger behavior safely, the Supabase MCP honours `begin; …; rollback;`
in a single `execute_sql` call, so changes can be exercised against real
production rows without writing anything.

## Verification gaps to know about

**jsdom cannot see the RSC boundary.** The test renderer ignores `"use client"`,
so a passing test does not prove a server component renders correctly. The
concrete case: a constant exported from a client module and imported by a server
component resolved to a client-reference *stub*, so a `<` comparison against it
went falsy and every image rendered lazy — while the test asserting eager
loading passed. The fix was moving the constant to a plain module
(`src/lib/image-priority.ts`). Never export non-component values from a
`"use client"` module.

**A stale `.next` fails the typecheck with errors that aren't yours.**
`tsconfig.json` includes `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`, so
`tsc --noEmit` typechecks Next's generated route validators alongside your
source. If those artifacts predate a route move, you get errors naming modules
that no longer exist (`Cannot find module '../../src/app/privacy/page.js'`) and
layouts that "don't satisfy `LayoutConfig`" — all from the old route table. The
main checkout hit exactly this: a June `.next` still describing `privacy` and
`terms` as top-level routes after they moved into `(browse)`. `rm -rf .next`
clears it. CI is immune, since a fresh checkout has no `.next` at all.

**ISR serves stale HTML in dev.** Pages carry `revalidate = 1800`, so after a
source edit the dev server may serve a cached SSR render — the client bundle
updates but the HTML doesn't. It looks exactly like "my change didn't work."
`rm -rf .next` and restart.

**Browser automation reports `document.hidden = true`** in some preview panes,
which defers React hydration and makes hard-loads look broken. Verify in a real
headless browser instead.
