# R85 CHANGED FILES

R85 is cumulative from the exact R90A baseline. No baseline production file was deleted.

## Modified production files

| File | Reason |
|---|---|
| `mygym.js` | Friendly Coach Home/Today, primary Coach IA, Client Directory closure, Coach Inbox, Resources UI, canonical MAH Habits UI, client-context routing, contextual Program Tools, rapid-tap/retry/state ownership. |
| `mygym.css` | MAHFITT-native Coach/Clients/Messages/Resources/Habits/Admin primitives derived from the existing Theme/crown/control system; responsive closure. |
| `netlify/functions/mygym.js` | Routes R85 coach-experience actions through one server owner; adds habits/resources permission mapping; preserves coach authorship for periodization; delivery version v448. |
| `netlify/functions/_mahfitt-role-context.js` | Adds explicit `habits` and `resources` permissions to the canonical role context. |
| `admin-app.js` | Demotes old direct member tools to collapsed legacy fallback and routes ordinary coach messaging back to canonical MAHFITT. |
| `admin-app.css` | Styles the deliberate legacy fallback inside FOB Admin without introducing another Coach visual system. |
| `netlify/functions/admin.js` | Advances affected Admin static asset stamps to v448. |
| `calendar.html` | Advances canonical Calendar asset stamps to v448; no Calendar redesign. |
| `sw.js` | Advances service-worker shell cache from v447 to v448. |

## New production/runtime owners

| File | Reason |
|---|---|
| `netlify/functions/_mahfitt-coach-experience.js` | Single server owner for Coach Today, relationship-scoped Inbox, Resources and MAH Habits. |
| `supabase/migrations/053_coach_habits_resources.sql` | Canonical Resources, assignments, Habits, completion history and relationship-permission schema. |

## New targeted tests

- `tests/r85-data-model.test.js`
- `tests/r85-coach-experience-server.test.js`
- `tests/r85-coach-experience-ui.test.js`
- `tests/r85-source-guards.test.js`
- `tests/r85-browser-flow.py`
- `tests/r85-browser-edge-cases.py`
- `tests/r85-r82-mrmah-preservation.test.js`
- `tests/r85-r83-mrmah-preservation.test.js`
- `tests/r85-release-gate.py`

## Validation evidence

`validation/r85-browser/` contains representative Coach Home, Clients, Messages, Resources, Habits, Admin, client Home, iPhone-width and iPad-orientation captures generated from the production CSS/JS browser harness.
