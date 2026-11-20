-- Child safety: direct messages are only available when every participant has declared they are 18+.
-- Society chats are unaffected (visible to all members, moderated).
-- The age band lives in its own table, readable only by its owner, so nobody can look up who is a minor.

create table if not exists public.profile_age (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_adult boolean not null,
  declared_at timestamptz not null default now()
);
alter table public.profile_age enable row level security;
comment on table public.profile_age is
  'Self-declared age band (true = 18+, false = 12-17). Private: owner can read; writes only via set_age_band().';

drop policy if exists "Users can read their own age band" on public.profile_age;
create policy "Users can read their own age band" on public.profile_age
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate on public.profile_age from anon, authenticated;

-- Declare or change the age band. Adult -> minor is always allowed; minor -> adult is not.
create or replace function public.set_age_band(p_is_adult boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_current boolean;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if p_is_adult is null then raise exception 'age band required'; end if;
  select is_adult into v_current from public.profile_age where user_id = auth.uid();
  if p_is_adult and v_current is false then raise exception 'age band locked'; end if;
  insert into public.profile_age (user_id, is_adult) values (auth.uid(), p_is_adult)
  on conflict (user_id) do update set is_adult = excluded.is_adult, declared_at = now();
end $$;
revoke all on function public.set_age_band(boolean) from public, anon;
grant execute on function public.set_age_band(boolean) to authenticated;

create or replace function public.is_declared_adult(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_adult from public.profile_age where user_id = p_user_id), false);
$$;
revoke all on function public.is_declared_adult(uuid) from public, anon, authenticated;

-- True only if every participant of the thread is a declared adult.
create or replace function public.dm_thread_all_adults(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.dm_participants p
    where p.thread_id = p_thread_id and not public.is_declared_adult(p.user_id)
  );
$$;
revoke all on function public.dm_thread_all_adults(uuid) from public, anon;
grant execute on function public.dm_thread_all_adults(uuid) to authenticated;

-- Starting a conversation requires both people to be declared adults.
create or replace function public.get_or_create_dm_thread(p_other_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_self uuid := auth.uid();
  v_thread uuid;
begin
  if v_self is null then raise exception 'auth required'; end if;
  if p_other_user_id is null then raise exception 'recipient required'; end if;
  if p_other_user_id = v_self then raise exception 'cannot message yourself'; end if;
  if not public.is_declared_adult(v_self) then raise exception 'dm adults only: self'; end if;
  if not public.is_declared_adult(p_other_user_id) then raise exception 'dm adults only: recipient'; end if;

  select p1.thread_id into v_thread
  from public.dm_participants p1
  join public.dm_participants p2 on p2.thread_id = p1.thread_id
  where p1.user_id = v_self and p2.user_id = p_other_user_id
  limit 1;

  if v_thread is null then
    insert into public.dm_threads default values returning id into v_thread;
    insert into public.dm_participants (thread_id, user_id)
    values (v_thread, v_self), (v_thread, p_other_user_id)
    on conflict do nothing;
  end if;

  return v_thread;
end $$;

-- Sending a message requires every participant to be a declared adult (covers existing threads).
alter policy "DM participants can send messages" on public.dm_messages
  with check (
    (sender_id = (select auth.uid()))
    and is_dm_participant(thread_id)
    and dm_thread_all_adults(thread_id)
  );
