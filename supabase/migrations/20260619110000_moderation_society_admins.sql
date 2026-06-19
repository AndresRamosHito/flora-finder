-- Moderation and society administration foundation.
-- This does not create Supabase auth users. Instead, existing user profiles can be
-- promoted to platform admins or society moderators/admins.

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false,
  add column if not exists admin_badge_label text,
  add column if not exists admin_badge_icon text not null default 'flower';

alter table public.society_members
  add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'approved',
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

update public.society_members
set status = coalesce(nullif(status, ''), 'approved'),
    role = coalesce(nullif(role, ''), 'member'),
    approved_at = coalesce(approved_at, joined_at, now())
where true;

alter table public.society_members
  drop constraint if exists society_members_role_check,
  add constraint society_members_role_check
    check (role in ('member', 'moderator', 'admin'));

alter table public.society_members
  drop constraint if exists society_members_status_check,
  add constraint society_members_status_check
    check (status in ('pending', 'approved', 'rejected', 'banned'));

create table if not exists public.society_channels (
  id uuid primary key default gen_random_uuid(),
  society_id text not null references public.societies(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (society_id, slug)
);

alter table public.society_messages
  add column if not exists channel_id uuid references public.society_channels(id) on delete set null,
  add column if not exists is_removed boolean not null default false,
  add column if not exists removed_by uuid references public.profiles(id) on delete set null,
  add column if not exists removed_at timestamptz,
  add column if not exists removal_reason text;

insert into public.society_channels (society_id, slug, name, description, sort_order, is_default)
select s.id, 'general', 'General', 'Avisos y conversación general', 0, true
from public.societies s
on conflict (society_id, slug) do nothing;

insert into public.society_channels (society_id, slug, name, description, sort_order, is_default)
select s.id, 'identificacion', 'Identificación', 'Ayuda con identificación de orquídeas', 10, false
from public.societies s
on conflict (society_id, slug) do nothing;

insert into public.society_channels (society_id, slug, name, description, sort_order, is_default)
select s.id, 'salidas', 'Salidas', 'Coordinación de campo y eventos', 20, false
from public.societies s
on conflict (society_id, slug) do nothing;

insert into public.society_channels (society_id, slug, name, description, sort_order, is_default)
select s.id, 'conservacion', 'Conservación', 'Temas de conservación, rescate y moderación', 30, false
from public.societies s
on conflict (society_id, slug) do nothing;

update public.society_messages m
set channel_id = c.id
from public.society_channels c
where m.channel_id is null
  and c.society_id = m.society_id
  and c.is_default = true;

create table if not exists public.sighting_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  sighting_id uuid references public.sightings(id) on delete set null,
  action text not null check (action in ('mark_non_orchid', 'restore', 'hide', 'note')),
  reason text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists society_channels_society_id_idx
  on public.society_channels(society_id, sort_order);

create index if not exists society_messages_channel_id_idx
  on public.society_messages(channel_id, created_at);

create index if not exists sighting_moderation_actions_sighting_id_idx
  on public.sighting_moderation_actions(sighting_id, created_at desc);

alter table public.society_channels enable row level security;
alter table public.sighting_moderation_actions enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_platform_admin = true
  );
$$;

create or replace function public.is_society_moderator(p_society_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.society_members sm
      where sm.society_id = p_society_id
        and sm.user_id = auth.uid()
        and sm.status = 'approved'
        and sm.role in ('moderator', 'admin')
    );
$$;

create or replace function public.approve_society_member(
  p_society_id text,
  p_user_id uuid,
  p_approved boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_society_moderator(p_society_id) then
    raise exception 'not authorized';
  end if;

  update public.society_members
  set status = case when p_approved then 'approved' else 'rejected' end,
      approved_by = auth.uid(),
      approved_at = case when p_approved then now() else null end
  where society_id = p_society_id
    and user_id = p_user_id;
end;
$$;

create or replace function public.moderate_sighting(
  p_sighting_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if p_action not in ('mark_non_orchid', 'restore', 'hide', 'note') then
    raise exception 'invalid action';
  end if;

  insert into public.sighting_moderation_actions (sighting_id, action, reason, actor_id)
  values (p_sighting_id, p_action, p_reason, auth.uid());

  if p_action in ('mark_non_orchid', 'hide') then
    update public.sightings
    set status = 'rejected'
    where id = p_sighting_id;
  elsif p_action = 'restore' then
    update public.sightings
    set status = 'pending'
    where id = p_sighting_id;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'society_channels'
      and policyname = 'Society channels are publicly readable'
  ) then
    create policy "Society channels are publicly readable"
      on public.society_channels
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'society_channels'
      and policyname = 'Society moderators can manage channels'
  ) then
    create policy "Society moderators can manage channels"
      on public.society_channels
      for all
      to authenticated
      using (public.is_society_moderator(society_id))
      with check (public.is_society_moderator(society_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sighting_moderation_actions'
      and policyname = 'Platform admins can read moderation actions'
  ) then
    create policy "Platform admins can read moderation actions"
      on public.sighting_moderation_actions
      for select
      to authenticated
      using (public.is_platform_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Platform admins can update profiles'
  ) then
    create policy "Platform admins can update profiles"
      on public.profiles
      for update
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;
end $$;

grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.is_society_moderator(text) to anon, authenticated;
grant execute on function public.approve_society_member(text, uuid, boolean) to authenticated;
grant execute on function public.moderate_sighting(uuid, text, text) to authenticated;
