-- Brand de-duplication, part 2: backfill existing rows + durable trigger

-- Backfill: rewrite variant brand_name to canonical and set brand_id where known
update public.products p
set brand_name = m.canonical_name,
    brand_id   = coalesce(m.brand_id, p.brand_id)
from public.brand_canonical_map m
where public.normalize_brand(p.brand_name) = m.norm_key
  and (p.brand_name is distinct from m.canonical_name
       or (m.brand_id is not null and p.brand_id is distinct from m.brand_id));

-- Universal safety net: trim stray leading/trailing whitespace on all other brands
update public.products
set brand_name = btrim(brand_name)
where brand_name is not null and brand_name <> btrim(brand_name);

-- Durable enforcement: canonicalize on every future insert/update from the sync
create or replace function public.apply_brand_canonical()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  hit record;
begin
  if new.brand_name is null then
    return new;
  end if;
  select canonical_name, brand_id into hit
  from public.brand_canonical_map
  where norm_key = public.normalize_brand(new.brand_name);
  if found then
    new.brand_name := hit.canonical_name;
    if hit.brand_id is not null then
      new.brand_id := hit.brand_id;
    end if;
  else
    new.brand_name := btrim(new.brand_name);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_brand_canonical on public.products;
create trigger trg_products_brand_canonical
before insert or update on public.products
for each row
execute function public.apply_brand_canonical();
