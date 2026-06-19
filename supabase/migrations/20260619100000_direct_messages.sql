-- Private direct messages between two users.
-- Additive and idempotent: safe to apply after the remote baseline schema.

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_participants (
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists dm_participants_user_id_idx
  on public.dm_participants(user_id);

create index if not exists dm_messages_thread_id_created_at_idx
  on public.dm_messages(thread_id, created_at);

alter table public.dm_threads enable row level security;
alter table public.dm_participants enable row level security;
alter table public.dm_messages enable row level security;

create or replace function public.is_dm_participant(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dm_participants p
    where p.thread_id = p_thread_id
      and p.user_id = auth.uid()
  );
$$;

create or replace function public.get_or_create_dm_thread(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self uuid := auth.uid();
  v_thread uuid;
begin
  if v_self is null then
    raise exception 'auth required';
  end if;

  if p_other_user_id is null then
    raise exception 'recipient required';
  end if;

  if p_other_user_id = v_self then
    raise exception 'cannot message yourself';
  end if;

  select p1.thread_id into v_thread
  from public.dm_participants p1
  join public.dm_participants p2 on p2.thread_id = p1.thread_id
  where p1.user_id = v_self
    and p2.user_id = p_other_user_id
  limit 1;

  if v_thread is null then
    insert into public.dm_threads default values
    returning id into v_thread;

    insert into public.dm_participants (thread_id, user_id)
    values (v_thread, v_self), (v_thread, p_other_user_id)
    on conflict do nothing;
  end if;

  return v_thread;
end;
$$;

create or replace function public.touch_dm_thread_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists dm_messages_touch_thread on public.dm_messages;
create trigger dm_messages_touch_thread
after insert on public.dm_messages
for each row execute function public.touch_dm_thread_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_threads'
      and policyname = 'DM participants can read threads'
  ) then
    create policy "DM participants can read threads"
      on public.dm_threads
      for select
      to authenticated
      using (public.is_dm_participant(id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_participants'
      and policyname = 'DM participants can read participants'
  ) then
    create policy "DM participants can read participants"
      on public.dm_participants
      for select
      to authenticated
      using (public.is_dm_participant(thread_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_messages'
      and policyname = 'DM participants can read messages'
  ) then
    create policy "DM participants can read messages"
      on public.dm_messages
      for select
      to authenticated
      using (public.is_dm_participant(thread_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dm_messages'
      and policyname = 'DM participants can send messages'
  ) then
    create policy "DM participants can send messages"
      on public.dm_messages
      for insert
      to authenticated
      with check (
        sender_id = auth.uid()
        and public.is_dm_participant(thread_id)
      );
  end if;
end $$;

grant execute on function public.is_dm_participant(uuid) to authenticated;
grant execute on function public.get_or_create_dm_thread(uuid) to authenticated;
