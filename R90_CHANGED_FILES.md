# R90 CHANGED FILES

Starting source: `MAHFITT_R89_FULL_SITE_DEPLOY.zip`  
Incoming ZIP SHA-256: `d782a03034d28e1cf7f4248b96499480e34145ef32afad9ca65780970004a64d`

## Modified production files

- `mygym.js` — canonical Coach Mode, active-profile lifecycle, client context UI, client-safe AI routing, canonical relationship-coach messaging, profile-specific runtime reset.
- `mygym.css` — shared client-context, Coach Mode, protected-personal-system and canonical message-thread styling/responsive rules.
- `netlify/functions/mygym.js` — account/profile separation, role resolver integration, permissions, AI guards, account-owned Theme/music, fitness-only client hydration, canonical client program/data mutations.
- `calendar.js` — active-profile propagation, account/profile boot state, client-context UI; boot-cache key advanced to R90.
- `calendar.css` — compact canonical client-context treatment.
- `calendar.html` — R90/v447 asset stamps for changed Calendar/canonical shell owners.
- `netlify/functions/calendar-api.js` — role resolver/permissions, client fitness owner vs account Theme/music owner, anti-impersonation booking guards.
- `netlify/functions/meal-gradient.js` — relationship coach log context and server-side Meal Scan AI protection.
- `netlify/functions/message-center.js` — relationship-coach authorization and message permission while preserving actual coach sender identity.
- `admin-app.js` / `admin-app.css` — legacy backend repositioned as FOB business admin with canonical MAHFITT Coach Mode as primary coaching entry; business capabilities retained.
- `netlify/functions/admin.js` — v447 delivery stamp for modified admin assets.
- `sw.js` — shell cache advanced from v446 to v447 so R89 assets cannot outrank the R90 role/context deployment.

## Added production/schema owner

- `netlify/functions/_mahfitt-role-context.js` — one canonical signed-account / active-fitness-profile / permission resolver.
- `supabase/migrations/052_mahfitt_role_context.sql` — explicit coach-to-client authorization relationship and per-domain permissions.

## Development-only simulator

- `dev/mahfitt-role-simulator.html`
- `dev/mahfitt-role-simulator.css`
- `dev/mahfitt-role-simulator.js`

It is local/localhost-only, uses isolated fixture persistence, makes no API calls, and has RESET DEMO DATA.

## Tests / evidence added

- `tests/r90-role-context.test.js`
- `tests/r90-messaging-context.test.js`
- `tests/r90-audio-ownership.test.js`
- `tests/r90-source-guards.test.js`
- `tests/r90-simulator-persistence.test.js`
- `tests/r90-r82-mrmah-preservation.test.js`
- `tests/r90-r83-mrmah-preservation.test.js`
- `tests/r82-mrmah-micro-specular-edge.historical.js`
- `tests/r83-mrmah-visibility-closure.historical.js`
- `tests/r90-release-gate.py`
- `validation/r90-responsive/*`

No starting-tree file was deleted.
