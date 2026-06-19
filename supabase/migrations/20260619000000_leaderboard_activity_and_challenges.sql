-- Patch the leaderboard so it reflects real community activity and challenges.
--
-- The previous version only counted *verified* sightings and filtered to users
-- with at least one verified record. In a young community almost nothing is
-- verified yet, so the board came back empty. This version ranks by overall
-- contribution — every non-rejected observation counts — and folds in completed
-- challenges (hunts), which the board never reflected before.
--
-- A user "completes" a hunt when they have observed every target taxon of that
-- hunt (within the hunt's time window when one is set). Scoring:
--   species*50 + verified*25 + sightings*10 + challenges*100

drop function if exists public.leaderboard(text, timestamptz, int);

create function public.leaderboard(
  p_region text        default null,
  p_since  timestamptz default null,
  p_limit  int         default 50
)
returns table (
  user_id      uuid,
  handle       text,
  display_name text,
  species      int,
  verified     int,
  sightings    int,
  challenges   int,
  points       int,
  "position"   bigint
)
language sql stable security definer set search_path = public
as $$
  with base as (
    select
      s.user_id,
      count(distinct s.taxon_id) filter (where s.status <> 'rejected') as species,
      count(*)                   filter (where s.status <> 'rejected') as sightings,
      count(*)                   filter (where s.status =  'verified') as verified
    from public.sightings s
    where s.user_id is not null
      and (p_since is null or coalesce(s.observed_at, s.created_at) >= p_since)
    group by s.user_id
  ),
  hunt_target_counts as (
    select hunt_id, count(*) as target_count
    from public.hunt_targets
    group by hunt_id
  ),
  user_hunt_found as (
    select
      s.user_id,
      ht.hunt_id,
      count(distinct ht.taxon_id) as found
    from public.sightings s
    join public.hunt_targets ht on ht.taxon_id = s.taxon_id
    join public.hunts h on h.id = ht.hunt_id
    where s.user_id is not null
      and s.status <> 'rejected'
      and (h.starts_at is null or coalesce(s.observed_at, s.created_at) >= h.starts_at)
      and (h.ends_at   is null or coalesce(s.observed_at, s.created_at) <= h.ends_at)
    group by s.user_id, ht.hunt_id
  ),
  user_challenges as (
    select f.user_id, count(*)::int as challenges
    from user_hunt_found f
    join hunt_target_counts c on c.hunt_id = f.hunt_id
    where c.target_count > 0 and f.found >= c.target_count
    group by f.user_id
  ),
  scored as (
    select
      b.user_id, p.handle, p.display_name,
      b.species::int   as species,
      b.verified::int  as verified,
      b.sightings::int as sightings,
      coalesce(uc.challenges, 0) as challenges,
      (b.species * 50 + b.verified * 25 + b.sightings * 10
        + coalesce(uc.challenges, 0) * 100)::int as points
    from base b
    join public.profiles p on p.id = b.user_id
    left join user_challenges uc on uc.user_id = b.user_id
    where (p_region is null or p.region = p_region)
      and b.sightings > 0
  )
  select
    user_id, handle, display_name, species, verified, sightings, challenges, points,
    rank() over (order by points desc, species desc, verified desc) as "position"
  from scored
  order by "position"
  limit p_limit;
$$;

grant execute on function public.leaderboard(text, timestamptz, int) to anon, authenticated;
