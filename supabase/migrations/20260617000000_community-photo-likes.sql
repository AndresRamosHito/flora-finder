-- Community photo likes.
--
-- Lets people upvote ("like") a sighting so the best community-evaluated photo
-- becomes the species' herbarium picture, and powers a "see observations of this
-- species" gallery sorted by community appreciation. Idempotent.

create table if not exists public.sighting_likes (
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (sighting_id, user_id)
);
create index if not exists sighting_likes_sighting_idx on public.sighting_likes (sighting_id);

alter table public.sighting_likes enable row level security;

-- Like counts are public (anon needs them to pick a species' herbarium image);
-- a person can only add or remove their own like.
drop policy if exists likes_read on public.sighting_likes;
create policy likes_read on public.sighting_likes for select using (true);
drop policy if exists likes_insert on public.sighting_likes;
create policy likes_insert on public.sighting_likes for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists likes_delete on public.sighting_likes;
create policy likes_delete on public.sighting_likes for delete to authenticated
  using (user_id = auth.uid());

grant select on public.sighting_likes to anon, authenticated;
grant insert, delete on public.sighting_likes to authenticated;

-- Rate limit likes, consistent with the app's other write paths.
create or replace function public.trg_rl_likes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enforce_rate_limit('public.sighting_likes', new.user_id, interval '1 minute', 120);
  return new;
end; $$;
drop trigger if exists trg_rl_likes on public.sighting_likes;
create trigger trg_rl_likes before insert on public.sighting_likes
  for each row execute function public.trg_rl_likes();

-- Observations of one species, masked (via sightings_public) and ranked by
-- community likes, then verification status, then recency. Anon-safe: it reads
-- the security-invoker public view, so the location guardrail still applies.
create or replace function public.species_observations(p_taxon_id uuid)
returns table (
  id             uuid,
  user_id        uuid,
  taxon_id       uuid,
  sci_name       text,
  common_name    text,
  is_masked      boolean,
  status         sighting_status,
  location_label text,
  observed_at    timestamptz,
  created_at     timestamptz,
  photo_url      text,
  variety        text,
  origin         sighting_origin,
  like_count     integer
)
language sql stable set search_path = public
as $$
  select
    sp.id, sp.user_id, sp.taxon_id, sp.sci_name, sp.common_name,
    sp.is_masked, sp.status, sp.location_label, sp.observed_at,
    sp.created_at, sp.photo_url, sp.variety, sp.origin,
    coalesce((select count(*) from public.sighting_likes l where l.sighting_id = sp.id), 0)::int
  from public.sightings_public sp
  where sp.taxon_id = p_taxon_id
  order by
    coalesce((select count(*) from public.sighting_likes l where l.sighting_id = sp.id), 0) desc,
    (sp.status = 'verified') desc,
    coalesce(sp.observed_at, sp.created_at) desc;
$$;
grant execute on function public.species_observations(uuid) to anon, authenticated;

-- One best photo per species for the herbarium grid + species headline image:
-- the most-liked non-rejected observation that has a photo.
create or replace function public.species_top_photos()
returns table (taxon_id uuid, photo_url text, like_count integer)
language sql stable set search_path = public
as $$
  select distinct on (sp.taxon_id)
    sp.taxon_id, sp.photo_url,
    coalesce((select count(*) from public.sighting_likes l where l.sighting_id = sp.id), 0)::int
  from public.sightings_public sp
  where sp.taxon_id is not null
    and sp.photo_url is not null
    and sp.status <> 'rejected'
  order by
    sp.taxon_id,
    coalesce((select count(*) from public.sighting_likes l where l.sighting_id = sp.id), 0) desc,
    (sp.status = 'verified') desc,
    coalesce(sp.observed_at, sp.created_at) desc;
$$;
grant execute on function public.species_top_photos() to anon, authenticated;
