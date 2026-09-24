# MAHWORLD GAMEPLAY RUNTIME — PHASE 4 REPORT
**PERSISTENCE + INPUT + INTERACTION + WORLD SHELL + QA TOOLS** · 2026-09-13 · Claude (engineering lane) · **HARD STOP — awaiting human approval**

| field | value |
|---|---|
| PHASE | Gameplay Runtime Phase 4 (Phase 3 sandbox approved as the base) |
| STATUS | **COMPLETE (development quality).** The dev runtime can SAVE / LOAD a versioned profile, ROUTE INPUT through one abstract layer with three adapters, INTERACT WITH WORLD HOOKS (door, climb, mentor, arena, transport, gym, raid placeholders) driven by data-defined POIs, RUN REPEATABLE BOT COMBAT (seeded, deterministic) and RECORD / REPLAY sessions — headless in node and in the browser sandbox. |
| BLENDER USED | **NO.** Claude launched no Blender process. (Astra's own `blender.exe` was observed running during the phase and was left alone.) |
| ASTRA ASSETS MODIFIED | **NONE.** `hash_tools.py protected` → 63 files checked, `MUTATION: false` (RAW_10_MODELS, WORKING_10_MODELS, Astra Athlete_F handoff). No GLB / texture / material / visual file touched. |
| FINAL ART / VFX / ANIMATION | none produced; interiors, prompts, bot, transitions are placeholders labelled as such |
| SAVE FORMAT VERSION | **1.0.0** (`persistence.schema_version` in `00_CORE/dev_tuning.dev.json`; `PROFILE_SCHEMA_VERSION` in `18_PERSISTENCE/PlayerProfileStore.js`). Migration ledger: `0.9.0 → 1.0.0` (dev pre-release shape). Unknown / newer versions are refused (`UNKNOWN_SCHEMA_VERSION`), corrupt JSON refused (`CORRUPT`), invalid content refused with explicit errors; **temporary buffs are never persisted** (validator rejects `temporary_buffs` / `active_buffs` / `buffs`). Storage: memory (tests), node file adapter, browser `localStorage` (sandbox) — local development only, no accounts, no backend. |

## TEST TOTALS
| suite | result | note |
|---|---|---|
| `CLAUDE_GAMEPLAY_RUNTIME/16_TESTS/gameplay_phase4.test.mjs` (NEW) | **85 / 85** | persistence, schema migration, input abstraction (3 adapters, remap, no logic in router), interaction range + eligibility, door contract (+ injectable loading / transition strategies), flight controls, world + POI registry, deterministic bot (same seed → identical stream), record / replay (+ tampered record detected), all 7 scenarios, boundaries |
| `CLAUDE_GAMEPLAY_RUNTIME/24_TEST_SCENARIOS/run_scenarios.mjs` (NEW) | **7 / 7 scenarios** (48 checks) | SCENARIO_01 spawn → fused travel → door · 02 fused → split → walk → climb · 03 mentor → duel → eccentric special → reward · 04 travel flight → combat engagement → combat cap clamp · 05 spectator → Call Next → post-fight queue · 06 save → reload → verify · 07 stale / invalid save → migration |
| `CLAUDE_GAMEPLAY_SANDBOX/11_TESTS/sandbox_phase4.test.mjs` (NEW) | **23 / 23** | SAVE / LOAD / migrate / RESET, prompts, DOOR TEST → ENTERED, CLIMB TEST form-gated, FLIGHT button, BOT DUEL, RECORD / STOP / REPLAY, thin-view assertions |
| `CLAUDE_GAMEPLAY_SANDBOX/11_TESTS/sandbox.test.mjs` (existing) | **59 / 59** | unchanged |
| `CLAUDE_GAMEPLAY_RUNTIME/16_TESTS/gameplay_runtime.test.mjs` (existing, Phase 2) | **125 / 125** | unchanged |
| `CLAUDE_GAMEPLAY_FOUNDATION/12_SCHEMAS/gameplay_validate.mjs` | **118 / 118** | ledger rows OD-24 … OD-28 added; validator green |
| mahloco `CLAUDE_DUAL_LOCOMOTION/15_RUNTIME_DESIGN/mahloco/tests/test_state_machine.py` | **OK** | untouched |
| runtime foundation `14_TESTS/phase3.test.mjs` / `phase4_5.test.mjs` / `syntax.check.mjs` / `gltfloader.vendor.test.mjs` | **218 / 92 / 126 / 28** all green | untouched |
| `09_RUNTIME_CODE/tests/test_foundation.py` · `07_VALIDATION_TOOLS/runtime_validate.py` | **OK** · `PASS: true` | untouched |
| mrmah3d sync `16_MRMAH3D_INTEGRATION/sync_mahworld.py --check` | **29 entries, 0 problems** | generated copy in sync (no foundation source changed) |
| mrmah3d generated `tests/mahworld-contracts.test.mjs` · `mahworld.test.mjs` · `mahworld-head-eye.test.mjs` | **189 / 218 / 92** green | untouched |
| Browser (headless Chrome, SwiftShader, `?p4=1&tick=timer`, virtual time) | `MAHWORLD_SANDBOX_P4 {"save":true,"door_test":true,"interact":true,"prompt":"[CONFIRM] ENTER POI_DOOR_GYM_01 · M / INTERACT","door_state":"ENTERED","bot_duel":true,"record":true,"bot_state":"ATTACK","bot_decisions":7,"player_health":"MAH_ATHLETE_F 76 · SPARRING_BOT 100","recorded":{"inputs":0,"events":21,"samples":17,"duration_s":4.175},"load":true,…}` | `CLAUDE_GAMEPLAY_SANDBOX/evidence/chrome_phase4_smoke.log`, `phase4_panel_smoke.png` (the smoke drives buttons, so the recording holds bot / duel events and no player inputs; the node test records real inputs) |

## NEW REGRESSIONS
**None.** Every previously green suite is green at the same counts. Pre-existing failures, unchanged and unrelated: mrmah3d `tests/mrmah3d.test.js` 378 / 379 (R107 smooth-clay gate), `tests/mrsmah.test.mjs` 13 / 30, `tests/mrmah3d-r111.test.mjs` anatomy assertion.

## SANDBOX FEATURES ADDED (debug quality, one HTML section `PHASE 4 · PERSISTENCE / INTERACTION / QA`)
SAVE · LOAD · RESET DEV PROFILE (browser `localStorage`, schema 1.0.0, migration reported) · interaction prompt line (`[CONFIRM] <prompt> · M / INTERACT` or `BLOCKED: <reasons>`, device-neutral, no platform icons) · M · INTERACT · DOOR TEST (teleport to `POI_DOOR_GYM_01`; APPROACH → AVAILABLE → CONFIRMED → TRANSITION → ENTERED with placeholder interior) · CLIMB TEST (teleport to `POI_WALL_01`; blocked until SPLIT; then the Phase 2 climbing hooks) · G · FLIGHT (router intent → ENTER_FLIGHT / EXIT_FLIGHT → existing flight session) · BOT DUEL (seeded deterministic sparring bot inside the existing duel zone; player attacks pass through its defend reduction) · RECORD SESSION / STOP / REPLAY SESSION (replay into the live world; divergences reported honestly). The router's KEYBOARD_MOUSE adapter is attached beside the Phase 3 DesktopInput; both dispatch the same authoritative actions. Notes: `CLAUDE_GAMEPLAY_SANDBOX/13_PHASE4/PHASE_4_SANDBOX_NOTES.md`.

## SYSTEMS DELIVERED (see `25_HANDOFF/PHASE_4_MODULE_GUIDE.md` for the per-module contract)
1. **Persistent player profile** — `18_PERSISTENCE/PlayerProfileStore.js`: player_id, selected_character_class, selected_sex, level, xp, permanent_stats, mentor_progress, activity_progress, unlocks, settings, future_cosmetic_selections, last_world, last_spawn, schema_version (+ created_at / saved_at); NEW / SAVE / LOAD / VALIDATE / MIGRATE / RESET DEVELOPMENT PROFILE; `fromGameplay` / `applyToGameplay` bridge to the live gameplay profile.
2. **Input router** — `19_INPUT/InputRouter.js`: 13 intents → authoritative `InputActions`; adapters KEYBOARD_MOUSE / CONTROLLER (PLACEHOLDER_LAYOUT) / TOUCH_FUTURE (tested INTERFACE_STUB); `remap`; keyboard attach; no gameplay logic (test-asserted).
3. **Flight control contract** — `19_INPUT/FlightControls.js`: ENTER_FLIGHT / EXIT_FLIGHT / ASCEND / DESCEND / FORWARD / BACKWARD / STRAFE over the existing FlightSession (fused / split travel ceilings, combat override read from the session mode, energy drain, forced descent). Flight rules untouched.
4. **Context interaction framework** — `20_INTERACTIONS/InteractionSystem.js`: 11 types; interaction points with id / type / position / range / requirements / available_actions / prompt / session_handler; range enter / exit events; nearest-eligible prompt; INTERACT confirms; `standardHandlers` route to runtime systems.
5. **Door / building entry contract** — `createDoorTransition`: APPROACH → AVAILABLE → CONFIRMED → TRANSITION → ENTERED (→ EXITING); loading strategy slot (OD-25) and transition style slot (OD-26) with placeholders; no interiors.
6. **World model + POI registry** — `21_WORLD_SCHEMA/WorldRegistry.js` + `data/worlds.dev.json` (WORLD_DEV_01 / WORLD_DEV_02 sharing infrastructure ids, independent profiles); 10 POI types; POIs derive interaction points; validation refuses monsters (Phase 4 boundary), unknown infrastructure, bad exits.
7. **Deterministic duel bot** — `22_DEBUG_BOT/DuelBot.js`: mulberry32 seed; IDLE / MOVE / DEFEND / ATTACK / RANGED / DEFEATED; contact basic + upright-row ranged fixture through the existing attack execution; numbers under `dev.bot`.
8. **Session record / replay** — `23_REPLAY/SessionRecorder.js`: inputs, gameplay / mahloco / flight / resource / attack / damage / duel / interaction / XP events, timed state samples, duration; `replaySession` into a fresh world for the recorded duration; `compareRecords` divergence report.
9. **Scenarios** — `24_TEST_SCENARIOS/` harness + SCENARIO_01 … 07 + runner (`--json` export).

## OPEN DECISIONS (not finalised — strategy slots / placeholders only)
| id | item | how Phase 4 leaves it |
|---|---|---|
| OD-13 / **OD-24** (new) | control mappings / final touch gesture mapping | TOUCH_FUTURE map is data + stub; nothing bound to gameplay |
| **OD-28** (new) | controller layout | CONTROLLER map labelled PLACEHOLDER_LAYOUT |
| OD-02 | Call Next after decline | still policies A / B / C EXPERIMENTAL (SCENARIO_05 exercises A) |
| OD-15 | combat targeting | bot targets by id; no targeting policy chosen |
| **OD-27** (new) | world travel UX | TRANSPORT / WORLD_EXIT handler returns a placeholder session tagged OD-27 |
| **OD-25** (new) | loading / streaming architecture | `loadingStrategy` slot, PLACEHOLDER_INSTANT |
| **OD-26** (new) | interior transition style | `transitionStyle` slot, PLACEHOLDER_FADE |
| OD-09 | swimming | SWIM handler refuses with OD-09 |
| OD-19 | ATHLETE remains the DEVELOPMENT prototype choice only | unchanged |

## FILES CREATED (18)
`CLAUDE_GAMEPLAY_RUNTIME\18_PERSISTENCE\PlayerProfileStore.js` · `19_INPUT\InputRouter.js` · `19_INPUT\FlightControls.js` · `20_INTERACTIONS\InteractionSystem.js` · `21_WORLD_SCHEMA\WorldRegistry.js` · `21_WORLD_SCHEMA\data\worlds.dev.json` · `22_DEBUG_BOT\DuelBot.js` · `23_REPLAY\SessionRecorder.js` · `24_TEST_SCENARIOS\scenarioHarness.js` · `24_TEST_SCENARIOS\scenarios.js` · `24_TEST_SCENARIOS\run_scenarios.mjs` · `16_TESTS\gameplay_phase4.test.mjs` · `25_HANDOFF\PHASE_4_MODULE_GUIDE.md` · `25_HANDOFF\GAMEPLAY_RUNTIME_PHASE_4_REPORT.md` (this file) · `CLAUDE_GAMEPLAY_SANDBOX\13_PHASE4\Phase4Panel.js` · `13_PHASE4\PHASE_4_SANDBOX_NOTES.md` · `11_TESTS\sandbox_phase4.test.mjs` · `evidence\chrome_phase4_smoke.log` + `evidence\phase4_panel_smoke.png`.

## FILES MODIFIED (7 — all in Claude-owned trees; nothing in Astra / RAW / WORKING / runtime foundation / mrmah3d)
| file | before sha256 | after sha256 | change | rollback |
|---|---|---|---|---|
| `CLAUDE_GAMEPLAY_RUNTIME\06_INPUT\InputActions.js` | `239099c1dddf9a691a8725fb9ad0547c0c5a94a68de28294ea35a004592e6b79` (reconstructed: the hash was taken after the edit; the edit is the single ACTIONS line, so the pre-edit bytes are exactly recoverable) | `468fe3b794321c610b4bac18418aa627ff0306be6fd0e394fcecc43ab32be67f` | added `'LOOK', 'MENU', 'ENTER_FLIGHT', 'EXIT_FLIGHT'` to `ACTIONS` + trailing comment | remove the four names and the comment from line 6 |
| `CLAUDE_GAMEPLAY_RUNTIME\00_CORE\dev_tuning.dev.json` | not captured before the edit (edit and hash ran in the same step — noted honestly) | `33bfb944d40140acc9fa774260b994d79754d9727ca198caddc3070341746c75` | added keys `bot`, `interaction`, `persistence` (EXPERIMENTAL); file re-serialised with indent 1 | delete the three keys; all pre-existing values are unchanged (Phase 2 suite 125 / 125 confirms) |
| `CLAUDE_GAMEPLAY_FOUNDATION\15_OPEN_DECISIONS\GAMEPLAY_OPEN_DECISIONS.md` | `f9171ac0de8d49b47ff46c6f9f297a0f732f36f108a0f7d0fbb346fd0273c764` | `1586967e88e53a11cf1c7df303c140cbbb16b637146cf5b4950a5f0fbe0bf310` | appended rows OD-24 … OD-28 after OD-23 (append-only; no existing row changed) | delete the five rows |
| `CLAUDE_GAMEPLAY_SANDBOX\00_RUNTIME\sandboxRuntime.js` | `339702f91361966d4c0d82c88ff83193879b2df3daa9931e1ee2a94546b2c005` | `3399c60ae0f44cfcfcd47088720745fc6366ae09743aad3d9cb21032b8fa4bfe` | resolves the Phase 4 runtime modules + climbing hooks into `modules`; loads `worlds.dev.json`; exposes `worldData` | remove the `P4` block and `worldData` |
| `CLAUDE_GAMEPLAY_SANDBOX\00_RUNTIME\sandboxWorld.js` | `751d8e3773740667f32d9f51fe420d8e83bfabe532f2f8d941d5523ec31ebf4d` | `64fa6f1e346a59631ce5cf4122499a41537df9408b7c99c27d84473b87bc7f88` | imports / mounts `Phase4Panel`, localStorage adapter, router keyboard attach, `act` entries, `phase4.tick` | remove the import, the `phase4` lines and the added `act` entries |
| `CLAUDE_GAMEPLAY_SANDBOX\index.html` | `385a69b809d7e17e38046779c0221883617239270a2243ddff0eca9d69530718` | `db2bd08bc65cf14728d3e0bf837034900b8a58eebcf9c2f74f5354b1e6ccc6f8` | one new `<section>` (PHASE 4 panel) before REAL CHARACTER SWAP | delete the section |
| `CLAUDE_GAMEPLAY_SANDBOX\sandbox.js` | `0e301d16034db512ea414449facd71a6a28b35c6378b4dd8036eb07226b82595` | `70d98b0d7f21bd1526b16b557664ea5c29b08fa8566edb007312154e0b7a3443` | `?p4=1` headless smoke hook (console proof line) | delete the `p4` block |

## BOUNDARIES HONOURED
No Blender · no Astra mutation · no READY promotion (registry still PREPARED for Athlete_F; the sandbox proxy stays labelled DEBUG PROXY) · no locomotion propagation · no cosmetic / animation / VFX / UI production assets · no networking / accounts / commerce · no maps / monsters / bosses / final interiors · mahloco not replaced (adapter only; transform refusals such as MIN_DWELL are surfaced, not bypassed) · canonical numbers only from `PLAYER_MOVEMENT_DEFAULTS.json` / `dev_tuning.dev.json` (test-asserted for every new module) · open decisions never resolved (five new ledger rows) · protected hash set MUTATION false · foundation ↔ mrmah3d sync 29 / 29 in sync.

## HOW TO RUN
```
cd CLAUDE_GAMEPLAY_RUNTIME && node 16_TESTS/gameplay_phase4.test.mjs && node 24_TEST_SCENARIOS/run_scenarios.mjs
cd CLAUDE_GAMEPLAY_SANDBOX && node 11_TESTS/sandbox_phase4.test.mjs && python serve_sandbox.py   →  http://127.0.0.1:8140/sandbox/index.html   (?p4=1&tick=timer for the headless smoke)
```

**HARD STOP.** Nothing further will be built until the human approves Phase 4 and names the next phase.
