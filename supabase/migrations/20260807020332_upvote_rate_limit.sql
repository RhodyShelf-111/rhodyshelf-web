-- Rate limiting for POST /api/upvote.
--
-- Why a table and not an in-memory counter: the route is `runtime = "nodejs"`
-- + `force-dynamic` on Vercel. Module scope survives only within one instance,
-- resets on cold start, and instances scale out horizontally — so an in-memory
-- Map limits per instance, not per caller, and leaks unboundedly in a
-- long-lived instance.
--
-- Why a dedicated table and not counting product_upvotes rows: `remove`
-- DELETEs the row, and `add` upserts with ignoreDuplicates so a repeat add
-- never advances created_at. An add/remove flood leaves zero rows behind, so a
-- row-count window would read 0 forever. This counts *attempts*.

create table if not exists public.upvote_rate_limit (
  ip_hash      text primary key,
  window_start timestamptz not null default now(),
  n            integer     not null default 0
);

comment on table public.upvote_rate_limit is
  'Attempt counter per salted IP hash for POST /api/upvote. Written only by check_upvote_rate_limit() via the service role. No RLS policies = deny-all for anon.';

-- Enable RLS with zero policies: same posture as product_upvotes. The service
-- role bypasses RLS; anon and authenticated get nothing.
alter table public.upvote_rate_limit enable row level security;

-- Supports a future cleanup of stale rows. The table holds one row per distinct
-- IP hash, so growth is slow at this site's volume; the index means a periodic
-- `delete from upvote_rate_limit where window_start < now() - interval '1 day'`
-- stays an index scan if it is ever needed.
create index if not exists idx_upvote_rate_limit_window
  on public.upvote_rate_limit (window_start);

-- One atomic statement: insert-or-increment, rolling the window when it has
-- expired, returning the post-update count. Concurrent callers serialize on the
-- primary key, so two simultaneous requests from one ip_hash cannot both read a
-- stale count and both pass.
create or replace function public.check_upvote_rate_limit(
  p_ip_hash text,
  p_limit   integer  default 30,
  p_window  interval default interval '1 hour'
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  insert into public.upvote_rate_limit as r (ip_hash, window_start, n)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set n = case
              when r.window_start < now() - p_window then 1
              else r.n + 1
            end,
        window_start = case
              when r.window_start < now() - p_window then now()
              else r.window_start
            end
  returning r.n into v_n;

  return v_n <= p_limit;
end;
$$;

comment on function public.check_upvote_rate_limit(text, integer, interval) is
  'Records one upvote attempt for an IP hash and returns false once the window cap is exceeded. Counts attempts, not stored votes, so add/remove floods and duplicate adds both count.';

-- SECURITY DEFINER, so it has no business being reachable as a PostgREST RPC by
-- anon. Matches record_product_restock()'s grants and clears linter 0028.
revoke all on function public.check_upvote_rate_limit(text, integer, interval)
  from public, anon, authenticated;
