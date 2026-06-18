-- Society registration, membership, and chat access rules.
-- Public users can read society directory entries. Authenticated users can register
-- a society, join/leave societies with their own user_id, and chat only inside
-- societies where they are members.

alter table public.societies enable row level security;
alter table public.society_members enable row level security;
alter table public.society_messages enable row level security;

create unique index if not exists society_members_unique_user_society
  on public.society_members (society_id, user_id);

create index if not exists society_messages_society_created_idx
  on public.society_messages (society_id, created_at);

-- Society directory

drop policy if exists "Anyone can view societies" on public.societies;
create policy "Anyone can view societies"
  on public.societies
  for select
  using (true);

drop policy if exists "Authenticated users can register societies" on public.societies;
create policy "Authenticated users can register societies"
  on public.societies
  for insert
  to authenticated
  with check (true);

-- Memberships

drop policy if exists "Users can view their memberships" on public.society_members;
create policy "Users can view their memberships"
  on public.society_members
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can join societies as themselves" on public.society_members;
create policy "Users can join societies as themselves"
  on public.society_members
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can leave societies as themselves" on public.society_members;
create policy "Users can leave societies as themselves"
  on public.society_members
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Society chat

drop policy if exists "Members can read society messages" on public.society_messages;
create policy "Members can read society messages"
  on public.society_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.society_members sm
      where sm.society_id = society_messages.society_id
        and sm.user_id = auth.uid()
    )
  );

drop policy if exists "Members can send society messages" on public.society_messages;
create policy "Members can send society messages"
  on public.society_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and body is not null
    and length(trim(body)) between 1 and 1000
    and exists (
      select 1
      from public.society_members sm
      where sm.society_id = society_messages.society_id
        and sm.user_id = auth.uid()
    )
  );
