-- =====================================================================
--  OrquIDea (por OrchidArc) — combined 0001 + 0002 + 0003
-- =====================================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

create type sighting_status    as enum ('needs_id','pending','verified','rejected');
create type location_precision as enum ('exact','fuzzed','hidden');
create type member_role        as enum ('spotter','verifier','admin');
create type report_kind        as enum ('online_sale','market_sale','field_extraction','other');
create type report_status      as enum ('new','triaged','escalated','closed');

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text unique,
  display_name text,
  region       text,
  role         member_role not null default 'spotter',
  points       int         not null default 0,
  created_at   timestamptz not null default now()
);

create table public.taxa (
  id                  uuid primary key default gen_random_uuid(),
  sci_name            text not null,
  common_name         text,
  genus               text,
  family              text default 'Orchidaceae',
  tribe               text,
  synonyms            text[],
  conservation_status text,
  is_sensitive        boolean not null default false,
  description         text,
  culture             jsonb,
  herbarium_ref       text,
  ref_image_url       text,
  region              text,
  created_at          timestamptz not null default now()
);
create index taxa_genus_idx on public.taxa (genus);

create or replace function public.is_verifier_or_admin(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('verifier','admin')
  );
$$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

create table public.sightings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  taxon_id           uuid references public.taxa(id),
  photo_url          text,
  observed_at        timestamptz,
  lat                double precision,
  lng                double precision,
  geom               geometry(Point,4326),
  location_precision location_precision not null default 'fuzzed',
  location_label     text,
  notes              text,
  status             sighting_status not null default 'pending',
  created_at         timestamptz not null default now()
);
create index sightings_geom_gix    on public.sightings using gist (geom);
create index sightings_user_idx    on public.sightings (user_id);
create index sightings_taxon_idx   on public.sightings (taxon_id);
create index sightings_created_idx on public.sightings (created_at desc);

create or replace function public.sightings_set_geo()
returns trigger
language plpgsql set search_path = public
as $$
declare
  v_sensitive boolean;
begin
  if new.lat is not null and new.lng is not null then
    new.geom := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326);
  end if;
  if new.taxon_id is null then
    if new.location_precision = 'exact' then
      new.location_precision := 'fuzzed';
    end if;
  else
    select t.is_sensitive into v_sensitive from public.taxa t where t.id = new.taxon_id;
    if coalesce(v_sensitive, false) and new.location_precision = 'exact' then
      new.location_precision := 'fuzzed';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_sightings_set_geo
  before insert or update on public.sightings
  for each row execute function public.sightings_set_geo();

