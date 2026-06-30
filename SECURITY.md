# Flora Finder Security Notes

Flora Finder contains observation data, location data, community content, and reports. Treat exact locations and reports as sensitive.

## Apply now

1. Apply the SQL migration in `supabase/migrations/202606300001_security_hardening_rls.sql` using the Supabase SQL editor or Supabase CLI.
2. In Supabase, verify Row Level Security is enabled on the application tables.
3. Use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the client app.
4. Keep privileged server credentials out of browser and mobile builds.
5. Public maps and feeds should use `public.sightings_public`, not `public.sightings`.

## Sensitive areas

- Exact sighting coordinates are in `public.sightings`.
- Public sighting display should come from `public.sightings_public`.
- Trade reports should be visible only to the reporter and moderator/admin roles.
- Society messages should be visible only to society members.
- Normal users should not be able to edit profile role or points.

## Manual release checks

- Anonymous visitors cannot read `public.sightings` directly.
- Anonymous visitors can read only intended public content.
- A user cannot edit another user's profile, sightings, comments, likes, or reports.
- A user cannot set their own role or points.
- Public maps do not expose exact sensitive coordinates.
