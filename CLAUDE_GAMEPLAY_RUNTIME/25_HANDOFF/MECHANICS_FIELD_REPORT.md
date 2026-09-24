# MECHANICS FIELD — STAGES 1 + 2 REPORT (2026-09-14, DEVELOPMENT, loopback only)

Owner AFK prompts: `C:\Users\jahsu\Downloads\CLAUDE_TWO_CONTINUATION_PROMPTS.md` (CLAUDE 01 bare mechanics field · CLAUDE 02 prove the play loop + character slot). Built on the playable sample of the same day (`PLAYABLE_SAMPLE_REPORT.md`); nothing here supersedes the Phase 5A/5B reports or the OD-29 decision. The local server is NOT running after this session ends — relaunch with the command below.

## EXACT LAUNCH AND LOCAL URL (ONE USER ACTION)

```
cd C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\CLAUDE_GAMEPLAY_RUNTIME
node 26_LOCAL_AUTHORITY\lab_host_server.mjs --dev-hooks
```
The first printed line is `MAHWORLD PLAYABLE SAMPLE … → http://127.0.0.1:<OS-assigned port>/lab/play.html`. Open that URL **with `?field=1`** (for example `http://127.0.0.1:52946/lab/play.html?field=1`). The port is whatever the OS assigned; 8140 is never used. `--memory` gives a throwaway store; without it the store goes to `26_LOCAL_AUTHORITY/DEV_DATA_ONLY` (created on first run; none was created by this work). Second player: `?field=1&account=PLAYER_B`. Optional: `&fx=low` (half-resolution render), `&touch=1` (force the touch layout), `&avatar=EXAMPLE_BROKEN` (demonstrates the visible stand-in fallback).

## SIMPLE CONTROLS (the implemented mapping)

