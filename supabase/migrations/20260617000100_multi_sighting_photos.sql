-- Allow a sighting to carry a gallery of uploaded photos while keeping
-- sightings.photo_url as the legacy/thumbnail first image used by feeds.

create table if not exists public.sighting_photos (
  id uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  photo_url text not null,
  storage_path text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (sighting_id, position)
);

create index if not exists sighting_photos_sighting_id_position_idx
  on public.sighting_photos (sighting_id, position);

alter table public.sighting_photos enable row level security;

drop policy if exists "sighting photos are public" on public.sighting_photos;
create policy "sighting photos are public"
  on public.sighting_photos
  for select
  using (
    exists (
      select 1
      from public.sightings_public sp
      where sp.id = sighting_photos.sighting_id
    )
  );

drop policy if exists "owners can insert sighting photos" on public.sighting_photos;
create policy "owners can insert sighting photos"
  on public.sighting_photos
  for insert
  with check (
    auth.uid() = (
      select s.user_id
      from public.sightings s
      where s.id = sighting_photos.sighting_id
    )
  );

drop policy if exists "owners can update sighting photos" on public.sighting_photos;
create policy "owners can update sighting photos"
  on public.sighting_photos
  for update
  using (
    auth.uid() = (
      select s.user_id
      from public.sightings s
      where s.id = sighting_photos.sighting_id
    )
  )
  with check (
    auth.uid() = (
      select s.user_id
      from public.sightings s
      where s.id = sighting_photos.sighting_id
    )
  );

drop policy if exists "owners can delete sighting photos" on public.sighting_photos;
create policy "owners can delete sighting photos"
  on public.sighting_photos
  for delete
  using (
    auth.uid() = (
      select s.user_id
      from public.sightings s
      where s.id = sighting_photos.sighting_id
    )
  );

-- Backfill existing one-photo sightings into the new gallery table.
insert into public.sighting_photos (sighting_id, photo_url, position, created_at)
select id, photo_url, 0, created_at
from public.sightings
where photo_url is not null
on conflict (sighting_id, position) do nothing;
