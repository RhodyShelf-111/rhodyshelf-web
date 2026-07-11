-- Product-name hygiene: strip the trailing " -" left on ~578 product names (and
-- one strain_name) when an upstream suffix (weight, pack size, etc.) was dropped
-- during the WeedShelf ingest. Only the *trailing* dash run is removed, so
-- internal dashes survive:
--   "Blue Dream -"                         -> "Blue Dream"
--   "Black Velvet - 0.5g Cured Resin Cart -" -> "Black Velvet - 0.5g Cured Resin Cart"
--
-- Like the brand-canonical work, the durable piece is the BEFORE INSERT/UPDATE
-- trigger: WeedShelf rewrites a large share of products every few days, so a
-- one-time UPDATE alone would be clobbered on the next sync. No application code
-- changes -- the app keeps reading products.name, which is now always clean.

-- 1. Normalizer: remove a trailing run of dashes plus any surrounding whitespace.
create or replace function public.normalize_product_name(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(coalesce(t, ''), '(\s*-+\s*)+$', ''))
$$;

-- 2. Trigger fn: clean name + strain_name on every write. Never blank the NOT NULL
--    name (keep the original if normalization would empty it, e.g. an all-dash
--    string); collapse an emptied strain_name to null.
create or replace function public.apply_product_name_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cleaned_name text;
begin
  cleaned_name := public.normalize_product_name(new.name);
  if cleaned_name <> '' then
    new.name := cleaned_name;
  end if;

  if new.strain_name is not null then
    new.strain_name := nullif(public.normalize_product_name(new.strain_name), '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_normalize_name on public.products;
create trigger trg_products_normalize_name
before insert or update on public.products
for each row execute function public.apply_product_name_normalize();

-- 3. One-time backfill of existing rows. The trigger above keeps them clean from
--    here on; it also re-fires on this UPDATE, so the writes are doubly guarded.
update public.products
set name        = public.normalize_product_name(name),
    strain_name = nullif(public.normalize_product_name(strain_name), '')
where name ~ '-\s*$'
   or strain_name ~ '-\s*$';