| action | keyboard / mouse | touch |
|---|---|---|
| move (camera-relative; facing follows the heading) | W A S D / arrows · Shift = run (split gait; fused stays a glide) | left stick (outer ring = run) |
| orbit / zoom camera (never changes facing) | left-drag on the view · wheel | one-finger drag on the right half · pinch |
| face the camera direction | F | — |
| attack (selected pattern's basic; VERTICAL_PULL basic is DOWN) | J or left-click | ATTACK |
| pattern slot | 1–4 (5–8 shown as locked fixtures) | tap a slot |
| dash (class burst, ground or air) | Q (+ held move key = direction) | MOD held + swipe on the right half (up / down while flying = ascend / descend) |
| physical / magical guard (toggles) | G / H | GUARD PHYS / GUARD MAGIC |
| take flight / ascend · descend · land | Space · C · V | FLY / LAND |
| fuse / separate (voluntary, paid, non-cancellable) | T | FUSE / SPLIT |
| incoming fixture (dummy attacks you) | I physical · O magic | INCOMING PHYS / INCOMING MAGIC |
| reset practice | R | RESET PRACTICE |
| controls menu | Esc | MENU |

Right-click is not used anywhere. Lost focus, hidden tab or a cancelled touch releases every held key, stick, modifier and drag (`inputs released (…)` in the log).

## WORKING MECHANICS (all through the real host; the view never simulates)

Flat 30 m floor with grid, neutral lights, one practice target (80 HP, respawns 2 s after a knockdown), the stand-in (fused single body / split pair, facing cone visible), HUD with synthetic practice health, Combat MAHGIC, Flight MAHGIC (separate pool), form / mahloco state, guard, dash, action hints. Move / turn / stop with the room integrator's accel 14 / decel 40 m/s² toward the canonical band and eased presentation (host position is the hitbox; the HUD shows host values) · medium follow / orbit camera · ground and air dashes (one combat charge of 8 per accepted dash, flight pool untouched; class profiles Titan 2.0 m/0.45 s … Lean 4.2 m/0.22 s) · take-off / land through dedicated controls with the separate flight pool, 25 % warning and the altitude-aware landing controller (lands under power 0.75 s before empty; zero energy = forced unpowered landing, DEVELOPMENT FALLBACK, inputs locked until touchdown) · fuse / separate as one non-cancellable mahloco transition with one charge at the mahloco commit point; a repeat press answers `TRANSFORM_IN_PROGRESS` · physical basic attacks of the four equipped patterns + the upright-row manifestation (magic): real damage, OUT_OF_RANGE / NOT_FACING misses, cooldown and phases · physical / magical guards against the deterministic incoming fixture (matrix: physical halves physical 8→4; magical dissipates the manifestation 24→0; physical gives no magic immunity 24→24 long range / →18 close range; magical vs physical 8→8) · Reset Practice.

## RESET

`PRACTICE_RESET` (R / button): restores field health, the room target, both energy pools to max, position, facing, ground state; clears dash / guard / emote / running executions; re-selects the first equipped pattern. It never touches saves, receipts, XP, progression or duel sessions (refused with `IN_DUEL` for a fighter). Journaled like every intent; field health and reset count are inside the host fingerprint, so recovery replays it deterministically.

## ACTUAL PLAYTEST RESULT (browser interaction — real input events)

Driver: `26_LOCAL_AUTHORITY/evidence/play/cdp_playtest.mjs` — starts the loopback server in-process (memory store, dev hooks), launches the installed headless Chrome with a DevTools endpoint on a free port, drives the VISIBLE controls with `Input.dispatchKeyEvent` / `dispatchMouseEvent` / `dispatchTouchEvent` (real keyboard, mouse drag, multi-touch under `Emulation.setTouchEmulationEnabled`), reads the HUD state back through the page's read-only `window.MAHWORLD_PLAY` handle, screenshots each step, and writes `transcript.json`. This is browser interaction with the actual build, distinct from the Node suites; viewport / touch are Chrome emulation, not a physical phone.

| run | move / orbit | dashes (m / combat charge) | flight | fuse / separate | attacks | guards vs incoming fixture (health, multiplier) | focus loss · reset · rotation · slot | driver/page errors |
|---|---|---|---|---|---|---|---|---|
| desktop 1600×900, keyboard + mouse, 3 rounds (reset between rounds) + asset-slot switch | moved 3.6 m, settled True; orbit facing unchanged True | ground 3.4 m / -8, 3.4 m / -7.2, 3.36 m / -7.2; air 3.4 m / -6.8 airborne True | landed True (pool 78.4) | FUSED→SPLIT, repeat refused: True | physical 80→72; OUT_OF_RANGE + NOT_FACING refusals logged; magic 72→44 (cost 21.6) | P/P 100→96 ×0.5; P/M ×0.75; M/M ×0; M/P ×1 | inputs released, guard None, mod released True; 3 reset(s) → health 100 / target 80 / pools 100 / XP unchanged; entities after reset 2; slot: EXAMPLE_BROKEN → LOAD_FAILED no released export to load → STAND_IN restored | 0 |
| portrait 390×844 (emulated, touch, DPR 3) + rotate to 844×390 | moved 3.5 m, settled True; orbit facing unchanged True | ground 3.4 m / -8, 3.4 m / -4.8, 3.4 m / -4.4; air 3.4 m / -3.6 airborne True | landed True (pool 73.9) | FUSED→SPLIT, repeat refused: True | physical 80→72; OUT_OF_RANGE + NOT_FACING refusals logged; magic 72→44 (cost 21.2) | P/P 100→96 ×0.5; P/M ×0.75; M/M ×0; M/P ×1 | inputs released, guard None, mod released True; 1 reset(s) → health 100 / target 80 / pools 100 / XP unchanged; entities after reset 2; rotated to 844x390 with no stuck input | 0 |
| landscape 844×390 (emulated, touch), third run after the HUD-transparency fix + rotate to 390×844 | moved 3.15 m, settled True; orbit facing unchanged True | ground 3.4 m / -8, 3.4 m / -4.8, 3.4 m / -4.4; air 3.4 m / -4 airborne True | landed True (pool 73.3) | FUSED→SPLIT, repeat refused: True | physical 80→72; OUT_OF_RANGE + NOT_FACING refusals logged; magic 72→44 (cost 20.8) | P/P 100→96 ×0.5; P/M ×0.75; M/M ×0; M/P ×1 | inputs released, guard None, mod released True; 1 reset(s) → health 100 / target 80 / pools 100 / XP unchanged; entities after reset 2; rotated to 390x844 with no stuck input | 0 |
| tablet 1024×768 (emulated, touch) + rotate | moved 3.49 m, settled True; orbit facing unchanged True | ground 3.4 m / -8, 3.4 m / -4.4, 3.4 m / -4.4; air 3.4 m / -3.6 airborne True | landed True (pool 73.9) | FUSED→SPLIT, repeat refused: True | physical 80→72; OUT_OF_RANGE + NOT_FACING refusals logged; magic 72→44 (cost 21.2) | P/P 100→96 ×0.5; P/M ×0.75; M/M ×0; M/P ×1 | inputs released, guard None, mod released True; 1 reset(s) → health 100 / target 80 / pools 100 / XP unchanged; entities after reset 2; rotated to 768x1024 with no stuck input | 0 |

Artifacts: `26_LOCAL_AUTHORITY/evidence/play/cdp_<layout>/` (`transcript.json`, step screenshots `r<n>_01_field … r<n>_06_reset.png`, `avatar_fallback.png`, `rotated.png`), run logs `cdp_runs.log` / `cdp_runs_touch.log`. Earlier attempts are preserved unchanged: `cdp_first_attempt/` (found: attack hint did not follow the selected pattern after a reset → NO_ATTACK_FOR_INPUT; modifier + swipe blocked by pinch detection on `e.touches`; tablet buttons occluded by the log panel), `cdp_second_attempt/` (driver used the wrong touchEnd semantics; landscape orbit strip under the top HUD), `cdp_third_attempt/` (driver touchCancel), `cdp_landscape_run1/` + `cdp_landscape_run2/` (landscape air-dash swipe not registered twice: while flying, the top status panel grew over the orbit strip and captured the swipe — fixed by making the display-only HUD panels touch-transparent; the third run registered it). Each of those page defects was fixed with the smallest change and re-verified above; the driver defects were driver-only.

**Repeat after two resets (stage-2 requirement):** desktop rounds 2 and 3 reproduce round 1 exactly (same dash distances and charges, same guard multipliers, same reset outcome, entity count stays 2, no stale incoming, no duplicate damage).


## FLIGHT / FORM / ATTACK / GUARD RESULT

See the table above and the Node suite: the low-hover low-energy fixture lands under power (`forced: false`, pool > 0), the high-climb zero-energy fixture forces an unpowered landing with movement refused until touchdown, the pool regenerates afterwards; transforms are single-charge and non-cancellable in both directions; attacks show real damage / misses / cooldown; guards follow the development matrix (no invented parry timing).

## LOADED ASSET OR STAND-IN · RIG / FORM / APPEARANCE STATUS

Loaded: **STAND-IN** (code-generated primitives) in every run. Slot: `lab/AssetSlot.js` (`createCharacterSlot`, `validateManifest`, `MANIFEST_SCHEMA GAME_TEST_EXPORT_MANIFEST_DEV_0.1`), wired into `play.js` (`?avatar=`), documented in `lab/PRESENTATION_ADAPTER_CONTRACT.md` (manifest fields, required vs optional, exact replacement procedure). No released GAME-TEST EXPORT exists anywhere in the project (non-Astra docs searched for the declared name / export folders; Astra's folders were not scanned; no native Blender / Reallusion file was read). The `EXAMPLE_BROKEN` binding proves the visible fallback path (`LOAD_FAILED …`, label suffix, old entities disposed). Native rig / form / appearance / eye-crystal / material checks: **PENDING** until an export is released; nothing was deformed, recolored or promoted.

## FOCUSED TESTS

| suite | result |
|---|---|
| `16_TESTS/gameplay_play_sample.test.mjs` (now includes §14 field: direct open, incoming fixture through the real attack path + guard modifier, one-at-a-time, reset isolation, in-duel refusal, repeat after resets) | 101 passed, 0 failed |
| `16_TESTS/gameplay_asset_slot.test.mjs` (new: manifest validation, unsupported reporting, visible fallback, disposal on switch) | 11 passed, 0 failed |
| `gameplay_phase5a` / `gameplay_od29_disconnect` / `gameplay_phase5b` | 46/46 · 26/26 · 46/46 |
| foundation validator | 118/118 |

Final regression on the final files (all green): `gameplay_play_sample` 101/101 · `gameplay_asset_slot` 11/11 · `gameplay_phase5a` 46/46 · `gameplay_od29_disconnect` 26/26 · `gameplay_phase5b` 46/46 · `gameplay_phase4` 85/85 · `gameplay_phase4_1` 33/33 · `gameplay_runtime` 125/125 · scenarios 7/7 · sandbox 59/59 + 35/35 · foundation validator 118/118. No pre-existing failures observed; no new regressions.

## OD-29 / RECOVERY PRESERVATION

Untouched: deadline clock, `expireSession`, NO_CONTEST / no winner / no reward, duplicate-notice handling, late-reconnect expiry, journaled deadline readings, RECOVERY_HELD_DEV, receipts, deduplication. `DuelHost.js` was not modified in stages 1–2 (hash unchanged from the playable-sample milestone); `Protocol.js` only gained the two field intents. The OD-29 suite and the 5B recovery suite pass unchanged; the play suite's practice-duel disconnect case (10 s → NO_CONTEST, no reward) and the sqlite crash-recovery case still pass with the field records in the journal.

## REMAINING LIMITATIONS

- Stand-in only; no character asset, no final animation; MAHGIC names, guard coefficients, workout multiplier, slot milestones, class reset / specialization, landing-edge policy remain OPEN (ledger block of the same day). The zero-energy forced landing is provisional.
- Touch and viewport evidence come from Chrome emulation on this PC (no physical phone); Chrome headless clamps windows below 512 px, so emulated device metrics were used for the 390 px portrait / landscape runs.
- The practice dummy does not move or chase; incoming attacks are launched on demand (I / O), one at a time.
- Fighters inside a duel keep the instantaneous host integrator; the smooth integrator is room-play only.
- `--dev-hooks` is only needed for the synthetic-workout / slot-fixture / tutorial-reset buttons; the field itself does not need it.

## EXACT CHANGED FILES (stages 1–2; sha256 before → after)

| file | before (end of the playable-sample milestone) | after |
|---|---|---|
| `26_LOCAL_AUTHORITY/play/PlayMode.js` (FIELD room, incoming fixture, practice reset, pattern hints, dummy-position close-range fallback) | `ef8f0db7…` | `da4c4bcf…` |
| `26_LOCAL_AUTHORITY/Protocol.js` (+ `FIELD_INCOMING`, `PRACTICE_RESET`) | `dbbde403…` | `3b7292cf…` |
| `00_CORE/dev_tuning.dev.json` (+ `rooms.FIELD`, `field` block) | `e0e4988c…` | `09ff6dd4…` |
| `26_LOCAL_AUTHORITY/lab/play.js` (field mode, keys R/I/O, focus-loss release, pinch via targetTouches, hint per selected pattern, character slot, debug handle) | `02c0543a…` | `b3183f42…` |
| `26_LOCAL_AUTHORITY/lab/play.html` (field buttons/hint, touch layout fixes, log + HUD panels touch-transparent) | `f805961d…` | `0ba5870d…` |
| `16_TESTS/gameplay_play_sample.test.mjs` (+ §14 field) | `180aba7b…` | `eb08d94c…` |
| `26_LOCAL_AUTHORITY/COMMAND_AUTHORITY_CONTRACT.md` (append-only field addendum) | `a0769fb5…` | `6dfa8788…` |
| `26_LOCAL_AUTHORITY/lab/PRESENTATION_ADAPTER_CONTRACT.md` (append-only slot section) | `6885f701…` | `a6a006c3…` |

Unchanged in stages 1–2 (hash-verified): `DuelHost.js` `423c92f5…`, `lab_host_server.mjs` `585d1c00…`, `DurableStore.js`, `RewardReceipts.js`, `LabClient.js`, `PresentationAdapter.js`, `MahlocoAdapter.js`, `EccentricRuntime.js`, `Resource.js`, `DuelSession.js`, `lab/index.html`, `lab/lab.js`. New: `lab/AssetSlot.js` `d8081541…`, `16_TESTS/gameplay_asset_slot.test.mjs` `7058f6c4…`, `evidence/play/cdp_playtest.mjs` `5d4c8fee…` (driver; last edits after that hash: touch-release semantics — see file), `evidence/play/cdp_*` artifacts, this report. Memory / resume updated. `DEV_DATA_ONLY` still absent. Rollback: restore the eight modified files from the "before" hashes (all edits are additive hook lines, a tuning block, and trailing appends) and delete the new files.

## NEXT BOUNDED STEP

Owner: try the field with the launch command above and read the OPEN items; when a GAME-TEST EXPORT is released (versioned folder + manifest), bind it through `AssetSlot` per the documented procedure. No further engineering work is queued; HARD STOP.
