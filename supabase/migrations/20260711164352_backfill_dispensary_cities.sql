-- Local-SEO + UI: populate dispensaries.city (was null for 8/9). Cities are
-- taken from the dispensary names; Slater Center = Providence (its known RI
-- location). Guarded on city IS NULL so existing values are never overwritten.
update public.dispensaries d
set city = v.city
from (values
  ('aura-of-rhode-island-central-falls', 'Central Falls'),
  ('greenwave-foster', 'Foster'),
  ('mother-earth-pawtucket', 'Pawtucket'),
  ('newport-cannabis-co', 'Newport'),
  ('rise-dispensaries-warwick', 'Warwick'),
  ('solar-cannabis-co-warwick', 'Warwick'),
  ('sweetspot-exeter', 'Exeter'),
  ('slater-center-rec', 'Providence')
) as v(slug, city)
where d.slug = v.slug and d.city is null;
