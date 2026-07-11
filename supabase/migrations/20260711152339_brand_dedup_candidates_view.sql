-- Re-scan tool: surface possible future duplicate brand_name spellings by trigram similarity.
create extension if not exists pg_trgm with schema extensions;

create or replace view public.brand_dedup_candidates
with (security_invoker = true) as
with names as (
  select distinct brand_name from public.products where brand_name is not null
)
select a.brand_name as name_a,
       b.brand_name as name_b,
       round(extensions.similarity(a.brand_name, b.brand_name)::numeric, 3) as similarity
from names a
join names b on a.brand_name < b.brand_name
where extensions.similarity(a.brand_name, b.brand_name) >= 0.4
order by similarity desc, name_a;

comment on view public.brand_dedup_candidates is
  'Review queue for possible duplicate brand_name spellings (trigram similarity >= 0.4). Known-distinct pairs (e.g. Fire Ganja / Firebrand) will appear and can be ignored. To merge a pair: insert into brand_canonical_map + backfill products (see the brand-canonicalization migrations).';