create table public.sighting_comments (
  id                 uuid primary key default gen_random_uuid(),
  sighting_id        uuid not null references public.sightings(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  body               text,
  suggested_taxon_id uuid references public.taxa(id),
  created_at         timestamptz not null default now()
);
create index sighting_comments_sighting_idx on public.sighting_comments (sighting_id, created_at);

create table public.comment_agreements (
  comment_id uuid references public.sighting_comments(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table public.verifications (
  id                 uuid primary key default gen_random_uuid(),
  sighting_id        uuid not null references public.sightings(id) on delete cascade,
  verifier_id        uuid not null references public.profiles(id),
  decision           text,
  suggested_taxon_id uuid references public.taxa(id),
  created_at         timestamptz not null default now()
);
create index verifications_sighting_idx on public.verifications (sighting_id);

create table public.hunts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  blurb           text,
  region          text,
  starts_at       timestamptz,
  ends_at         timestamptz,
  reward_badge_id uuid
);
create table public.hunt_targets (
  hunt_id  uuid references public.hunts(id) on delete cascade,
  taxon_id uuid references public.taxa(id) on delete cascade,
  primary key (hunt_id, taxon_id)
);

create table public.societies (
  id           text primary key,
  name         text not null,
  full_name    text,
  color        text,
  is_official  boolean not null default false,
  facebook_url text
);
create table public.society_members (
  society_id text references public.societies(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (society_id, user_id)
);
create table public.society_messages (
  id         uuid primary key default gen_random_uuid(),
  society_id text references public.societies(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  body       text,
  created_at timestamptz not null default now()
);
create index society_messages_idx on public.society_messages (society_id, created_at);

create table public.trade_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid references public.profiles(id),
  taxon_id      uuid references public.taxa(id),
  kind          report_kind,
  location_text text,
  details       text,
  anonymous     boolean not null default true,
  status        report_status not null default 'new',
  created_at    timestamptz not null default now()
);

create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  description text,
  icon        text,
  rule        jsonb
);
create table public.user_badges (
  user_id   uuid references public.profiles(id) on delete cascade,
  badge_id  uuid references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create or replace function public.fuzz_point(g geometry, grid_deg double precision default 0.1)
returns geometry
language sql immutable
as $$
  select case
    when g is null then null
    else ST_SetSRID(ST_SnapToGrid(g, grid_deg), 4326)
  end;
$$;

create or replace view public.sightings_public as
select
  q.*,
  ST_Y(q.geom_public) as lat,
  ST_X(q.geom_public) as lng
from (
  select
    s.id,
    s.user_id,
    s.taxon_id,
    s.photo_url,
    s.observed_at,
    s.status,
    s.notes,
    s.location_label,
    s.created_at,
    t.is_sensitive,
    t.sci_name,
    t.common_name,
    case
      when s.user_id = auth.uid() or public.is_verifier_or_admin()
        then s.geom
      when s.taxon_id is null
        then public.fuzz_point(s.geom)
      when coalesce(t.is_sensitive, false) then
        case when s.location_precision = 'hidden'
             then null
             else public.fuzz_point(s.geom) end
      else
        case when s.location_precision = 'exact'
             then s.geom
             else public.fuzz_point(s.geom) end
    end as geom_public,
    case
      when s.user_id = auth.uid() or public.is_verifier_or_admin() then false
      when s.taxon_id is null then true
      when coalesce(t.is_sensitive, false) and s.location_precision <> 'exact' then true
      when s.location_precision <> 'exact' then true
      else false
    end as is_masked
  from public.sightings s
  left join public.taxa t on t.id = s.taxon_id
) q;

alter table public.profiles           enable row level security;
alter table public.taxa               enable row level security;
alter table public.sightings          enable row level security;
alter table public.sighting_comments  enable row level security;
alter table public.comment_agreements enable row level security;
alter table public.verifications      enable row level security;
alter table public.hunts              enable row level security;
alter table public.hunt_targets       enable row level security;
alter table public.societies          enable row level security;
alter table public.society_members    enable row level security;
alter table public.society_messages   enable row level security;
alter table public.trade_reports      enable row level security;
alter table public.badges             enable row level security;
alter table public.user_badges        enable row level security;

create policy profiles_read   on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy taxa_read  on public.taxa for select using (true);
create policy taxa_write on public.taxa for all using (public.is_admin()) with check (public.is_admin());

create policy sightings_select on public.sightings for select
  using (user_id = auth.uid() or public.is_verifier_or_admin());
create policy sightings_insert on public.sightings for insert
  with check (user_id = auth.uid());
create policy sightings_update on public.sightings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy comments_read   on public.sighting_comments for select using (true);
create policy comments_insert on public.sighting_comments for insert with check (user_id = auth.uid());
create policy comments_update on public.sighting_comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_delete on public.sighting_comments for delete using (user_id = auth.uid());

create policy agree_read   on public.comment_agreements for select using (true);
create policy agree_insert on public.comment_agreements for insert with check (user_id = auth.uid());
create policy agree_delete on public.comment_agreements for delete using (user_id = auth.uid());

create policy verif_read   on public.verifications for select using (true);
create policy verif_insert on public.verifications for insert
  with check (public.is_verifier_or_admin() and verifier_id = auth.uid());

create policy hunts_read    on public.hunts for select using (true);
create policy hunts_write   on public.hunts for all using (public.is_admin()) with check (public.is_admin());
create policy targets_read  on public.hunt_targets for select using (true);
create policy targets_write on public.hunt_targets for all using (public.is_admin()) with check (public.is_admin());

create policy soc_read  on public.societies for select using (true);
create policy soc_write on public.societies for all using (public.is_admin()) with check (public.is_admin());

create policy mem_read   on public.society_members for select using (true);
create policy mem_insert on public.society_members for insert with check (user_id = auth.uid());
create policy mem_delete on public.society_members for delete using (user_id = auth.uid());

create policy msg_read on public.society_messages for select
  using (exists (select 1 from public.society_members m
                 where m.society_id = society_messages.society_id and m.user_id = auth.uid()));
create policy msg_insert on public.society_messages for insert
  with check (user_id = auth.uid()
              and exists (select 1 from public.society_members m
                          where m.society_id = society_messages.society_id and m.user_id = auth.uid()));

create policy reports_admin_read on public.trade_reports for select using (public.is_admin());

create policy badges_read  on public.badges for select using (true);
create policy badges_write on public.badges for all using (public.is_admin()) with check (public.is_admin());

create policy ub_read on public.user_badges for select using (true);

grant usage on schema public to anon, authenticated;

grant select on
  public.taxa, public.hunts, public.hunt_targets, public.societies,
  public.badges, public.sighting_comments, public.comment_agreements,
  public.verifications, public.society_members, public.user_badges,
  public.profiles
to anon, authenticated;

grant select on public.sightings_public to anon, authenticated;

grant select, insert, update on public.sightings to authenticated;
grant insert, update, delete on public.sighting_comments to authenticated;
grant insert, delete on public.comment_agreements to authenticated;
grant insert on public.verifications to authenticated;
grant insert, delete on public.society_members to authenticated;
grant select, insert on public.society_messages to authenticated;

grant insert on public.profiles to authenticated;
grant update (handle, display_name, region) on public.profiles to authenticated;

grant select on public.trade_reports to authenticated;

insert into public.societies (id, name, full_name, color, is_official, facebook_url) values
  ('amo',  'AMO',                  'Asociación Mexicana de Orquideología', '#1E4034', true,  'https://www.facebook.com/groups/orquideasmexico'),
  ('soax', 'Orquídeas de Oaxaca',  'Colectivo regional de la Sierra',      '#BE3A78', false, 'https://www.facebook.com/groups/'),
  ('sver', 'Orquídeas de Veracruz','Sociedad regional',                    '#C2882B', false, 'https://www.facebook.com/groups/')
on conflict (id) do nothing;

-- ===== 0002 =====
create or replace function public.sightings_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns table (
  id             uuid,
  taxon_id       uuid,
  sci_name       text,
  common_name    text,
  is_sensitive   boolean,
  is_masked      boolean,
  status         sighting_status,
  location_label text,
  lat            double precision,
  lng            double precision,
  photo_url      text,
  observed_at    timestamptz,
  created_at     timestamptz
)
language sql stable
set search_path = public
as $$
  select
    sp.id, sp.taxon_id, sp.sci_name, sp.common_name,
    sp.is_sensitive, sp.is_masked, sp.status, sp.location_label,
    sp.lat, sp.lng, sp.photo_url, sp.observed_at, sp.created_at
  from public.sightings_public sp
  where sp.geom_public is not null
    and sp.geom_public && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326);
$$;

create or replace function public.recompute_points(uid uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_species int; v_sightings int; v_verified int; v_points int;
begin
  select count(distinct taxon_id), count(*), count(*) filter (where status = 'verified')
    into v_species, v_sightings, v_verified
    from public.sightings where user_id = uid;
  v_points := coalesce(v_species,0)*50 + coalesce(v_sightings,0)*10 + coalesce(v_verified,0)*25;
  update public.profiles set points = v_points where id = uid;
  return v_points;
end;
$$;

create or replace function public.trg_recompute_points()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_points(old.user_id);
    return old;
  end if;
  perform public.recompute_points(new.user_id);
  if (tg_op = 'UPDATE' and new.user_id is distinct from old.user_id) then
    perform public.recompute_points(old.user_id);
  end if;
  return new;
end;
$$;

create trigger trg_sightings_points
  after insert or update or delete on public.sightings
  for each row execute function public.trg_recompute_points();

create or replace function public.leaderboard(
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
  "position"   bigint
)
language sql stable security definer set search_path = public
as $$
  with base as (
    select
      s.user_id,
      count(distinct s.taxon_id) filter (where s.status = 'verified') as species,
      count(*)                   filter (where s.status = 'verified') as verified
    from public.sightings s
    where (p_since is null or coalesce(s.observed_at, s.created_at) >= p_since)
    group by s.user_id
  )
  select
    b.user_id, p.handle, p.display_name,
    b.species::int, b.verified::int,
    rank() over (order by b.species desc, b.verified desc) as "position"
  from base b
  join public.profiles p on p.id = b.user_id
  where (b.species > 0 or b.verified > 0)
    and (p_region is null or p.region = p_region)
  order by "position"
  limit p_limit;
$$;

create or replace function public.top_suggested_id(p_sighting_id uuid)
returns table (taxon_id uuid, sci_name text, common_name text, score numeric)
language sql stable set search_path = public
as $$
  select
    c.suggested_taxon_id as taxon_id,
    t.sci_name, t.common_name,
    sum(1 + (
      select count(*) from public.comment_agreements a where a.comment_id = c.id
    ))::numeric as score
  from public.sighting_comments c
  join public.taxa t on t.id = c.suggested_taxon_id
  where c.sighting_id = p_sighting_id
    and c.suggested_taxon_id is not null
  group by c.suggested_taxon_id, t.sci_name, t.common_name
  order by score desc
  limit 1;
$$;

create or replace function public.verify_sighting(
  p_sighting_id uuid,
  p_decision    text,
  p_taxon_id    uuid default null
)
returns public.sightings
language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_row  public.sightings;
  v_stat sighting_status;
begin
  if not public.is_verifier_or_admin(v_uid) then
    raise exception 'not authorized: verifier or admin role required';
  end if;
  if p_decision not in ('confirm','correct','reject') then
    raise exception 'invalid decision: % (expected confirm|correct|reject)', p_decision;
  end if;
  v_stat := case p_decision when 'reject' then 'rejected'::sighting_status
                            else 'verified'::sighting_status end;
  update public.sightings s
     set status   = v_stat,
         taxon_id = case when p_decision = 'correct' and p_taxon_id is not null
                         then p_taxon_id else s.taxon_id end
   where s.id = p_sighting_id
   returning * into v_row;
  if v_row.id is null then
    raise exception 'sighting not found: %', p_sighting_id;
  end if;
  insert into public.verifications (sighting_id, verifier_id, decision, suggested_taxon_id)
  values (p_sighting_id, v_uid, p_decision, p_taxon_id);
  return v_row;
end;
$$;

revoke execute on function public.recompute_points(uuid) from public;
revoke execute on function public.trg_recompute_points() from public;

grant execute on function public.sightings_in_bbox(double precision,double precision,double precision,double precision) to anon, authenticated;
grant execute on function public.leaderboard(text,timestamptz,int) to anon, authenticated;
grant execute on function public.top_suggested_id(uuid)             to anon, authenticated;
grant execute on function public.verify_sighting(uuid,text,uuid)    to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, handle, display_name, region)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'handle', 'spotter_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Nuevo spotter'),
    coalesce(new.raw_user_meta_data->>'region', 'Sierra de Oaxaca')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('sightings', 'sightings', true)
on conflict (id) do nothing;

create policy "sighting_photos_read"
  on storage.objects for select
  using (bucket_id = 'sightings');

create policy "sighting_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'sightings'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "sighting_photos_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'sightings'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "sighting_photos_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'sightings'
         and (storage.foldername(name))[1] = auth.uid()::text);

