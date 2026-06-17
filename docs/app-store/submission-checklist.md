# OrquIDea App Store Submission Checklist

Last updated: 17 June 2026

## Current status

Foundation is in progress:

- PWA manifest exists
- App icons exist
- Service worker exists
- Offline page exists
- Privacy, terms, and support pages exist
- Public sitemap includes legal/support pages

## Required before app-store submission

### Build and installability

- Run `npm install`
- Run `npm run build`
- Deploy to https://orquidea.orchidarc.org/
- Verify `/manifest.webmanifest` loads
- Verify `/sw.js` loads
- Verify `/offline.html` loads
- Verify Chrome DevTools reports a registered service worker
- Verify the app can be installed from Chrome/Android
- Verify iOS Safari Add to Home Screen uses correct app icon and title

### Public URLs

Confirm these work after deployment:

- https://orquidea.orchidarc.org/
- https://orquidea.orchidarc.org/privacy
- https://orquidea.orchidarc.org/terms
- https://orquidea.orchidarc.org/support
- https://orquidea.orchidarc.org/sitemap.xml
- https://orquidea.orchidarc.org/robots.txt

### Account and reviewer access

If login is required for any core review flow:

- Create a test account for Apple/Google review
- Add reviewer credentials to the store review notes, not to the public repo
- Confirm the reviewer can open the app, view feed/map/species, and submit or preview an observation

### Screenshots needed

Capture clean phone screenshots after deployment.

Recommended set:

1. Home / community feed
2. Map view with generalized observations
3. Species information page
4. New observation / capture screen
5. Illegal trade reporting screen
6. Community / orchid societies screen
7. Offline fallback or field-friendly mode, optional

Apple common screenshot sizes to prepare:

- 6.9-inch iPhone display
- 6.5-inch iPhone display if required
- iPad only if submitting as iPad-compatible

Google Play screenshots:

- Phone screenshots, minimum 2
- Recommended 6 to 8
- 16:9 or 9:16 accepted depending capture/export

### Store assets

- App icon, 1024 x 1024 PNG for Apple
- Feature graphic for Google Play, 1024 x 500 PNG
- App preview video, optional
- Screenshots without browser chrome
- No misleading wild-collection imagery
- No visible precise sensitive-species locations

### Policy/compliance checks

- Privacy policy matches actual data collection
- Terms clearly state observe-only, no collection
- Support email works: andresr@orchidarc.org
- Sensitive locations are generalized or hidden
- Camera/location permission prompts are tied to user action
- Account deletion/data deletion route is described or supported through email

### Technical app wrapper step

Android options:

- Start with PWA installability
- Then package as Trusted Web Activity or Capacitor

iOS options:

- Use Capacitor wrapper
- Add enough app-specific functionality beyond a simple website wrapper
- Ensure camera/location/offline field workflow is meaningful

## Reviewer note draft

OrquIDea is a citizen-science orchid observation app operated by OrchidArc. The app supports observation, education, identification, conservation reporting, and responsible documentation of wild orchids. It intentionally avoids exposing precise sensitive-species localities to reduce risks of poaching, illegal trade, or habitat disturbance.
