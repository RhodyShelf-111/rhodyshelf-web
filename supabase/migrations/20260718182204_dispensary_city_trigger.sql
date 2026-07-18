-- Local SEO: dispensaries.city is wiped on every WeedShelf re-sync (the sync
-- upserts dispensary rows from a source that carries no city), so the one-shot
-- backfill in 20260711164352_backfill_dispensary_cities kept reverting to null
-- within days. Mirror the products brand-canonical pattern: a small curated
-- mapping table plus a BEFORE INSERT/UPDATE trigger that re-applies the city
-- whenever an incoming row has none, so the value survives re-syncs.

create table if not exists public.dispensary_city_map (
  slug text primary key,
  city text not null
);

comment on table public.dispensary_city_map is
  'Curated slug -> city for RI dispensaries. Re-applied by trg_dispensaries_city so cities survive WeedShelf re-syncs (the source sends no city). Add a row here to fix or add a city.';

alter table public.dispensary_city_map enable row level security;
-- No policies = deny-all for anon (same posture as system_config). Only the
-- service role writes dispensaries, and the app reads dispensaries.city, never
-- this table directly.

insert into public.dispensary_city_map (slug, city) values
  ('aura-of-rhode-island-central-falls', 'Central Falls'),
  ('greenwave-foster', 'Foster'),
  ('mother-earth-pawtucket', 'Pawtucket'),
  ('newport-cannabis-co', 'Newport'),
  ('reef-wellness', 'Woonsocket'),
  ('rise-dispensaries-warwick', 'Warwick'),
  ('slater-center-rec', 'Providence'),
  ('solar-cannabis-co-warwick', 'Warwick'),
  ('sweetspot-exeter', 'Exeter')
on conflict (slug) do update set city = excluded.city;

create or replace function public.apply_dispensary_city()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  mapped text;
begin
  -- Only fill a MISSING city: if the source ever starts sending a real one,
  -- trust it instead of overwriting with the curated value.
  if nullif(btrim(coalesce(new.city, '')), '') is not null then
    return new;
  end if;

  select city into mapped
  from public.dispensary_city_map
  where slug = new.slug;

  if mapped is not null then
    new.city := mapped;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dispensaries_city on public.dispensaries;
create trigger trg_dispensaries_city
  before insert or update on public.dispensaries
  for each row execute function public.apply_dispensary_city();

-- Apply to the rows that are currently null.
update public.dispensaries d
set city = m.city
from public.dispensary_city_map m
where d.slug = m.slug
  and nullif(btrim(coalesce(d.city, '')), '') is null;
