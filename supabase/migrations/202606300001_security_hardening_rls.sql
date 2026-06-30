-- Flora Finder database security hardening
-- Conservative RLS migration: no guessed admin/moderator enum values.
-- Public content stays readable where needed; user-owned and sensitive content is owner-gated.

begin;

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

create or replace function public.is_sighting_owner(sighting_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sightings s
    where s.id = sighting_uuid
      and s.user_id = auth.uid()
  );
$$;

create or replace function public.is_society_member(society_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.society_members sm
    where sm.society_id = society_uuid
      and sm.user_id = auth.uid()
  );
$$;

-- Prevent normal authenticated users from editing protected profile fields.
-- Service-role/database maintenance can still operate with the service role.
create or replace function public.prevent_profile_protected_field_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Profile role cannot be changed by the client';
  end if;

  if new.points is distinct from old.points then
    raise exception 'Profile points cannot be changed by the client';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Profile created_at cannot be changed by the client';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_protected_field_updates on public.profiles;
create trigger prevent_profile_protected_field_updates
before update on public.profiles
for each row
execute function public.prevent_profile_protected_field_updates();

-- -----------------------------------------------------------------------------
-- Enable RLS on app tables. PostGIS metadata tables are intentionally excluded.
-- -----------------------------------------------------------------------------

alter table public.badges enable row level security;
alter table public.comment_agreements enable row level security;
alter table public.handle_changes enable row level security;
alter table public.hunt_targets enable row level security;
alter table public.hunts enable row level security;
alter table public.profiles enable row level security;
alter table public.reserved_handles enable row level security;
alter table public.sighting_comments enable row level security;
alter table public.sighting_likes enable row level security;
alter table public.sighting_photos enable row level security;
alter table public.sightings enable row level security;
alter table public.societies enable row level security;
alter table public.society_members enable row level security;
alter table public.society_messages enable row level security;
alter table public.taxa enable row level security;
alter table public.trade_reports enable row level security;
alter table public.user_badges enable row level security;
alter table public.verifications enable row level security;

-- -----------------------------------------------------------------------------
-- Remove policies managed by this migration, then recreate them.
-- -----------------------------------------------------------------------------

drop policy if exists "Public can read badges" on public.badges;
drop policy if exists "Public can read hunts" on public.hunts;
drop policy if exists "Public can read hunt targets" on public.hunt_targets;
drop policy if exists "Public can read societies" on public.societies;
drop policy if exists "Public can read taxa" on public.taxa;
drop policy if exists "Authenticated can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can read own handle changes" on public.handle_changes;
drop policy if exists "Users can insert own handle changes" on public.handle_changes;
drop policy if exists "Users can read own sightings" on public.sightings;
drop policy if exists "Users can insert own sightings" on public.sightings;
drop policy if exists "Users can update own sightings" on public.sightings;
drop policy if exists "Users can delete own sightings" on public.sightings;
drop policy if exists "Public can read sighting photos for public sightings" on public.sighting_photos;
drop policy if exists "Owners can manage sighting photos" on public.sighting_photos;
drop policy if exists "Public can read comments for public sightings" on public.sighting_comments;
drop policy if exists "Users can insert own comments" on public.sighting_comments;
drop policy if exists "Users can update own comments" on public.sighting_comments;
drop policy if exists "Users can delete own comments" on public.sighting_comments;
drop policy if exists "Public can read likes" on public.sighting_likes;
drop policy if exists "Users can insert own likes" on public.sighting_likes;
drop policy if exists "Users can delete own likes" on public.sighting_likes;
drop policy if exists "Users can read own comment agreements" on public.comment_agreements;
drop policy if exists "Users can insert own comment agreements" on public.comment_agreements;
drop policy if exists "Users can delete own comment agreements" on public.comment_agreements;
drop policy if exists "Users can read own society memberships" on public.society_members;
drop policy if exists "Users can join societies" on public.society_members;
drop policy if exists "Users can leave societies" on public.society_members;
drop policy if exists "Members can read society messages" on public.society_messages;
drop policy if exists "Members can create society messages" on public.society_messages;
drop policy if exists "Users can update own society messages" on public.society_messages;
drop policy if exists "Users can delete own society messages" on public.society_messages;
drop policy if exists "Users can create own trade reports" on public.trade_reports;
drop policy if exists "Users can read own trade reports" on public.trade_reports;
drop policy if exists "Users can read own badges" on public.user_badges;
drop policy if exists "Public can read verifications for public sightings" on public.verifications;
drop policy if exists "Users can create own verifications" on public.verifications;

