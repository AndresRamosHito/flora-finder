-- Structured botanical context for observations.
-- These fields do not expose coordinates. They capture ecological metadata useful for
-- identification, phenology, and later habitat analysis.

alter table public.sightings
  add column if not exists altitude_m integer,
  add column if not exists altitude_accuracy_m integer,
  add column if not exists habitat_type text,
  add column if not exists habitat_description text;

alter table public.sightings
  drop constraint if exists sightings_altitude_m_check;

alter table public.sightings
  add constraint sightings_altitude_m_check
  check (altitude_m is null or (altitude_m between -500 and 6000));

alter table public.sightings
  drop constraint if exists sightings_altitude_accuracy_m_check;

alter table public.sightings
  add constraint sightings_altitude_accuracy_m_check
  check (altitude_accuracy_m is null or altitude_accuracy_m in (50, 100, 250, 500, 1000));

alter table public.sightings
  drop constraint if exists sightings_habitat_type_check;

alter table public.sightings
  add constraint sightings_habitat_type_check
  check (
    habitat_type is null or habitat_type in (
      'cloud_forest',
      'pine_oak_forest',
      'oak_forest',
      'tropical_dry_forest',
      'tropical_evergreen_forest',
      'conifer_forest',
      'xeric_scrub',
      'chaparral',
      'savanna',
      'grassland',
      'riparian_forest',
      'mangrove',
      'disturbed_secondary',
      'cultivated_collection',
      'other'
    )
  );

comment on column public.sightings.altitude_m is
  'Observer-estimated altitude in meters above sea level; does not imply GPS coordinates.';
comment on column public.sightings.altitude_accuracy_m is
  'Approximate uncertainty of the altitude estimate in meters.';
comment on column public.sightings.habitat_type is
  'Structured habitat category selected during observation capture.';
comment on column public.sightings.habitat_description is
  'Free-text surrounding habitat and microhabitat description.';

create or replace function public.sighting_observation_context(p_id uuid)
returns table (
  altitude_m integer,
  altitude_accuracy_m integer,
  habitat_type text,
  habitat_description text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.altitude_m,
    s.altitude_accuracy_m,
    s.habitat_type,
    s.habitat_description
  from public.sightings s
  where s.id = p_id
    and exists (
      select 1
      from public.sightings_public sp
      where sp.id = s.id
    )
  limit 1;
$$;

grant execute on function public.sighting_observation_context(uuid) to anon, authenticated;
