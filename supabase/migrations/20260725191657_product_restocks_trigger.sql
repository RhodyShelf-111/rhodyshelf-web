-- Restock tracking.
--
-- /drops can only ever show a product's FIRST arrival at a shop: its trigger is
-- AFTER INSERT on current_inventory, and rows are never deleted when something
-- sells out — last_seen_at simply stops advancing. So when a dispensary puts a
-- product back on the menu, the sync UPDATEs the existing row, no INSERT fires,
-- and nothing is recorded. 2,507 of 4,464 fresh listings (56%) had no drop row
-- at all.
--
-- This adds the missing half: "back in stock", the more common event and often
-- the more useful one on a site whose promise is freshness.
--
-- Forward-looking, like product_drops was. current_inventory keeps no history
-- (there is no first_seen_at and no events table), so a restock can only be
-- observed as it happens — there is nothing to backfill from.

create table if not exists public.product_restocks (
  product_id     uuid not null,
  dispensary_id  uuid not null,
  restocked_at   timestamptz not null default now(),
  -- How long it was off the menu. Lets the UI say "back after 3 weeks" and lets
  -- a consumer ignore short blips without re-deriving them.
  gap_days       integer not null,
  -- One row per listing, holding its LATEST return. A product that comes and
  -- goes repeatedly updates in place instead of accumulating history, so the
  -- table stays bounded by the number of listings (~4.5k) rather than growing
  -- without limit — and a flapping listing can't spam the feed.
  primary key (product_id, dispensary_id)
);

comment on table public.product_restocks is
  'Most recent return-to-menu per (product, dispensary). Written by trg_record_product_restock on current_inventory; see also product_drops for first-ever arrivals.';

create index if not exists idx_restocks_restocked_at
  on public.product_restocks using btree (restocked_at desc);
create index if not exists idx_restocks_dispensary
  on public.product_restocks using btree (dispensary_id, restocked_at desc);

-- Same posture as product_drops: RLS on, anon may read only the recent window.
-- The service role bypasses RLS, so the app still applies its own window.
alter table public.product_restocks enable row level security;

drop policy if exists "anon read recent" on public.product_restocks;
create policy "anon read recent" on public.product_restocks
  for select to anon
  using (restocked_at > now() - interval '14 days');

create or replace function public.record_product_restock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  seen_at timestamptz := coalesce(new.last_seen_at, now());
begin
  insert into product_restocks (product_id, dispensary_id, restocked_at, gap_days)
  values (
    new.product_id,
    new.dispensary_id,
    seen_at,
    greatest(1, floor(extract(epoch from (seen_at - old.last_seen_at)) / 86400)::int)
  )
  on conflict (product_id, dispensary_id) do update
    set restocked_at = excluded.restocked_at,
        gap_days     = excluded.gap_days;
  return new;
end;
$function$;

-- The WHEN clause is what keeps this cheap. A sync run UPDATEs every listing it
-- confirms (~4.5k rows); without it the function body would be entered for all
-- of them. With it, Postgres evaluates three cheap predicates per row and calls
-- the function only for an actual return-to-menu — normally a handful per run.
--
-- The 3-day floor is deliberate: the freshness window is 24h and the sync runs
-- about daily, so a single missed run already leaves a ~48h gap. Requiring 3+
-- days means a genuine absence rather than scraper flakiness. Change it here
-- and in the gap_days comment together.
drop trigger if exists trg_record_product_restock on public.current_inventory;
create trigger trg_record_product_restock
after update on public.current_inventory
for each row
when (
  new.last_seen_at is distinct from old.last_seen_at
  and old.last_seen_at < now() - interval '3 days'
  and new.last_seen_at > now() - interval '24 hours'
)
execute function public.record_product_restock();

-- NOTE: the grant below was applied as a follow-up migration
-- (20260725191832_product_restocks_revoke_public_execute) after Supabase's
-- linter flagged the new function; it is repeated here so this file alone
-- reproduces the final state.
revoke all on function public.record_product_restock() from public, anon, authenticated;