alter publication supabase_realtime add table public.society_messages;
alter publication supabase_realtime add table public.sighting_comments;

alter table public.taxa
  add constraint taxa_sci_name_key unique (sci_name);

insert into public.taxa
  (sci_name, common_name, genus, family, tribe, synonyms,
   conservation_status, is_sensitive, description, culture, herbarium_ref, region)
values
  ('Laelia speciosa', 'Flor de Mayo', 'Laelia', 'Orchidaceae',
   'Epidendreae / Laeliinae', array['Bletia speciosa','Laelia majalis'],
   'Amenazada', true,
   'Endémica del centro de México. Grandes flores rosa-lila que aparecen en mayo sobre encinos. Bajo presión por extracción.',
   '{"luz":"Alta","temp":"Fresco a intermedio","riego":"Abundante en crecimiento; reposo seco invernal","nota":"Rupícola o epífita sobre encinos; necesita excelente ventilación."}'::jsonb,
   'laelia-speciosa', 'Sierra de Oaxaca'),
  ('Laelia gouldiana', 'Tzauhtli', 'Laelia', 'Orchidaceae',
   'Epidendreae / Laeliinae', array['Laelia autumnalis var. gouldiana'],
   'En peligro', true,
   'Casi extinta en estado silvestre. Florece en otoño con tonos magenta intensos; sobrevive sobre todo en cultivo tradicional.',
   '{"luz":"Alta","temp":"Fresco","riego":"Reposo invernal marcado","nota":"Floración otoñal; muy ligada al cultivo tradicional en pueblos."}'::jsonb,
   'laelia-gouldiana', 'Sierra de Oaxaca'),
  ('Barkeria whartoniana', 'Barkeria', 'Barkeria', 'Orchidaceae',
   'Epidendreae / Laeliinae', array['Epidendrum whartonianum'],
   'En peligro', true,
   'Endémica de Oaxaca. Flores rosadas vistosas; muy sensible a la perturbación de su hábitat.',
   '{"luz":"Brillante","temp":"Intermedio","riego":"Mucha agua en crecimiento; seco al perder hojas","nota":"Cultivar montada, con las raíces al aire."}'::jsonb,
   'barkeria-whartoniana', 'Sierra de Oaxaca'),
  ('Euchile mariae', 'Flor de Santa María', 'Euchile', 'Orchidaceae',
   'Epidendreae / Laeliinae', array['Encyclia mariae','Epidendrum mariae'],
   'Vulnerable', true,
   'Epífita endémica del noreste de México. Flores verdosas con labelo blanco; vulnerable por colecta.',
   '{"luz":"Media (sombra ligera)","temp":"Intermedio a fresco","riego":"Constante en crecimiento; ligero reposo","nota":"Buen drenaje; sensible al exceso de agua."}'::jsonb,
   'euchile-mariae', 'Sierra de Oaxaca'),
  ('Rhynchostele cervantesii', 'Lirio de Cervantes', 'Rhynchostele', 'Orchidaceae',
   'Cymbidieae / Oncidiinae', array['Lemboglossum cervantesii','Odontoglossum cervantesii'],
   'Preoc. menor', false,
   'Pequeña orquídea de montaña con flores estriadas en rosa y blanco. Común en bosques de niebla.',
   '{"luz":"Media-baja","temp":"Fresco","riego":"Húmeda todo el año","nota":"Condiciones de bosque de niebla; raíces siempre frescas."}'::jsonb,
   'rhynchostele-cervantesii', 'Sierra de Oaxaca'),
  ('Encyclia adenocaula', 'Encyclia rosada', 'Encyclia', 'Orchidaceae',
   'Epidendreae / Laeliinae', array['Epidendrum adenocaulon'],
   'Preoc. menor', false,
   'Endémica de México. Inflorescencias largas y ramificadas con flores rosadas perfumadas en primavera.',
   '{"luz":"Brillante","temp":"Intermedio","riego":"Reposo seco invernal","nota":"Inflorescencias largas; floración primaveral."}'::jsonb,
   'encyclia-adenocaula', 'Sierra de Oaxaca'),
  ('Prosthechea vitellina', 'Flor naranja', 'Prosthechea', 'Orchidaceae',
   'Epidendreae / Laeliinae', array['Encyclia vitellina','Epidendrum vitellinum'],
   'En peligro', false,
   'Flores naranja-rojo intenso muy aromáticas. En peligro, pero abundante en las reservas de OrchidArc.',
   '{"luz":"Media-alta","temp":"Fresco","riego":"Humedad alta constante","nota":"No requiere reposo marcado; muy aromática."}'::jsonb,
   'prosthechea-vitellina', 'Sierra de Oaxaca'),
  ('Stanhopea tigrina', 'Toritos', 'Stanhopea', 'Orchidaceae',
   'Cymbidieae / Stanhopeinae', array[]::text[],
   'Preoc. menor', false,
   'Flores grandes, carnosas y moteadas que cuelgan hacia abajo; aroma potente que atrae abejas euglosinas.',
   '{"luz":"Media (sombra)","temp":"Intermedio","riego":"Abundante en crecimiento","nota":"Cultivar en cesta: la inflorescencia crece hacia abajo."}'::jsonb,
   'stanhopea-tigrina', 'Sierra de Oaxaca'),
  ('Cuitlauzina pendula', 'Flor de Todos Santos', 'Cuitlauzina', 'Orchidaceae',
   'Cymbidieae / Oncidiinae', array['Odontoglossum pendulum','Oncidium galeottianum'],
   'Preoc. menor', false,
   'Endémica de México. Racimos colgantes de flores blanco-rosadas muy fragantes en primavera.',
   '{"luz":"Media-alta","temp":"Fresco","riego":"Reposo seco tras floración","nota":"Montada o colgante; flores péndulas fragantes."}'::jsonb,
   'cuitlauzina-pendula', 'Sierra de Oaxaca'),
  ('Rhynchostele bictoniensis', 'Lirio de San Pedro', 'Rhynchostele', 'Orchidaceae',
   'Cymbidieae / Oncidiinae', array['Lemboglossum bictoniense','Odontoglossum bictoniense'],
   'Preoc. menor', false,
   'Orquídea de tierras altas con espigas de flores verdosas y labelo rosado.',
   '{"luz":"Media","temp":"Fresco a intermedio","riego":"Húmeda en crecimiento","nota":"Terrestre o epífita de tierras altas."}'::jsonb,
   'rhynchostele-bictoniensis', 'Sierra de Oaxaca')
