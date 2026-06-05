# Coordinate and Sensitive-Species Policy

This document defines how OrquIDea / Flora Finder should handle location data for wild orchid observations.

## Goals

The app must balance two needs:

1. **Scientific value**: useful observation records need date, place, habitat notes, image evidence, and preferably GPS coordinates.
2. **Conservation safety**: rare or trade-vulnerable orchids must not expose exact locations to the public.

The project therefore stores useful field data while publishing only protected location data.

## Rules

### 1. Never rely on image EXIF for coordinates

Uploaded images are processed before upload to remove EXIF metadata. Coordinates should be stored in database fields, not embedded in images.

Current capture flow:

- user selects or takes a photo;
- the browser processes the file with `stripExifAndDownscale`;
- the cleaned JPEG is uploaded to Supabase Storage;
- GPS, if available, is stored separately as `lat` and `lng`.

### 2. Public views must not expose raw coordinates

Public pages should read through server-controlled public interfaces:

- `sightings_public`
- `sighting_public_one`
- `sightings_in_bbox`

Public frontend code should avoid direct reads from `sightings` except for owner/admin-only screens protected by RLS.

### 3. Sensitive taxa must be masked server-side

Sensitive species masking must be enforced in the database layer, not only in React components.

The frontend can display warnings, but it is not a security boundary.

Expected behavior:

- non-sensitive taxa: public coordinates may be fuzzed or rounded;
- sensitive taxa: public coordinates should be fuzzed heavily, converted to a broad region, or set to `null`;
- exact coordinates should be visible only to the observer and authorized OrchidArc reviewers/admins, if RLS allows it.

### 4. User-submitted coordinates default to fuzzed

The capture form inserts `location_precision: "fuzzed"` by default for all user submissions.

This does not mean all raw coordinates are public. It means public coordinates should be treated as approximate unless a trusted review process upgrades or exports the record internally.

### 5. Text locality is not exact locality

The public text field `location_label` should be general, for example:

- `near Capulálpam, oak forest`
- `Sierra de Oaxaca`
- `cloud forest edge`

Users should not be encouraged to write trail names, private land details, exact tree locations, or other micro-locality information for sensitive taxa.

## Required database checks

Because the SQL migrations are not currently present in the repository, the following must be checked in Supabase directly and then committed as migrations.

### A. RLS on `sightings`

Anonymous users should not be able to select raw rows from `sightings`.

Recommended policy model:

- observer can read own raw sightings;
- verifier/admin can read raw sightings;
- anonymous/public users cannot read raw sightings;
- public users read only via masked views/RPCs.

### B. Public view masking

Test with one sensitive taxon and one non-sensitive taxon.

For each test record, query as anonymous:

```sql
select * from sightings_public where id = '<sighting_id>';
select * from sightings_in_bbox(<bbox covering the exact point>);
```

Expected:

- sensitive taxon must not return exact `lat/lng`;
- non-sensitive taxon should return only acceptable fuzzed/rounded coordinates;
- `is_masked` should clearly indicate whether masking occurred.

### C. Storage bucket policy

The `sightings` storage bucket should not become a bypass for sensitive data.

Check:

- upload size limits;
- MIME type restrictions;
- whether public object URLs are required;
- whether server-side EXIF stripping or image transformation should be added for defense-in-depth.

## Acceptance test checklist

Before calling the MVP conservation-safe:

- [ ] A sensitive species submitted with exact GPS does not expose exact coordinates in `sightings_public`.
- [ ] A sensitive species submitted with exact GPS does not expose exact coordinates through `sightings_in_bbox`.
- [ ] Anonymous users cannot select raw `sightings.lat` and `sightings.lng` directly.
- [ ] The owner can still see enough information to manage their own observation.
- [ ] Reviewers/admins can access raw coordinates only through intentional policies.
- [ ] Uploaded photos contain no GPS EXIF.
- [ ] Public UI explains when a location is protected.

## Future improvement

The app should eventually store both:

- raw private geometry for scientific review;
- public masked geometry for maps/search.

That separation should be enforced with database views/RPCs and RLS, not only with frontend code.
