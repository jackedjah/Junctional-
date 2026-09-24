# MAHWORLD GAMEPLAY PHASE 4.1 — ISOLATED REPLAY REPAIR + REPEATABLE GAMEPLAY TESTING
2026-09-14 · Claude (engineering lane) · focused repair on top of the acknowledged Phase 4 checkpoint · **STOP after this report — no further phase started**

| field | value |
|---|---|
| REPLAY STATUS | **REPAIRED — isolated.** Replay now runs in a separate development simulation built from the same runtime composition; the live session is never touched. Supported recordings replay MATCHED, twice, in node and in the browser sandbox. |
| LIVE SESSION UNCHANGED | **Yes**, test-asserted: live XP / level / stats, MAHGIC, form, mahloco state, position, mentor progress, duel session, bot decisions and input-handler counts are identical before and after replays (node + sandbox). |
| PERSISTENT SAVES UNCHANGED | **Yes**: the isolated simulation uses a memory store; live storage keys stay empty / unchanged through every replay (test-asserted). |
| DETERMINISM TEST | **PASS**: same record → MATCHED on two consecutive replays with identical simulated final checkpoints; seeded bot state sequence identical; eccentric tick count identical; replay still MATCHED after the live world moved on. |
| BROWSER TEST | **PASS (headless Chrome, virtual time, `?p41=1&tick=timer`)**: `MAHWORLD_SANDBOX_P41 {"record":{"kind":"FRESH_BASELINE"},"recorded":{"ticks":669,"inputs":5,"setup":1,"events":54},"replay":{"status":"FINISHED","matched":true,"ticks":669,"first_divergence":null},"live_unchanged":true,"status_text":"REPLAY FINISHED · MATCHED · 669 ticks / 11.17 s · SIMULATED xp 0 level 1"}` — `CLAUDE_GAMEPLAY_SANDBOX/evidence/chrome_phase4_1_smoke.log`, `phase4_1_replay_smoke.png`. Single light run; no parallel browser jobs. |
| NEW REGRESSIONS | **None** (totals below are fresh runs from this session). |
| BLENDER / ASTRA / CODEX | No Blender launched (0 Blender processes at the end of the work; none started by me). Protected hash set: 63 files, `MUTATION: false`. `.codex` untouched. |

## REPLAY BEHAVIOUR — BEFORE / AFTER
| | Phase 4 (before) | Phase 4.1 (after) |
|---|---|---|
| where inputs are re-issued | into the **live** world (sandbox) or a caller-built fresh world (node) | into an **isolated simulation**: `createSimulation(record)` forks the same composition — node: a fresh scenario harness; sandbox: `rt.fork()` + a second `createSandboxWorld` with a private scene / ui / memory store, no window |
| starting conditions | not reproduced (live state, whatever it was) | recorded start check: **FRESH_BASELINE** only (activity tracker from boot + snapshot vs `BASELINE`); idle time before RECORD re-run at a fixed 0.02 s step; everything else **UNSUPPORTED_LIVE_STATE → REJECTED** with the reason |
| timing | replay stepped at a fixed 0.02 s while live used frame dts | the exact per-tick dt list is recorded and replayed; ordered actions carry their tick index and emission sequence |
| setup actions (bot duel, teleport, dash, demo …) | not captured | captured as `SETUP_ACTION` bus events; nested ones (caused by an input handler) are marked and skipped, independent ones re-issued in order |
| side effects | live MAHGIC / XP / bot / handlers ran again | zero live effects; damage / rewards are computed only inside the simulation and labelled **SIMULATED** |
| result | divergence count only | MATCHED / DIVERGED with first divergent tick + simulation time, responsible action, expected-vs-actual fields (checkpoints) and first key-event mismatch |
| cleanup | live playback state left in the panel | `stop()` / finish destroy the simulation; no timers anywhere (asserted); repeated start/stop leaves live handlers single-subscribed (asserted) |

## SUPPORTED / UNSUPPORTED RECORDING START STATES
- **Supported:** RECORD pressed while the world is still at the fresh baseline since boot (FUSED_IDLE, full MAHGIC, level 1 / xp 0, no pattern, grounded, no activity events yet). Idle time before RECORD is allowed and re-run. Sandbox status line shows `baseline (recordable)`.
- **Unsupported (reported, never substituted):** any recording started after gameplay activity (inputs, transforms, duels, attacks, XP, flight, interactions, profile LOAD, buffs) — `UNSUPPORTED_LIVE_STATE` with the first activity named; records containing LOAD / RESET setup actions; records whose format version, character / class / sex, dev-tuning version, defaults classification or pattern loadout differ from the simulation; records with no ticks. Mahloco, resource cooldowns and kit state have no supported serialisation, so mid-session starts are refused rather than faked.
- **Not captured (documented):** spectator-panel buttons (ADD / REMOVE / CALL NEXT / OFFER / ACCEPT / DECLINE) and the pattern-list clicks are outside the setup-action stream (pattern clicks are inputs and are captured); the live frame dts *before* RECORD are not stored (fixed-step warm-up instead).

