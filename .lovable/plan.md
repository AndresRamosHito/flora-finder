## Where we are

The skeleton is in: auth (magic link), capture + EXIF strip, masked feed, real Leaflet map calling `sightings_in_bbox`, life list, hunts, leaderboard, trade-report intake. The Prime Directive (no exact coords for sensitive species via any path) is enforced at the database layer via `sightings_public` + `sightings_in_bbox` + `fuzz_point`.

What's *not* in yet, grouped by priority.

---

## P0 — Required to call the MVP "done"

1. **Acceptance-test verification**. Seed a real *Laelia speciosa* or *Barkeria whartoniana* sighting with a known exact coord, then hit `sightings_public`, `sightings_in_bbox`, and a direct `sightings` select as anon — confirm coords come back null or fuzzed everywhere. Right now we *believe* it works; we haven't proven it with data.
2. **Verifications flow**. The `verifications` table exists with no UI. Without it, `status` is stuck on `pending` forever and the leaderboard / "Verificado" pill mean nothing. Need: on a sighting detail screen, an "Estoy de acuerdo con la ID" / "Sugerir otra ID" action that writes to `verifications` and flips `sightings.status` once N agreements land.
3. **Sighting detail route** (`/s/$id`). Tapping a feed card or map pin currently goes nowhere. This is also where comments + verifications live.
4. **Comments + agreements** (`sighting_comments`, `comment_agreements` tables already there, no UI).
5. **Google sign-in**. Spec said add it by default; right now it's email magic-link only. Needs `supabase--configure_social_auth` + Lovable OAuth broker call.

## P1 — Promised in the spec, not built

6. **Trade-report processing**. `/reportar` writes rows but nothing happens to them. Needs a server route (`/api/public/trade-report-notify` or a server fn) that emails OrchidArc on insert, plus a minimal admin queue view.
7. **Societies** (`societies`, `society_members`, `society_messages` tables exist, no routes). At minimum: join/leave + a society feed.
8. **Hunt progress + badge awarding**. `hunts` and `hunt_targets` render, but there's no "you've found 3/5" progress, and `user_badges` never gets written. Needs a trigger or server fn that awards on hunt completion.
9. **Profile / handle change**. `handle_changes` table is there for rate-limiting renames; no settings screen.
10. **ID suggestions on capture**. Currently the user picks from a flat list of 10 taxa. Spec mentioned ID assistance — minimum viable is filter-as-you-type + "most-likely in this region/season" sort; stretch is a Lovable AI image call returning candidate species.

## P2 — Polish that matters for a citizen-science app

11. **Map upgrades**: clustering when zoomed out, filter chips (sensitive on/off, status, taxon), "locate me" button, link from pin → sighting detail.
12. **Feed filters & search** by taxon / region / status.
13. **PWA + offline capture queue** — fieldwork happens with no signal in the Sierra; photos should queue locally and upload when back online.
14. **Empty states with real copy** — feed/map/ranking all currently show "0 results" silently because the DB is empty.
15. **i18n discipline pass** — strings are inline Spanish; fine for now, but extract before adding a second locale.
16. **Image storage hardening** — confirm the `sightings` bucket scrubs server-side too (in case a client bypasses `exif-strip.ts`), and add a max-size check.

## P3 — Nice-to-haves

17. Public species pages (`/especies/$slug`) for SEO.
18. Sharable sighting cards (OG image generation).
19. Admin/moderator role + dashboard (curate IDs, hide reports, ban handles).
20. Export for OrchidArc's herbarium (CSV/Darwin Core).

---

## Suggested next build chunk

If you want one focused turn, I'd do **#1 + #2 + #3 + #4 together** — that's the loop that turns this from "a pretty shell" into "a working citizen-science tool": you can open a sighting, see who shot it, agree on the ID, and watch it flip to *verified*. Everything else can wait a turn.

Tell me which chunk to take and I'll switch to build mode.
