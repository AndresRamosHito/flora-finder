# OrquIDea / Flora Finder

Citizen-science web app for recording, discussing, mapping, and verifying wild orchid observations for OrchidArc.

The current build focuses on the **Sierra de Oaxaca** and is designed around a strict conservation principle:

> Observe, photograph, and document. Never collect wild plants.

## What the app does

- Lets authenticated users submit orchid sightings with a photo, date, general locality, notes, and optional taxon ID.
- Removes EXIF metadata from uploaded photos before storage.
- Captures GPS coordinates separately from the image file when browser permission is granted.
- Publishes sightings through masked public views/RPCs rather than exposing raw location data directly.
- Shows a public feed of recent sightings.
- Shows a map using public/fuzzed coordinates.
- Supports sensitive-species handling, comments, verifications, hunts, ranking, and trade-report intake.

## Conservation and location policy

This project is intentionally conservative with location data.

- Photos are processed client-side to strip EXIF before upload.
- Coordinates, when available, are stored as structured fields rather than embedded in image metadata.
- User-submitted locations are marked as `fuzzed` by default.
- Public surfaces should read through `sightings_public`, `sighting_public_one`, or `sightings_in_bbox`, not directly from the raw `sightings` table.
- Sensitive species must never expose exact public coordinates.

See [`docs/coordinate-policy.md`](docs/coordinate-policy.md) for the implementation policy.

## Tech stack

- TanStack Start
- React 19
- TanStack Router
- TanStack Query
- Supabase
- PostGIS
- Leaflet / React Leaflet
- Tailwind CSS
- Radix UI

## Local development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Format:

```bash
npm run format
```

## Environment variables

The Supabase client expects:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The client also supports server-side fallbacks:

```bash
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

## Data model overview

Generated Supabase types currently include tables and views for:

- `sightings`
- `sightings_public`
- `taxa`
- `profiles`
- `sighting_comments`
- `comment_agreements`
- `verifications`
- `trade_reports`
- `hunts`
- `hunt_targets`
- `badges`
- `user_badges`
- `societies`
- `society_members`
- `society_messages`

The repo should eventually include database migrations so the schema, RLS policies, storage policies, and PostGIS functions can be reviewed alongside the frontend code.

## Near-term priorities

1. Add database migrations to the repository.
2. Add acceptance tests proving sensitive species coordinates are masked for anonymous/public access.
3. Confirm that direct `sightings` reads are blocked or appropriately restricted by RLS.
4. Add server-side image hardening so EXIF stripping is not only a client-side guarantee.
5. Add offline capture queue for fieldwork without signal.

## License

License not yet specified.