## GAME RULES PRESERVED
mahloco transformation state machine and MIN_DWELL untouched — the 4.1 suite records a t=0 transform refused with `MIN_DWELL` and replays the refusal and the later accepted transform identically; canonical movement defaults, resource / cooldown rules, concentric / eccentric phases, duel / spectator / Call Next behaviour and EXPERIMENTAL policy labels unchanged (no file in those systems edited). No targeting, balance, loadout, touch or queue decision was finalised.

## EXACT FILES CHANGED
New: `CLAUDE_GAMEPLAY_RUNTIME\23_REPLAY\IsolatedReplay.js`, `CLAUDE_GAMEPLAY_RUNTIME\16_TESTS\gameplay_phase4_1.test.mjs`, `CLAUDE_GAMEPLAY_SANDBOX\evidence\chrome_phase4_1_smoke.log`, `evidence\phase4_1_replay_smoke.png`, this report.

| modified file | before sha256 | after sha256 | change |
|---|---|---|---|
| `CLAUDE_GAMEPLAY_RUNTIME\06_INPUT\InputActions.js` | `468fe3b794321c610b4bac18418aa627ff0306be6fd0e394fcecc43ab32be67f` | `516f149d1b8ce5be323845a1b421b285d279c46e518cb5dc806acac5c34a54d2` | `dispatch` emits `INPUT_ACTION_DONE` after handlers (lets the recorder mark nested setup actions) |
| `CLAUDE_GAMEPLAY_RUNTIME\23_REPLAY\SessionRecorder.js` | `ab4387758c43c58b131d7a9137669a2d34dc775e854008ba0b99560f3aa60f78` | `70072b88423aab7ff4b21569ac675ef1f9b1a748a8e7d82062fcf06259df881a` | rewritten to format 1.1.0 (runtime ids, start state, ticks, seq-ordered inputs / setup, checkpoints, event signatures); old live-world `replaySession` / `compareRecords` removed |
| `CLAUDE_GAMEPLAY_RUNTIME\24_TEST_SCENARIOS\scenarioHarness.js` | `8b72cb0db8a0a457ceecdc63d2043b4a42ee49477493a61daecf64389e61c103` | `5bee11a30573dd1d72bacc94f7cdbb3a134a3a5d5ab682c8133dcaba8e6f3dac` | emits SETUP_ACTION for START_DUEL / TELEPORT, checkpoint extras, `createHarnessSimulation` |
| `CLAUDE_GAMEPLAY_RUNTIME\16_TESTS\gameplay_phase4.test.mjs` | `0e134ba05bb08f06bb9da64cca26bebb61779e2cd2db997574ba88b507df796f` | `73952893e2d48ca26a36d4ce59973479e7a2fa5a5658ad13d9ebc759cfd42dbb` | replay block moved to the isolated API (same count: 85) |
| `CLAUDE_GAMEPLAY_SANDBOX\02_INPUT\DesktopInput.js` | `0cf1787282c0174eb529e2ebd31416aac8855cdf95b29e49f4fb1c304faf0c11` | `5bc2b40d2be19855418cf39c6525a75d61b3d4987c71bac7bb073a1f11e074f4` | MOVE applied through the authoritative MOVE handler (so replayed MOVE moves the avatar); DASH announced as a setup action |
| `CLAUDE_GAMEPLAY_SANDBOX\00_RUNTIME\sandboxRuntime.js` | `3399c60ae0f44cfcfcd47088720745fc6366ae09743aad3d9cb21032b8fa4bfe` | `ebef41ba2c2e279f84edac7377886f8e95963651e8fe0db34fce87431669f8f0` | `fork()` (fresh world from the same composition), Phase 4.1 modules exposed |
| `CLAUDE_GAMEPLAY_SANDBOX\00_RUNTIME\sandboxWorld.js` | `64fa6f1e346a59631ce5cf4122499a41537df9408b7c99c27d84473b87bc7f88` | `7fce9b07d80ba4631e0c0ef90666a68cb60fda3350936f83296425864b6c0298` | setup acts announced on the bus, Phase 3 buttons routed through `act()`, isolated simulation factory, `phase4.destroy()` on destroy |
| `CLAUDE_GAMEPLAY_SANDBOX\13_PHASE4\Phase4Panel.js` | `b5386e8b2f2850b7b684a90ff87e0968c6ad915786b0fa11ba01f3c83e0aa093` | `d94b1bc3d01ef7edd42c2edcb232ed1a62c585449e44b807e409ecc602f03497` | live-world playback replaced by the isolated replay; LIVE SESSION / ISOLATED REPLAY / FINISHED · MATCHED / DIVERGED status; STOP cleans up; recorder samples after the full tick |
| `CLAUDE_GAMEPLAY_SANDBOX\11_TESTS\sandbox_phase4.test.mjs` | `948acf6eb7ab68f149f7e1027842786bd0d181eb9d8ec13c9b44645c82d5d681` | `dac08953772298c0e78ac74531447a93b45e0620edb851e10103391c8e0923f5` | replay block rewritten for the isolated API (23 → 35 checks) |
| `CLAUDE_GAMEPLAY_SANDBOX\sandbox.js` | `70d98b0d7f21bd1526b16b557664ea5c29b08fa8566edb007312154e0b7a3443` | `bb602a7fc188c21df46d41708e3fdcf15eea12b1fc5317e3cba384745961ba17` | `?p41=1` headless smoke hook |
| `CLAUDE_GAMEPLAY_SANDBOX\13_PHASE4\PHASE_4_SANDBOX_NOTES.md` | `322fd1a9ab8576601ef6d9c73fc0b2d2786bbb1b2df5cfa109505ba9fa18d34e` | `8708437e037d6511ade02d0780df2f82815b9f00b027b3b908fefa1ea69cc402` | replay row + evidence line updated |