on conflict (sci_name) do nothing;

-- ===== 0003 =====
create or replace function public.enforce_rate_limit(
  p_table  regclass,
  p_uid    uuid,
  p_window interval,
  p_max    int
)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_count int;
begin
  if p_uid is null then return; end if;
  execute format(
    'select count(*) from %s where user_id = $1 and created_at >= now() - $2',
    p_table
  ) into v_count using p_uid, p_window;
  if v_count >= p_max then
    raise exception 'rate limit exceeded: max % per % on %', p_max, p_window, p_table
      using errcode = '53400';
  end if;
end;
$$;
revoke execute on function public.enforce_rate_limit(regclass,uuid,interval,int) from public;

create or replace function public.trg_rl_sightings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enforce_rate_limit('public.sightings', new.user_id, interval '1 hour', 60);
  perform public.enforce_rate_limit('public.sightings', new.user_id, interval '1 day',  300);
  return new;
end; $$;
create trigger trg_rl_sightings before insert on public.sightings
  for each row execute function public.trg_rl_sightings();

create or replace function public.trg_rl_comments()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enforce_rate_limit('public.sighting_comments', new.user_id, interval '10 minutes', 30);
  return new;
end; $$;
create trigger trg_rl_comments before insert on public.sighting_comments
  for each row execute function public.trg_rl_comments();

