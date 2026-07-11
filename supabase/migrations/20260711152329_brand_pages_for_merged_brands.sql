-- Create brands rows for the 11 merged canonicals that lacked one (gives them /brand/[slug] pages),
-- link the canonical map, and backfill products.brand_id.
insert into public.brands (id, canonical_name, slug, category)
select gen_random_uuid(), v.canonical_name, v.slug, v.category
from (values
  ('AFG Distribution','afg-distribution','accessories'),
  ('Ampli-Fi','ampli-fi','edibles'),
  ('Bic','bic','accessories'),
  ('Blitzzz''d','blitzzzd','cultivator'),
  ('CCell','ccell','accessories'),
  ('Del''s','dels','edibles'),
  ('Glob Mops','glob-mops','accessories'),
  ('Nona''s Smoke Shop','nonas-smoke-shop','accessories'),
  ('Salt Pond Pathways','salt-pond-pathways','cultivator'),
  ('Stinger','stinger','cultivator'),
  ('WTF Canna','wtf-canna','cultivator')
) as v(canonical_name, slug, category)
where not exists (
  select 1 from public.brands b where b.slug = v.slug or b.canonical_name = v.canonical_name
);

-- Point the canonical map at the newly created brand rows
update public.brand_canonical_map m
set brand_id = b.id
from public.brands b
where b.canonical_name = m.canonical_name and m.brand_id is null;

-- Backfill products.brand_id for these brands
update public.products p
set brand_id = b.id
from public.brands b
where p.brand_name = b.canonical_name
  and p.brand_id is distinct from b.id
  and b.slug in ('afg-distribution','ampli-fi','bic','blitzzzd','ccell','dels',
                 'glob-mops','nonas-smoke-shop','salt-pond-pathways','stinger','wtf-canna');