Not changed: `index.html` (existing buttons reused), the Phase 4 report and module guide (its `23_REPLAY` row is superseded by this report), all Phase 2 gameplay systems, mahloco, runtime foundation, mrmah3d, Astra / RAW / WORKING trees, `.codex`.

## TEST RESULTS (fresh runs, this session)
| suite | result |
|---|---|
| `CLAUDE_GAMEPLAY_RUNTIME/16_TESTS/gameplay_phase4_1.test.mjs` (new) | **33 / 33** — supported record; MATCHED twice; live untouched; replay after live change; MIN_DWELL reproduced; unsupported start / wrong format / runtime mismatch / unsupported setup rejected; tampered record DIVERGED with first difference; 5 start/stop cycles leave live handlers single-subscribed; no timers |
| `gameplay_phase4.test.mjs` | **85 / 85** |
| `gameplay_runtime.test.mjs` (Phase 2) | **125 / 125** |
| `24_TEST_SCENARIOS/run_scenarios.mjs` | **7 / 7** |
| `CLAUDE_GAMEPLAY_SANDBOX/11_TESTS/sandbox_phase4.test.mjs` | **35 / 35** (was 23) |
| `sandbox.test.mjs` (Phase 3) | **59 / 59** |
| headless Chrome `?p41=1&tick=timer` | MATCHED, live_unchanged true (see BROWSER TEST) |
| pre-existing, unrelated, unchanged | mrmah3d `tests/mrmah3d.test.js` 378 / 379, `mrsmah.test.mjs` 13 / 30, `mrmah3d-r111` anatomy assertion |

A passing scripted replay proves reproducibility of the recorded development session only. It is not evidence of gameplay balance or production readiness.

## REMAINING LIMITATIONS
1. Only baseline-start recordings are reproducible; mid-session starts are refused (no supported serialisation of mahloco / cooldown / kit internals — none was invented).
2. Idle warm-up before RECORD is re-run at a fixed 0.02 s step; the live frame dts before RECORD are not stored. Idle systems are time-threshold based, so this has not produced a divergence, but it is an approximation.
3. Spectator-panel buttons are not captured as setup actions; a session using them will DIVERGE honestly.
4. The sandbox replay runs a few recorded ticks per live frame (4); a long recording takes a proportionally long time to finish.
5. Provenance gap carried from Phase 4: no captured pre-edit hash for `00_CORE/dev_tuning.dev.json` (unchanged in 4.1).

## SANDBOX INSTRUCTIONS
```
cd CLAUDE_GAMEPLAY_SANDBOX && python serve_sandbox.py     →  http://127.0.0.1:8140/sandbox/index.html
```
Right after boot the Phase 4 panel shows `LIVE SESSION · idle · baseline (recordable)`. Press **RECORD SESSION** first, then play (F transform, WASD move, BOT DUEL, attacks …), then **STOP**. **REPLAY SESSION** starts the isolated replay; the status line reads `ISOLATED REPLAY running · tick k/N`, then `REPLAY FINISHED · MATCHED …` or `REPLAY FINISHED · DIVERGED at t … (tick k) after <action> · <field>: expected … vs actual …`. STOP during a replay stops and destroys it. A recording started after any play shows `start UNSUPPORTED_LIVE_STATE` and its replay is `REJECTED — START_STATE_UNSUPPORTED …`. Headless proof: `?p41=1&tick=timer`.

## ROLLBACK
Delete `23_REPLAY/IsolatedReplay.js`, `16_TESTS/gameplay_phase4_1.test.mjs` and the two `evidence/*phase4_1*` files; restore the eleven modified files to their "before" hashes above (InputActions: remove the `INPUT_ACTION_DONE` emit; SessionRecorder: previous 1.0.0 file; DesktopInput: restore the direct `movement.setInput` in `vec()` and remove the MOVE handler + DASH emit; sandboxRuntime: remove `fork()` / IR2 imports; sandboxWorld: remove SETUP_ACTS / createSimulation / act routing; Phase4Panel: previous file; sandbox.js: remove the `?p41` block; tests and notes: previous files). The Phase 4 suites then return to their Phase 4 shape (85 / 23).

## RESUME STATE
PHASE 4: DEVELOPMENT CHECKPOINT ACKNOWLEDGED · PHASE 4.1: DELIVERED (this report) · NEXT PHASE: NOT AUTHORIZED · WAITING FOR: gameplay decision answers or a specific approved task.
