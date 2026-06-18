-- Add profile images, favourite species, and brief profile descriptions.
-- This is deliberately additive: the baseline schema already exists remotely.

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_storage_path text,
  add column if not exists bio text,
  add column if not exists favorite_taxon_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_bio_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_bio_length_check check (char_length(coalesce(bio, '')) <= 280);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_favorite_taxon_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_favorite_taxon_id_fkey
      foreign key (favorite_taxon_id)
      references public.taxa(id)
      on delete set null;
  end if;
end $$;

create index if not exists profiles_favorite_taxon_id_idx
  on public.profiles(favorite_taxon_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles are publicly readable'
  ) then
    create policy "Profiles are publicly readable"
      on public.profiles
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.profiles
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Profile photos are publicly readable'
  ) then
    create policy "Profile photos are publicly readable"
      on storage.objects
      for select
      using (bucket_id = 'profile-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own profile photos'
  ) then
    create policy "Users can upload own profile photos"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'profile-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update own profile photos'
  ) then
    create policy "Users can update own profile photos"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'profile-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
      with check (
        bucket_id = 'profile-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete own profile photos'
  ) then
    create policy "Users can delete own profile photos"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'profile-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;
