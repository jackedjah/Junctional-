# R85B Changed Files

## Production
- `admin-app.js` — removes user-facing legacy/direct fallback and stale member selector; canonical Coach Mode owns client fitness.
- `admin-app.css` — removes fallback component styling.
- `mygym.js` — mirrors the signed-in account Theme to the canonical admin Theme bridge.
- `coach-shell.js` — reads the MAHFITT active-account Theme; removes separate backend color Theme editing.
- `netlify/functions/form-review.js` — canonical Theme/typography/control geometry, mobile-safe action layout, duplicate branding removal.
- `netlify/functions/fob-payment.js` — routes fitness work to Coach Mode; relabels business calendar.
- `netlify/functions/admin.js` — v449 admin assets.
- `netlify/functions/calendar-admin.js` — v449 canonical coach-shell assets.
- `netlify/functions/fob-progress.js` — v449 canonical coach-shell assets.
- `report-cards.html` — v449 canonical coach-shell assets.
- `netlify/functions/mygym.js` — asset version 449.
- `calendar.html` — v449 asset delivery.
- `sw.js` — shell cache v449.

## Tests / evidence
- Updated R85 delivery/UI guards for v449 and removal of the fallback UI.
- Added `tests/r85b-admin-canonical-closure.test.js`.
- Added `tests/r85b-admin-responsive.py`.
- Added R85B responsive evidence captures under `validation/`.

No baseline production file was deleted.
