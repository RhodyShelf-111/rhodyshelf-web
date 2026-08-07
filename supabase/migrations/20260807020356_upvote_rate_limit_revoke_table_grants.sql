-- Supabase grants ALL on new public tables to anon/authenticated by default, so
-- `create table` in the prior migration silently left anon with SELECT/INSERT on
-- upvote_rate_limit. RLS with zero policies already returns anon nothing, but the
-- grant should match the intent stated in the table comment — and an unrevoked
-- grant is one future `create policy` away from being live.
--
-- Verified after applying: has_table_privilege('anon', 'public.upvote_rate_limit',
-- 'SELECT') is now false.
revoke all on table public.upvote_rate_limit from anon, authenticated;

-- Remove the row left behind by the post-migration self test of
-- check_upvote_rate_limit().
delete from public.upvote_rate_limit where ip_hash = '__selftest__';
