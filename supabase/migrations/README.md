# supabase/migrations

SQL migrations for the RhodyShelf database, kept here for version control and review.

**Source of truth is the remote Supabase project.** These migrations were applied
directly to production via the Supabase management API (MCP) and are recorded in the
remote `supabase_migrations.schema_migrations` table. Because the version timestamps
here match the remote history, the Supabase CLI treats them as already applied
(`supabase migration list` will show them as synced; `supabase db push` will not
re-run them).

## What's captured here

The brand de-duplication work and later data-hygiene fixes (2026-07-11, plus a 2026-07-18 durability fix) are mirrored in this folder:

| Version | File | What it does |
|---|---|---|
| `20260711150548` | `brand_canonical_dedup_setup.sql` | `normalize_brand()` fn + `brand_canonical_map` table + seed of the approved merges |
| `20260711150813` | `brand_canonical_dedup_apply.sql` | one-time backfill + `BEFORE INSERT/UPDATE` trigger on `products` that canonicalizes on every write |
| `20260711152329` | `brand_pages_for_merged_brands.sql` | `brands` rows (+ `brand_id` backfill) for the 11 merged brands that lacked one |
| `20260711152339` | `brand_dedup_candidates_view.sql` | `brand_dedup_candidates` view (trigram similarity) — a re-scan queue for future dupes |
| `20260711164352` | `backfill_dispensary_cities.sql` | populate `dispensaries.city` (8/9 were null) for local-SEO `Store` markup + page display |
| `20260711171133` | `normalize_product_names.sql` | `normalize_product_name()` fn + `BEFORE INSERT/UPDATE` trigger on `products` that strips a trailing `" -"` from `name`/`strain_name` on every write; one-time backfill of 578 names (+1 strain) |
| `20260718182204` | `dispensary_city_trigger.sql` | `dispensary_city_map` table (curated slug → city) + `BEFORE INSERT/UPDATE` trigger on `dispensaries` (`apply_dispensary_city()`) that fills a missing `city` from the map on every write, so cities survive WeedShelf re-syncs (which carry no city and wiped the one-time `20260711164352` backfill); re-applies to currently-null rows |
| `20260725191657` | `product_restocks_trigger.sql` | `product_restocks` table + `AFTER UPDATE` trigger on `current_inventory` (`record_product_restock()`) recording a product's return to a menu — the half `product_drops` structurally cannot see (see below) |
| `20260725191832` | `product_restocks_revoke_public_execute.sql` | revoke `EXECUTE` on `record_product_restock()` from `public`/`anon`/`authenticated`, matching `record_product_drop` and clearing linter `0028` |

Earlier migrations (`create_pending_posts`, `create_system_config`,
`product_drops_trigger`, `address_security_and_perf_advisories`) exist only in the
remote history and are **not** mirrored here.

## Why

Brand duplicates came from variant spellings of `products.brand_name` (the string the
app filters/groups/links on). The external WeedShelf sync rewrites ~40% of products
every couple of days, so a one-time `UPDATE` would be clobbered — the trigger is what
makes the fix durable. No application code changed; the app keeps reading
`brand_name`, which is now always canonical.

## Restocks vs drops

`product_drops` can only ever record a product's **first** arrival at a shop: its
trigger is `AFTER INSERT` on `current_inventory`, and rows are never deleted when
something sells out — `last_seen_at` just stops advancing. A restock is therefore
an `UPDATE`, fires nothing, and is invisible. When this was measured, 2,507 of
4,464 fresh listings (56%) had no drop row at all.

`product_restocks` fills that in. Shape and posture deliberately mirror
`product_drops` — PK `(product_id, dispensary_id)`, RLS on with an anon
`select` policy limited to the last 14 days, an index on `restocked_at desc`,
and one on `(dispensary_id, restocked_at desc)`.

Two things to know before changing it:

- **The `WHEN` clause is load-bearing.** A sync run `UPDATE`s every listing it
  confirms (~4.5k rows). The `WHEN` keeps the function body out of all of them:
  Postgres evaluates three cheap predicates per row and only calls the function
  for an actual return-to-menu.
- **The 3-day floor is deliberate.** The freshness window is 24h and the sync
  runs about daily, so one missed run already leaves a ~48h gap. Requiring 3+
  days of absence means a genuine restock rather than scraper flakiness.
  Verified: gone 26 hours → not recorded, gone 2 days → not recorded, gone 5
  days → recorded (`gap_days` 5), gone 31 days → recorded (31).

One row per listing holds its **latest** return, so a product that comes and goes
repeatedly updates in place rather than accumulating history — the table stays
bounded by the listing count, and a flapping listing can't spam the feed.

Like `product_drops`, it is forward-looking: `current_inventory` keeps no
history, so there is nothing to backfill from. The table stays empty until the
next sync produces a stale→fresh transition.

## Adding a new merge later

```sql
insert into public.brand_canonical_map (norm_key, canonical_name, brand_id)
values (public.normalize_brand('<raw variant>'), '<Canonical Name>', <brand uuid or null>);

update public.products p
set brand_name = m.canonical_name,
    brand_id   = coalesce(m.brand_id, p.brand_id)
from public.brand_canonical_map m
where public.normalize_brand(p.brand_name) = m.norm_key
  and p.brand_name is distinct from m.canonical_name;
```

Review candidates first with: `select * from public.brand_dedup_candidates;`
