# R85A1 — Coach Tabs + Pedometer Functionality Hotfix

## Starting checkpoint

- Complete application: `MAHFITT_R85A_CANONICAL_COMPONENT_CLOSURE_FULL_SITE.zip`
- SHA-256: `914600e445052d8145d3e5525fa302b8a6697363829ae72a5e9b7e772decebdc`
- Starting file count: 353
- Baseline R85A release/component/role/audio/message/browser/Mr.Mah gates passed before edits.

## Problem closed

### Coach primary navigation

`TODAY`, `CLIENTS`, `MESSAGES`, `RESOURCES`, and `ADMIN` could become unusable when the optional coach-relationship/resource storage layer was unavailable even though the authenticated FOB administrator and the older active-member records were still valid.

R85A1 makes FOB Admin an explicit compatibility authorization grant:

- the signed-in account remains the real authenticated account;
- the existing active FOB member table can populate the Coach client directory when the relationship service is unavailable;
- client-context authorization still resolves server-side and is marked `fob_admin`;
- ordinary non-admin coaches still fail closed when their relationship grant cannot be verified;
- Today and Messages inherit the recovered authorized client directory;
- Resources falls back to three real documents already shipped with FOB Systems when migration-053 resource storage is unavailable;
- no fake resource-create or assignment persistence is exposed while that storage is unavailable;
- Admin remains available independently.

### Pedometer

The old browser estimator incremented a step whenever raw acceleration changed by more than a single threshold with only a short time gate. That treated hand motion, shaking, and vibration as walking.

R85A1 replaces it with a foreground browser estimator that requires:

1. gravity-free or gravity-filtered dynamic acceleration;
2. a peak followed by release;
3. plausible walk/run cadence confirmation;
4. cadence-specific minimum/maximum gaps.

It also checkpoints foreground browser estimates before Safari hides/suspends the page, restores a higher unsynced foreground checkpoint after reload, and exposes `RESUME STEP SENSOR` for an active Walk/Run when iOS motion permission must be re-established by a user gesture.

This does **not** claim step counting while Safari/PWA is fully suspended or closed. Reliable closed/background counting requires native iOS Core Motion/HealthKit integration. The hotfix preserves the last foreground estimate and improves recovery without pretending the web runtime remains alive.

## Delivery

Application cache identity advances from v451 to v452 so old Coach/pedometer client code cannot mix with this hotfix.

No new database migration is required by this hotfix. Migration 053 is still required for saved custom Resources/Habits behavior; without it, Resources deliberately presents the shipped built-in library instead of a dead page.

## Verification status

Working-tree software gates passed. A complete staging ZIP was clean-extracted file-for-file and passed the same 605/605 targeted assertion/interaction matrix plus the release gate. Exact outgoing-ZIP verification is recorded in `R85A1_TEST_RESULTS.md`.

Physical iPhone pedometer accuracy and fully closed/background counting remain separate device/platform gates.
