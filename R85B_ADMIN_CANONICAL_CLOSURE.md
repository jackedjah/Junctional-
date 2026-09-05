# R85B — FOB Admin Canonical Closure

## Starting checkpoint
`MAHFITT_R85_COACH_EXPERIENCE_HUMANIZATION.zip`

SHA-256: `cec5ca4ef078e91d1ec46d6ff00d5c79c3d7fbe18749c8547f7c17faa528f802`

The exact ZIP was fresh-extracted and its full R85 gate passed before edits.

## Root causes fixed
1. `/form-review` (MAH Inquiries) was still a standalone legacy server-rendered page with hard-coded gold tokens, Inter typography, rounded generic controls, and a non-wrapping desktop action row. The MAHFITT crown had been mounted above it, but the page body had not actually joined canonical Theme/layout ownership.
2. FOB Admin exposed `LEGACY / DIRECT FALLBACK` as a normal UI block. It was a migration safety net for historical direct routes, not a product concept.
3. `coach-shell.js` owned a separate backend color Theme in `fob.coach.theme.v1`, so admin color ownership could diverge from the signed-in MAHFITT account.
4. Several FOB admin subpages still requested stale `coach-shell` v446 assets.

## R85B behavior
- MAH Inquiries uses MAHFITT Theme aliases (`coach-surface` + `coach-primary`) and Space Grotesk.
- Its mobile admin actions wrap into a contained two-column grid; no page-level horizontal overflow.
- Duplicate FOB wordmark furniture was removed from the Inquiries body.
- FOB Admin no longer exposes any `legacy/direct fallback` block or legacy Gym/Calendar/Message labels.
- Historical routes remain deployed as compatibility endpoints, but their canonical replacements own normal UX.
- MAHFITT writes the active signed-in account Theme to `fob.mygym.theme.active-account.v1`; FOB Admin reads that bridge. There is no separate backend color editor anymore.
- Members Edit sends fitness work to canonical MAHFITT Coach Mode instead of exposing a Gym Tracker shortcut.
- The business calendar is labelled `Session Calendar`, not canonical `MAH Calendar`.
- Delivery/cache identity advances to v449.

## Physical verification
Browser simulation passes the reported iPhone overflow geometry, but a deployed physical iPhone check is still required before claiming physical-device closure.
