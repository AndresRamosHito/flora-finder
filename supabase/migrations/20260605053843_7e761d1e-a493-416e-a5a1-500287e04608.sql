
-- Peer verification: when a comment with a suggested taxon accrues 2+ agreements,
-- promote the sighting to that taxon and mark it verified.
create or replace function public.peer_promote_sighting(p_sighting_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_top_taxon uuid;
  v_score     int;
  v_current_taxon uuid;
  v_status sighting_status;
begin
  select s.taxon_id, s.status into v_current_taxon, v_status
    from public.sightings s where s.id = p_sighting_id;

  if v_status = 'verified' or v_status = 'rejected' then
    return;
  end if;

  -- Pick the suggested taxon with the most distinct agreeing users
  -- (counting commenter as 1 + each unique comment_agreements row).
  select t_id, t_score into v_top_taxon, v_score
  from (
    select
      c.suggested_taxon_id as t_id,
      sum(1 + coalesce((select count(*) from public.comment_agreements a where a.comment_id = c.id), 0))::int as t_score
    from public.sighting_comments c
    where c.sighting_id = p_sighting_id and c.suggested_taxon_id is not null
    group by c.suggested_taxon_id
    order by t_score desc
    limit 1
  ) q;

  if v_top_taxon is not null and v_score >= 3 then
    update public.sightings
       set taxon_id = v_top_taxon,
           status   = 'verified'
     where id = p_sighting_id;
  end if;
end;
$$;

grant execute on function public.peer_promote_sighting(uuid) to authenticated, anon;

create or replace function public.trg_peer_promote_on_agree()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_sighting uuid;
begin
  select sighting_id into v_sighting
    from public.sighting_comments where id = new.comment_id;
  if v_sighting is not null then
    perform public.peer_promote_sighting(v_sighting);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agreements_peer_promote on public.comment_agreements;
create trigger trg_agreements_peer_promote
  after insert on public.comment_agreements
  for each row execute function public.trg_peer_promote_on_agree();

-- Also promote on new suggestion comment (in case existing agreements push it over).
create or replace function public.trg_peer_promote_on_comment()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.suggested_taxon_id is not null then
    perform public.peer_promote_sighting(new.sighting_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comments_peer_promote on public.sighting_comments;
create trigger trg_comments_peer_promote
  after insert on public.sighting_comments
  for each row execute function public.trg_peer_promote_on_comment();

-- Convenience RPC: load a sighting (masked view) by id, anon-safe.
create or replace function public.sighting_public_one(p_id uuid)
returns table (
  id             uuid,
  user_id        uuid,
  taxon_id       uuid,
  sci_name       text,
  common_name    text,
  is_sensitive   boolean,
  is_masked      boolean,
  status         sighting_status,
  notes          text,
  location_label text,
  observed_at    timestamptz,
  created_at     timestamptz,
  photo_url      text,
  lat            double precision,
  lng            double precision
)
language sql stable set search_path = public
as $$
  select sp.id, sp.user_id, sp.taxon_id, sp.sci_name, sp.common_name,
         sp.is_sensitive, sp.is_masked, sp.status, sp.notes, sp.location_label,
         sp.observed_at, sp.created_at, sp.photo_url, sp.lat, sp.lng
  from public.sightings_public sp
  where sp.id = p_id;
$$;

grant execute on function public.sighting_public_one(uuid) to anon, authenticated;

-- ===== Acceptance-test seed =====
-- Insert a synthetic auth.users row + profile + one sensitive and one open sighting
-- so we can verify the Prime Directive end-to-end (no exact coords for sensitive species
-- through sightings_public, sightings_in_bbox, or sighting_public_one as anon).
do $$
declare
  uid uuid := '00000000-0000-0000-0000-0000000ac01d';
  v_laelia uuid;
  v_rhync  uuid;
begin
  insert into auth.users (id, instance_id, email, aud, role,
                          created_at, updated_at, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, is_anonymous)
  values (uid, '00000000-0000-0000-0000-000000000000',
          'acceptance@orquidea.test', 'authenticated', 'authenticated',
          now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false)
  on conflict (id) do nothing;

  insert into public.profiles (id, handle, display_name, region)
  values (uid, 'acceptance_seed', 'Datos de prueba', 'Sierra de Oaxaca')
  on conflict (id) do nothing;

  select id into v_laelia from public.taxa where sci_name = 'Laelia speciosa' limit 1;
  select id into v_rhync  from public.taxa where sci_name = 'Rhynchostele cervantesii' limit 1;

  if v_laelia is not null then
    insert into public.sightings (user_id, taxon_id, lat, lng, location_precision,
                                  location_label, observed_at, notes, status)
    values (uid, v_laelia, 17.0833, -96.7166, 'exact',
            'Sierra Norte', now() - interval '2 days',
            'Seed acceptance: sensitive species — must be fuzzed for anon.', 'pending');
  end if;

  if v_rhync is not null then
    insert into public.sightings (user_id, taxon_id, lat, lng, location_precision,
                                  location_label, observed_at, notes, status)
    values (uid, v_rhync, 17.2, -96.5, 'exact',
            'Sierra Norte', now() - interval '5 days',
            'Seed acceptance: open species.', 'verified');
  end if;
end$$;
