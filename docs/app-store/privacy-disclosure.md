# OrquIDea Privacy Disclosure Draft

Last updated: 17 June 2026

This file is a working draft for Apple App Store Connect and Google Play Console data-safety questionnaires. Confirm actual implementation before submission.

## Data types likely collected

### Contact information

- Email address
- User/profile name, if enabled

Purpose:

- Account creation and authentication
- User support
- Observation attribution where applicable

Linked to user: Yes, if account login is used.

### User content

- Uploaded orchid photographs
- Observation notes
- Species-identification comments or community contributions

Purpose:

- Citizen-science observations
- Species identification
- Conservation documentation
- Community moderation

Linked to user: Yes, if submitted while logged in.

### Location

- Approximate or precise observation location, if the user submits it
- Device location only when the user grants permission and chooses to use location features

Purpose:

- Mapping observations
- Conservation analysis
- Sensitive-location protection

Public display:

- Exact coordinates for sensitive species should not be publicly exposed.
- Locations may be generalized, hidden, or restricted.

Linked to user: Potentially yes.

### Photos and camera access

- Camera access may be requested to photograph orchids or upload observation images.

Purpose:

- Create orchid observations
- Support visual identification

Linked to user: Yes, if uploaded through a logged-in account.

### Diagnostics and technical data

- Browser/device information
- Basic logs or error reports if implemented

Purpose:

- Security
- Debugging
- App reliability

Linked to user: Depends on implementation.

## Data not intended to be collected

- Payment information
- Health data
- Fitness data
- Contacts/address book
- Messages
- Browsing history outside the app
- Financial information

## Data sharing statement

OrquIDea should state that it does not sell personal data. Observation data may be shared with conservation partners, researchers, or orchid societies when this supports conservation and does not expose sensitive species locations inappropriately.

## Reviewer note

OrquIDea handles biological-location data conservatively because wild orchid localities can be vulnerable to poaching, illegal trade, and habitat disturbance.

## Implementation checks before submission

- Confirm Supabase auth data retained and deletion process.
- Confirm whether analytics are enabled.
- Confirm whether crash/error reporting sends user identifiers.
- Confirm image metadata handling, especially EXIF GPS.
- Confirm public map never reveals exact coordinates for sensitive taxa.
- Confirm account/data deletion contact path works through /support.
