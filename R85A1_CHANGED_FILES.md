# R85A1 — Changed Files

## Behavioral production owners

- `netlify/functions/_mahfitt-role-context.js` — authenticated FOB-admin compatibility directory/client-context authorization when optional relationship service is degraded; ordinary coach authorization remains fail-closed.
- `netlify/functions/_mahfitt-coach-experience.js` — built-in Resources fallback using real shipped FOB documents when canonical resource storage is unavailable.
- `mygym.js` — cadence-aware browser step estimator, foreground checkpoint/recovery, motion-sensor resume control, and Resources degraded-state presentation.

## Delivery/cache stamp owners

These change only to move the complete hotfix from v451 to v452 and prevent mixed Safari/service-worker assets:

- `sw.js`
- `netlify/functions/mygym.js`
- `calendar.html`
- `report-cards.html`
- `admin-app.css`
- `coach-shell.css`
- `netlify/functions/admin.js`
- `netlify/functions/calendar-admin.js`
- `netlify/functions/fob-payment.js`
- `netlify/functions/fob-progress.js`
- `netlify/functions/form-review.js`

## Current-version test contracts

- `tests/r85a-canonical-component-closure.test.js`
- `tests/r85a-r82-mrmah-preservation.test.js`
- `tests/r85a-r83-mrmah-preservation.test.js`
- `tests/r85a-release-gate.py`
- `tests/r85a-source-guards.test.js`

## New regression tests

- `tests/r85a-coach-tabs-pedometer.test.js`
- `tests/r85a-five-tabs-degraded-browser.py`

## Documentation

- `R85A1_IMPLEMENTATION_REPORT.md`
- `R85A1_CHANGED_FILES.md`
- `R85A1_TEST_RESULTS.md`

## Cleanup

- Removed one inherited compiled Python `__pycache__` artifact. It was test-runtime debris, not application source/runtime behavior.

No accepted member/Coach function is intentionally deleted.
