# R85A Changed Files

## New production owner
- `mahfitt-canonical-components.css` — shared role-neutral typography, button/control and measured crown geometry tokens.

## Modified production files
- `coach-shell.js` — removes Backend Player/Theme modal/audio engine; launches canonical Player/Theme/AI/Messages; keeps safe return context; canonical crown structure.
- `coach-shell.css` — canonical measured crown geometry, occlusion, anchor placement and shared control ownership.
- `admin-app.js` — canonical action/control classes and concise user-facing copy.
- `admin-app.css` — consumes shared canonical metrics; removes role-specific geometry assumptions.
- `mygym.js` — safe external global-tool return handling for canonical Player/Theme.
- `gym-app.css` — shared canonical component integration required by R85A.
- `netlify/functions/mygym.js` — loads shared component owner; advances asset version to v451.
- `netlify/functions/admin.js` — loads v451 Admin/crown assets.
- `netlify/functions/form-review.js` — v451 canonical Admin/crown asset ownership.
- `netlify/functions/fob-payment.js` — canonical component owner + v451 assets.
- `netlify/functions/fob-progress.js` — v451 canonical Admin/crown assets.
- `netlify/functions/calendar-admin.js` — v451 canonical Admin/crown assets.
- `calendar.html` — v451 delivery reference.
- `report-cards.html` — v451 delivery reference.
- `sw.js` — `fob-shell-v451` and shared canonical component precache.

## Added R85A tests/evidence
- `tests/r85a-canonical-component-closure.test.js`
- `tests/r85a-source-guards.test.js`
- `tests/r85a-release-gate.py`
- `tests/r85a-component-visual.py`
- `tests/r85a-admin-responsive.py`
- `tests/r85a-r82-mrmah-preservation.test.js`
- `tests/r85a-r83-mrmah-preservation.test.js`
- `validation/r85a-components/*`
- `validation/r85a-admin/*`

## Deleted baseline files
None.