create or replace function public.trg_rl_agreements()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enforce_rate_limit('public.comment_agreements', new.user_id, interval '1 minute', 60);
  return new;
end; $$;
create trigger trg_rl_agreements before insert on public.comment_agreements
  for each row execute function public.trg_rl_agreements();

create or replace function public.trg_rl_messages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enforce_rate_limit('public.society_messages', new.user_id, interval '1 minute', 20);
  return new;
end; $$;
create trigger trg_rl_messages before insert on public.society_messages
  for each row execute function public.trg_rl_messages();

alter table public.profiles drop constraint if exists profiles_handle_key;
create unique index if not exists profiles_handle_lower_key
  on public.profiles (lower(handle));

alter table public.profiles
  add constraint profiles_handle_format
  check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');

create table if not exists public.reserved_handles (
  handle text primary key
);
insert into public.reserved_handles (handle) values
  ('admin'),('administrator'),('root'),('system'),('support'),('help'),
  ('orchidarc'),('orquidea'),('moderador'),('moderator'),('staff'),
  ('verifier'),('verificador'),('profepa'),('null'),('undefined'),('me'),('tu')
on conflict (handle) do nothing;
alter table public.reserved_handles enable row level security;

create table if not exists public.handle_changes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  handle     text,
  changed_at timestamptz not null default now()
);
create index if not exists handle_changes_user_idx on public.handle_changes (user_id, changed_at desc);
alter table public.handle_changes enable row level security;
create policy hc_read_own on public.handle_changes for select using (user_id = auth.uid());

create or replace function public.claim_handle(p_handle text)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_handle text := lower(trim(p_handle));
  v_changes int;
  v_row    public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_handle !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid handle: use 3-20 lowercase letters, digits or underscore';
  end if;
  if exists (select 1 from public.reserved_handles r where r.handle = v_handle) then
    raise exception 'handle reserved: %', v_handle;
  end if;
  if exists (
    select 1 from public.profiles p
    where lower(p.handle) = v_handle and p.id <> v_uid
  ) then
    raise exception 'handle taken: %', v_handle;
  end if;
  select count(*) into v_changes
  from public.handle_changes
  where user_id = v_uid and changed_at >= now() - interval '1 day';
  if v_changes >= 5 then
    raise exception 'too many handle changes today (max 5)';
  end if;
  update public.profiles set handle = v_handle where id = v_uid returning * into v_row;
  insert into public.handle_changes (user_id, handle) values (v_uid, v_handle);
  return v_row;
end;
$$;

grant execute on function public.claim_handle(text) to authenticated;
