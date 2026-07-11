-- Brand de-duplication, part 1: normalizer + canonical map (no products mutation yet)
create or replace function public.normalize_brand(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    btrim(regexp_replace(
      lower(translate(coalesce(t, ''), '''’,.', '')),
      '\s+', ' ', 'g')),
    '')
$$;

create table if not exists public.brand_canonical_map (
  norm_key       text primary key,
  canonical_name text not null,
  brand_id       uuid references public.brands(id)
);

alter table public.brand_canonical_map enable row level security;
drop policy if exists "brand_canonical_map read" on public.brand_canonical_map;
create policy "brand_canonical_map read" on public.brand_canonical_map for select using (true);

insert into public.brand_canonical_map (norm_key, canonical_name, brand_id)
select distinct on (public.normalize_brand(m.raw))
       public.normalize_brand(m.raw), m.canonical, b.id
from (values
  ('AFG Distribution','AFG Distribution'),
  ('Bic','Bic'), ('BIC','Bic'),
  ('CCell','CCell'), ('CCELL','CCell'),
  ('Del''s','Del''s'), ('Dels','Del''s'),
  ('Livity','Livity'),
  ('Lookah','Lookah'),
  ('Sammy G''s','Sammy G''s'), ('Sammy Gs','Sammy G''s'),
  ('Elevated Supply','Elevated Supply'), ('Elevated Supply, LLC','Elevated Supply'),
  ('WTF Canna','WTF Canna'), ('WTF Canna USA','WTF Canna'),
  ('Blitzzz''d','Blitzzz''d'), ('Blitzzz''d Cannabis','Blitzzz''d'),
  ('Ampli-Fi','Ampli-Fi'), ('Ampli-Fi Beverage Enhancer','Ampli-Fi'),
  ('Fire Brand','Firebrand'), ('Firebrand','Firebrand'),
  ('Salt Pond Pathways','Salt Pond Pathways'), ('Saltpond Pathways','Salt Pond Pathways'),
  ('Glob Mop','Glob Mops'), ('Glob Mops','Glob Mops'),
  ('Strikers','Strikers'), ('Strikerz','Strikers'),
  ('Nona''s Smoke Shop','Nona''s Smoke Shop'), ('Nonna''s Smoke Shop','Nona''s Smoke Shop'),
  ('Appalachian','Appalachian Distillery'), ('Appalachian Distillery','Appalachian Distillery'),
  ('Constellation Cannabis','Constellations'), ('Constellations','Constellations'),
  -- user-approved borderline merges:
  ('Salt Pond','Salt Pond Pathways'),
  ('Best Buds','Best Buds'), ('Best Buds Nursery','Best Buds'),
  ('Stinger','Stinger'), ('Stingers','Stinger')
) as m(raw, canonical)
left join public.brands b on b.canonical_name = m.canonical
order by public.normalize_brand(m.raw)
on conflict (norm_key) do update
  set canonical_name = excluded.canonical_name,
      brand_id       = excluded.brand_id;
