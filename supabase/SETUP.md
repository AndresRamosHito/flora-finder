# Self-hosting the OrquIDea database (own Supabase project)

This moves OrquIDea off the Lovable-managed Supabase project (`muniabnnsasurbooeing`,
which we don't control and is gated by Lovable's plan limits) onto a Supabase
project **you own**. The whole backend lives in `supabase/migrations/`, so the new
project is reproducible from this repo — no data dependency on the old one.

What's reproduced by the migrations: all tables + enums, row-level security, the
RPCs (`sightings_in_bbox`, `leaderboard`, `claim_handle`, `sighting_public_one`,
…), the masking views, the `sightings` Storage bucket + policies, seed societies,
and the full **1,322-species** Mexican orchid catalog rebuilt from the Herbario
AMO checklist (`20260616000000_*`).

## 1. Create the project

1. In your own Supabase account → **New project**. Pick a region close to your
   users (e.g. `us-east`). Save the **database password**.
2. Note the **project ref** (Settings → General) and the **Project URL** and
   **anon/publishable key** (Settings → API).

## 2. Apply the schema + catalog

Use the Supabase CLI (no need to open the SQL editor):

```bash
# one-time
npm i -g supabase            # or: brew install supabase/tap/supabase

supabase login               # opens browser
supabase link --project-ref <YOUR_NEW_REF>
supabase db push             # applies every file in supabase/migrations/ in order
```

`db push` records applied migrations in `supabase_migrations.schema_migrations`,
so it's safe to re-run — it only applies what's pending.

Verify:

```sql
select count(*) as taxa, count(distinct genus) as genera from public.taxa;
-- expect ~1322 taxa across ~163 genera, genus populated
```

## 3. Auth (password + Google + magic-link backup)

The app uses Supabase Auth. In the new project's dashboard:

- **Authentication → URL Configuration**
  - Site URL: `https://orquidea.orchidarc.org`
  - Redirect URLs: add:
    - `https://orquidea.orchidarc.org/auth/callback`
    - `https://orquidea.orchidarc.org/login`
    - `http://localhost:3000/auth/callback`
    - `http://localhost:3000/login`
  - The app appends `?next=/onboarding` for OAuth/magic-link sign-in and
    `?reset=1` for password recovery.
- **Authentication → Providers**
  - **Email**: enable Email provider and make sure email/password signups are
    allowed. Password sign-in is now the primary path.
  - Magic links remain available only as a backup.
  - **Google**: enable and paste a Google OAuth client ID + secret
    (Google Cloud Console → OAuth consent + credentials; authorized redirect URI
    is the value Supabase shows on that provider page).

## 4. Storage

The `sightings` bucket and its policies are created by the migrations — nothing to
do. Confirm under **Storage** that a public `sightings` bucket exists.

## 5. Point the app at the new project

The app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
(`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` server-side).

- **Vercel** (production) → Project → Settings → Environment Variables. Set, for
  Production (and Preview):
  - `VITE_SUPABASE_URL` = `https://<NEW_REF>.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = the new anon key
  - `SUPABASE_URL` = same URL
  - `SUPABASE_PUBLISHABLE_KEY` = same anon key
  - `VITE_SUPABASE_PROJECT_ID` = `<NEW_REF>`
  Then **redeploy**.
- **Local** → update `.env` (see `.env.example`) with the same values.

## 6. Auto-apply migrations going forward (the durable fix)

A GitHub Action (`.github/workflows/db-migrate.yml`) runs `supabase db push`
against the new project whenever `supabase/migrations/**` changes on `main`, and
can be run manually (Actions → "Apply Supabase migrations" → Run workflow). This
is what was missing before — Vercel only deploys the frontend, so the DB silently
drifted. Add two repository secrets:

- **Settings → Secrets and variables → Actions → New repository secret**
  - `SUPABASE_ACCESS_TOKEN` = a personal access token from
    https://supabase.com/dashboard/account/tokens
  - `SUPABASE_DB_PASSWORD` = your database password, **raw** (no URL-encoding)