-- -----------------------------------------------------------------------------
-- Public/reference tables
-- -----------------------------------------------------------------------------

create policy "Public can read badges"
on public.badges for select
to anon, authenticated
using (true);

create policy "Public can read hunts"
on public.hunts for select
to anon, authenticated
using (true);

create policy "Public can read hunt targets"
on public.hunt_targets for select
to anon, authenticated
using (true);

create policy "Public can read societies"
on public.societies for select
to anon, authenticated
using (true);

create policy "Public can read taxa"
on public.taxa for select
to anon, authenticated
using (true);

-- -----------------------------------------------------------------------------
-- Profiles and user-owned records
-- -----------------------------------------------------------------------------

create policy "Authenticated can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can read own handle changes"
on public.handle_changes for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own handle changes"
on public.handle_changes for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can read own badges"
on public.user_badges for select
to authenticated
using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Sightings. Exact coordinates in public.sightings are private to the owner.
-- Public feeds should use public.sightings_public.
-- -----------------------------------------------------------------------------

create policy "Users can read own sightings"
on public.sightings for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own sightings"
on public.sightings for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own sightings"
on public.sightings for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own sightings"
on public.sightings for delete
to authenticated
using (user_id = auth.uid());

create policy "Public can read sighting photos for public sightings"
on public.sighting_photos for select
to anon, authenticated
using (
  exists (
    select 1
    from public.sightings_public sp
    where sp.id = sighting_id
  )
  or public.is_sighting_owner(sighting_id)
);

create policy "Owners can manage sighting photos"
on public.sighting_photos for all
to authenticated
using (public.is_sighting_owner(sighting_id))
with check (public.is_sighting_owner(sighting_id));

create policy "Public can read comments for public sightings"
on public.sighting_comments for select
to anon, authenticated
using (
  exists (
    select 1
    from public.sightings_public sp
    where sp.id = sighting_id
  )
  or user_id = auth.uid()
);

create policy "Users can insert own comments"
on public.sighting_comments for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own comments"
on public.sighting_comments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own comments"
on public.sighting_comments for delete
to authenticated
using (user_id = auth.uid());

create policy "Public can read likes"
on public.sighting_likes for select
to anon, authenticated
using (true);

create policy "Users can insert own likes"
on public.sighting_likes for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can delete own likes"
on public.sighting_likes for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can read own comment agreements"
on public.comment_agreements for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own comment agreements"
on public.comment_agreements for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can delete own comment agreements"
on public.comment_agreements for delete
to authenticated
using (user_id = auth.uid());

create policy "Public can read verifications for public sightings"
on public.verifications for select
to anon, authenticated
using (
  exists (
    select 1
    from public.sightings_public sp
    where sp.id = sighting_id
  )
  or verifier_id = auth.uid()
);

create policy "Users can create own verifications"
on public.verifications for insert
to authenticated
with check (verifier_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Societies
-- -----------------------------------------------------------------------------

create policy "Users can read own society memberships"
on public.society_members for select
to authenticated
using (user_id = auth.uid());

create policy "Users can join societies"
on public.society_members for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can leave societies"
on public.society_members for delete
to authenticated
using (user_id = auth.uid());

create policy "Members can read society messages"
on public.society_messages for select
to authenticated
using (
  society_id is not null
  and public.is_society_member(society_id)
);

create policy "Members can create society messages"
on public.society_messages for insert
to authenticated
with check (
  user_id = auth.uid()
  and society_id is not null
  and public.is_society_member(society_id)
);

create policy "Users can update own society messages"
on public.society_messages for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own society messages"
on public.society_messages for delete
to authenticated
using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Trade reports: potentially sensitive report/location data.
-- -----------------------------------------------------------------------------

create policy "Users can create own trade reports"
on public.trade_reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  or (anonymous = true and reporter_id is null)
);

create policy "Users can read own trade reports"
on public.trade_reports for select
to authenticated
using (reporter_id = auth.uid());

commit;
