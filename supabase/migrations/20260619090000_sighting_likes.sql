-- Store community likes on sightings.
-- Additive and idempotent: safe to apply after the remote baseline schema.

create table if not exists public.sighting_likes (
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sighting_id, user_id)
);

create index if not exists sighting_likes_sighting_id_idx
  on public.sighting_likes(sighting_id);

create index if not exists sighting_likes_user_id_idx
  on public.sighting_likes(user_id);

alter table public.sighting_likes enable row level security;

-- Likes are public counts, but only authenticated users can create/remove their own like.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sighting_likes'
      and policyname = 'Sighting likes are publicly readable'
  ) then
    create policy "Sighting likes are publicly readable"
      on public.sighting_likes
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sighting_likes'
      and policyname = 'Users can like sightings'
  ) then
    create policy "Users can like sightings"
      on public.sighting_likes
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sighting_likes'
      and policyname = 'Users can remove own sighting likes'
  ) then
    create policy "Users can remove own sighting likes"
      on public.sighting_likes
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- Observations of one species, ranked by community likes. The coordinates stay
-- governed by the existing public masking view because this function reads from
-- sightings_public rather than raw private location fields.
create or replace function public.species_observations(p_taxon_id uuid)
returns table (
  id uuid,
  user_id uuid,
  taxon_id uuid,
  sci_name text,
  common_name text,
  is_masked boolean,
  status text,
  location_label text,
  observed_at timestamptz,
  created_at timestamptz,
  photo_url text,
  variety text,
  origin text,
  like_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.user_id,
    s.taxon_id,
    s.sci_name,
    s.common_name,
    s.is_masked,
    s.status,
    s.location_label,
    s.observed_at,
    s.created_at,
    s.photo_url,
    null::text as variety,
    null::text as origin,
    count(l.user_id)::bigint as like_count
  from public.sightings_public s
  left join public.sighting_likes l on l.sighting_id = s.id
  where s.taxon_id = p_taxon_id
  group by
    s.id,
    s.user_id,
    s.taxon_id,
    s.sci_name,
    s.common_name,
    s.is_masked,
    s.status,
    s.location_label,
    s.observed_at,
    s.created_at,
    s.photo_url
  order by count(l.user_id) desc, s.created_at desc;
$$;

-- Best public photo per species, used by the herbarium/species gallery.
create or replace function public.species_top_photos()
returns table (
  taxon_id uuid,
  photo_url text,
  like_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with ranked as (
    select
      s.taxon_id,
      s.photo_url,
      count(l.user_id)::bigint as like_count,
      row_number() over (
        partition by s.taxon_id
        order by count(l.user_id) desc, max(s.created_at) desc
      ) as rn
    from public.sightings_public s
    left join public.sighting_likes l on l.sighting_id = s.id
    where s.taxon_id is not null
      and s.photo_url is not null
    group by s.taxon_id, s.photo_url
  )
  select taxon_id, photo_url, like_count
  from ranked
  where rn = 1;
$$;

grant execute on function public.species_observations(uuid) to anon, authenticated;
grant execute on function public.species_top_photos() to anon, authenticated;
