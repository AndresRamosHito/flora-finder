-- Location privacy model:
-- - fuzzed + public_radius_km = public approximate area, not a point
-- - hidden = no public map coordinate and no public location label
-- Existing exact/fuzzed/hidden enum remains unchanged for compatibility.

alter table public.sightings
  add column if not exists public_radius_km integer not null default 20;

alter table public.sightings
  drop constraint if exists sightings_public_radius_km_check;

alter table public.sightings
  add constraint sightings_public_radius_km_check
  check (public_radius_km in (20, 100));

-- Default all existing sightings to the safer 20 km approximate public area.
update public.sightings
set public_radius_km = 20,
    location_precision = 'fuzzed'
where location_precision = 'exact';

-- Rebuild the public masking view so hidden records never expose their label or point,
-- and fuzzed records expose a rounded public point plus an explicit radius.
drop view if exists public.sightings_public cascade;

create view public.sightings_public as
with publicized as (
  select
    s.id,
    s.user_id,
    s.taxon_id,
    t.sci_name,
    t.common_name,
    coalesce(t.is_sensitive, false) as is_sensitive,
    s.status,
    s.notes,
    s.observed_at,
    s.created_at,
    s.photo_url,
    s.variety,
    s.origin,
    s.location_precision,
    case
      when s.location_precision = 'hidden' then null
      else s.location_label
    end as location_label,
    case
      when s.location_precision = 'hidden' then null
      when coalesce(t.is_sensitive, false) then greatest(s.public_radius_km, 100)
      else s.public_radius_km
    end as public_radius_km,
    case
      when s.location_precision = 'hidden' or s.geom is null then null
      else public.fuzz_point(
        s.geom,
        (case when coalesce(t.is_sensitive, false) then greatest(s.public_radius_km, 100) else s.public_radius_km end)::double precision / 111.0
      )
    end as geom_public
  from public.sightings s
  left join public.taxa t on t.id = s.taxon_id
)
select
  id,
  user_id,
  taxon_id,
  sci_name,
  common_name,
  is_sensitive,
  (location_precision <> 'exact' or is_sensitive) as is_masked,
  status,
  notes,
  location_label,
  observed_at,
  created_at,
  photo_url,
  variety,
  origin,
  location_precision,
  public_radius_km,
  geom_public,
  case when geom_public is null then null else public.st_y(geom_public) end as lat,
  case when geom_public is null then null else public.st_x(geom_public) end as lng
from publicized;

grant select on public.sightings_public to anon, authenticated;

-- Keep the existing RPC names, but make them return the new privacy fields.
drop function if exists public.sighting_public_one(uuid);
create function public.sighting_public_one(p_id uuid)
returns table (
  id uuid,
  user_id uuid,
  taxon_id uuid,
  sci_name text,
  common_name text,
  is_sensitive boolean,
  is_masked boolean,
  status public.sighting_status,
  notes text,
  location_label text,
  observed_at timestamptz,
  created_at timestamptz,
  photo_url text,
  lat double precision,
  lng double precision,
  location_precision public.location_precision,
  public_radius_km integer
)
language sql
stable
security invoker
as $$
  select
    sp.id,
    sp.user_id,
    sp.taxon_id,
    sp.sci_name,
    sp.common_name,
    sp.is_sensitive,
    sp.is_masked,
    sp.status,
    sp.notes,
    sp.location_label,
    sp.observed_at,
    sp.created_at,
    sp.photo_url,
    sp.lat,
    sp.lng,
    sp.location_precision,
    sp.public_radius_km
  from public.sightings_public sp
  where sp.id = p_id
  limit 1;
$$;

grant execute on function public.sighting_public_one(uuid) to anon, authenticated;

drop function if exists public.sightings_in_bbox(double precision, double precision, double precision, double precision);
create function public.sightings_in_bbox(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  sci_name text,
  common_name text,
  is_sensitive boolean,
  is_masked boolean,
  status public.sighting_status,
  location_label text,
  location_precision public.location_precision,
  public_radius_km integer
)
language sql
stable
security invoker
as $$
  select
    sp.id,
    sp.lat,
    sp.lng,
    sp.sci_name,
    sp.common_name,
    sp.is_sensitive,
    sp.is_masked,
    sp.status,
    sp.location_label,
    sp.location_precision,
    sp.public_radius_km
  from public.sightings_public sp
  where sp.lat is not null
    and sp.lng is not null
    and sp.lat between min_lat and max_lat
    and sp.lng between min_lng and max_lng;
$$;

grant execute on function public.sightings_in_bbox(double precision, double precision, double precision, double precision) to anon, authenticated;
