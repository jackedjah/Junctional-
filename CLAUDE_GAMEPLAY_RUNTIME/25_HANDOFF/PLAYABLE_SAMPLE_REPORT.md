# PLAYABLE LOCAL SAMPLE — REPORT (2026-09-14, DEVELOPMENT, loopback only)

Owner brief: `C:\Users\jahsu\Downloads\CLAUDE_PLAYABLE_GAMEPLAY_CONTINUATION.md` (decisions 1–16). Sits beside the Phase 5A/5B reports; nothing here supersedes them. HARD STOP after this report.

## What was delivered (prepared → executed → tested → visually reviewed)

| layer | status |
|---|---|
| Host delta `26_LOCAL_AUTHORITY/play/PlayMode.js` (rooms, tutorial, quest, aim, guards, dashes, separate flight pool + landing controller, skills + synthetic MAHFITT adapter, presence/emote, pre-fight loadout, dev fixtures) | executed + tested (88/88) |
| DuelHost / Protocol / server hooks (delegation, aim + guard hooks, PRACTICE_DUEL, LEAVE_ARENA, PLAY_DEV journal + replay, `/vendor/three/` read-only mount, `/api/dev/play`) | executed + tested; 5A 46/46 · OD-29 26/26 · 5B 46/46 unchanged |
| Play view `lab/play.html` + `lab/play.js` + `lab/PresentationAdapter.js` (three.js stand-in, orbit camera, keyboard + multi-touch modifier+swipe, responsive HUD, dev panel) | executed; visually reviewed in headless Chrome (WebGL via SwiftShader) — see evidence table |
| Two-client page `lab/play_two.html` (PLAYER_A + PLAYER_B play views + state-only SPECTATOR_1) | executed; visually reviewed |
| Adapter contract `lab/PRESENTATION_ADAPTER_CONTRACT.md` | prepared (contract + stand-in implementation; no reviewed asset mounted) |
| Ledger compact OPEN block; command-contract addendum | prepared |

## PLAYABLE LOOP

Training room (tutorial: move → fly + land → hit the sample monster; event-driven, door unlocks) → plaza (guided quest offered: 3 pattern hits [SPORT_ACTIVITY] + unfuse and reach the far marker [ABILITY_JOURNEY]; character XP through one idempotent QUEST receipt; next unguided quest offered from data) → practice duel vs SPARRING_BOT (facing aim, guards, dashes, no flight) or a two-client duel (PLAYER_A vs PLAYER_B with a spectator) → LEAVE_ARENA back to the plaza.

## EXACT LAUNCH (ONE USER ACTION)

```
cd C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\CLAUDE_GAMEPLAY_RUNTIME
node 26_LOCAL_AUTHORITY\lab_host_server.mjs --dev-hooks
```
The server prints `MAHWORLD PLAYABLE SAMPLE … → http://127.0.0.1:<OS-assigned port>/lab/play.html` — open that exact URL (port is never guessed; 8140 is untouched). `?account=PLAYER_B` for the second player in a second tab; `/lab/play_two.html` shows both plus the spectator. Without `--dev-hooks` everything plays except the synthetic-workout / slot-fixture / tutorial-reset buttons. The default persistent store is `26_LOCAL_AUTHORITY/DEV_DATA_ONLY` (created on first run; `--memory` for a throwaway session).

## CONTROLS

Desktop: WASD / arrows move (camera-relative; facing follows the movement heading) · Shift run (split gait; in fused form the move stays a glide — no implicit transform) · mouse drag / wheel orbit + zoom (never changes facing) · F face the camera direction · J / click attack · 1–8 pattern slot · Q dash · G physical guard · H magical guard · T transform (voluntary, paid, non-cancellable) · Space take flight / ascend · C descend · V land · X wave · E interact (door / quest / practice duel prompt) · P practice duel · K concede · L leave arena · Esc controls menu.
Touch (portrait / landscape / tablet): left stick move (outer ring = run) · right-half drag orbit, pinch zoom · MOD held + swipe = dash in the swipe direction (while flying: up/down swipe = ascend/descend) · buttons ATTACK / GUARD PHYS / GUARD MAGIC / FLY-LAND / FUSE-SPLIT / MOD / INTERACT / WAVE / MENU.

## OWNER RULES IMPLEMENTED (as development scaffolding)

1 tutorial room → plaza → guided quest → practice/duel · 2 real-time third-person combat on the existing host · 3 facing-based aim (cone 60°, contact 3.5 m, ranged 12 m; no snap; PvP and PvE) · 4 physical / magical guards (matrix in tuning) and class-tuned dashes (Titan weakest/slowest … Lean strongest/fastest; airborne dash = no ground effect) · 5 separate Combat / Flight pools (second `createResource` instance), no flight in active PvP, PvE takeoff interrupts the active attack · 6 skill XP ≠ character XP; synthetic idempotent MAHFITT adapter (receipt `WORKOUT_SKILL|event_id|account|rule`, ×3 labelled example) · 7 class change / specialization untouched (OPEN) · 8 responsive HUD (4 layouts) · 9 orbit camera · 10 multi-touch modifier + swipe · 11 four equipped patterns, UI capable of eight (fixtures display-only) · 12 smooth accel / decel (room integrator 14 / 40 m/s² toward the canonical band; view eases presentation) · 13 voluntary fuse / separate with the existing mahloco cost (unfuse 35 / refuse 5 from the combat pool) · 14 transforms non-cancellable (`TRANSFORM_IN_PROGRESS`) · 15 25 % flight warning + ground-relative low-energy landing controller (descent = height ÷ remaining powered seconds, capped 6 m/s, lands 0.75 s before empty) · 16 zero-energy forced unpowered landing = DEVELOPMENT FALLBACK (logged as such; inputs locked until touchdown).

## DEVELOPMENT ASSUMPTIONS (all in `dev_tuning.dev.json → local_authority.play`, `PLAY_DEV_0.1.0`)

Room sizes / spawns / target health / respawn; aim cone and ranges; guard multipliers (0.5 physical-vs-physical, 1.0 no magic immunity, DISSIPATE for the eligible manifestation, ×0.75 close-range magic < 3 m); dash cost 8 + five class profiles; flight pool = same numbers as the resource block; skill XP 5 per hit, 5 per workout unit × 3; loadout 4 equipped / 8 UI / fixtures {4,6,8}; duel start positions ±1.5 m; WAVE emote cooldown 1 s. "Flight cancels fighting in PvE" was interpreted as: taking flight interrupts the active attack, and no attacks / guards / transforms while airborne. RUN in fused form is downgraded to a glide and DASH in split form is a play-only burst so mahloco never chains an implicit paid transform (mahloco is untouched).

## OPEN CHOICES (ledger block "OPEN 2026-09-14 · PLAYABLE LOCAL SAMPLE")

workout multiplier (3–5) · slot unlock milestones · level-24 specialization vs reset · parry / guard windows and coefficients · PvE airborne policy · mid-fight loadout editing · transformation cost reference (5–10 % of a major attack) and pool · MAHGIC pool names · zero-energy edge policy · skill → stat conversion and the class-magic family · OD-02 (code-vs-ledger policy A discrepancy still untouched) · OD-21 · OD-29 host failure / quitting / abuse / penalties / participation rewards. None resolved here.

## CHARACTER ADAPTER

`lab/PresentationAdapter.js` exports `PRESENTATION_CONTRACT` (`PRESENT_DEV_0.1.0`) and the stand-in implementation (`mount / update / remove / dispose`). Contract text: `lab/PRESENTATION_ADAPTER_CONTRACT.md` — metres, +Y up, yaw about +Y (0 = −Z), FUSED 1.8 m / SPLIT 1.4 m ×2 at ±0.35 m, required clips (IDLE … KO), optional clips, sockets (ROOT/HEAD/CHEST/HAND_L/HAND_R/FEET), adapter ownership + disposal, mandatory stand-in fallback, "never simulate / never change facing from the camera". A reviewed asset mounts by implementing the same surface and switching one import; no host / protocol / tuning / test change. No Astra asset, GLB, or animation was read or mounted; the server exposes only `three.module.min.js` + `three.core.min.js` read-only from the vendored three.js 0.185.1.

## FOCUSED TESTS

| suite | result |
|---|---|
| `16_TESTS/gameplay_play_sample.test.mjs` (new) | 88 passed, 0 failed |
| `gameplay_phase5a` / `gameplay_od29_disconnect` / `gameplay_phase5b` (call sites touched) | 46/46 · 26/26 · 46/46 |
| `gameplay_phase4` / `gameplay_phase4_1` / `gameplay_runtime` / scenarios | 85/85 · 33/33 · 125/125 · 7/7 |
| sandbox `sandbox.test.mjs` / `sandbox_phase4.test.mjs` (not touched) | 59/59 · 35/35 |
| foundation validator `gameplay_validate.mjs` | 118/118 |

No pre-existing failures were observed in this run; no new regressions.

## OD-29 / RECOVERY / NO-REWARD PRESERVATION

Untouched code paths: deadline clock, `expireSession`, NO_CONTEST, RECOVERY_HELD_DEV, receipts. New tests: a `PRACTICE_DUEL` disconnect on a fake clock pauses, stays held at 9.9 s and ends NO_CONTEST with no winner and no reward at 10 s; sqlite crash + `recover()` replays the play journal (CMD, TICK, PLAY_DEV) with zero fingerprint inconsistencies (play state is inside the fingerprint), restores quest / workout receipts without re-awarding (character XP identical, `applied` 0, `restored` ≥ 2), and holds the host. `PRACTICE_DUEL` adds the bot with `skipJournal` so the replayed CMD recreates it exactly once. Journal replay never reads a fresh clock (unchanged).

## EXACT CHANGED FILES (sha256 before → after)

| file | before | after |
|---|---|---|
| `26_LOCAL_AUTHORITY/DuelHost.js` | `ac73d939…` | `423c92f5…` |
| `26_LOCAL_AUTHORITY/Protocol.js` | `c699889c…` | `dbbde403…` |
| `26_LOCAL_AUTHORITY/lab_host_server.mjs` | `2cce781f…` | `585d1c00…` (final; includes the evidence-hold cap 180 s) |
| `00_CORE/dev_tuning.dev.json` (added `local_authority.play`) | `8dd20cf4…` | `e0e4988c…` |
| `CLAUDE_GAMEPLAY_FOUNDATION/15_OPEN_DECISIONS/GAMEPLAY_OPEN_DECISIONS.md` (append-only OPEN block) | `ef0a0d70…` | `764b9580…` |
| `26_LOCAL_AUTHORITY/COMMAND_AUTHORITY_CONTRACT.md` (append-only addendum) | — (not hashed before) | `a0769fb5…` |

New: `26_LOCAL_AUTHORITY/play/PlayMode.js` `ef8f0db7…` · `lab/play.html` `f805961d…` · `lab/play.js` `02c0543a…` · `lab/PresentationAdapter.js` `a478ae6d…` · `lab/play_two.html` `c7bf5308…` · `lab/PRESENTATION_ADAPTER_CONTRACT.md` `6885f701…` · `16_TESTS/gameplay_play_sample.test.mjs` `180aba7b…` · `26_LOCAL_AUTHORITY/evidence/play/*` · this report. Untouched (hash-verified): `lab/index.html`, `lab/lab.js`, `LabClient.js`, `DurableStore.js`, `RewardReceipts.js`, `MahlocoAdapter.js`, `EccentricRuntime.js`, `Resource.js`, `DuelSession.js`. `DEV_DATA_ONLY` was not created (all evidence servers ran `--memory`). Rollback: delete the new files, restore the six modified files from the "before" hashes (the DuelHost / Protocol / server edits are the labelled hook lines; the tuning edit is the added `play` block; ledger and contract edits are trailing appends).

## LIMITATIONS

- The stand-in is primitives; no final character, animation, or art direction is claimed. The HUD labels "Combat / Flight MAHGIC" are temporary.
- Headless evidence viewports differ from the requested window sizes (Chrome headless enforces a minimum width; the portrait run rendered at 512×746 CSS px, which still triggers the portrait layout). Touch controls were exercised by the scripted sequence through the same intents, not by synthetic touch events; the modifier + swipe gesture is implemented but was reviewed only on desktop pointer events in this run.
- The practice bot walks nowhere (existing DuelBot); a player must approach it. Duel start positions apply only when a fighter is a room player.
- The room integrator (smooth accel / decel) is play-only; fighters inside a duel keep the existing instantaneous host integrator (BAND_MIN_SPEED_DEV) and the view eases their presentation.
- `RUN` requests in fused form are downgraded instead of transforming; a player unfuses voluntarily to run. Ground dash in split form does not enter a mahloco DASH state.
- Presence is one room per host; spectator camera remains metadata-only. No networking beyond loopback, no commerce, no cosmetics, no production mounting.

## EVIDENCE (browser, responsive, two clients)

Headless Chrome (existing install), WebGL through SwiftShader, one server per run (`--memory --dev-hooks --exit-after`), OS-assigned ports; the scripted `?auto=` playthrough sends the same intents a player sends and logs `MAHWORLD_PLAY_STAGE` / `MAHWORLD_PLAY_RESULT`. Files: `26_LOCAL_AUTHORITY/evidence/play/` (`*_chrome.log` console, `*_server.log`, `*.png`). Two earlier attempts are preserved in `superseded_first_attempt/` and `superseded_second_attempt/` (layout overlap fixes and a run cut short by the hold cap; nothing overwritten).

| capture | viewport (CSS px, reported by the page) | scripted stage reached | what the image shows |
|---|---|---|---|
| `portrait_phone_training.png` (touch) | 512×812 (Chrome headless clamps narrower windows; portrait layout ≤ 520 px active) | TUTORIAL_COMPLETE — move ✓ fly+land ✓ attack ✓ | training room, stand-in beside the sample monster, stacked HUD, stick + touch buttons |
| `landscape_phone_plaza.png` (touch) | 822×292 | PLAZA_QUEST_IN_PROGRESS — 3/3 hits | plaza, guided quest panel, far marker, compact landscape HUD, PRACTICE DUEL prompt |
| `tablet_duel.png` (touch) | 1002×670 | DUEL_RESULT (practice duel reached ACTIVE at 42 s: health A 58 / bot 92 in the log; the bot won before the 47 s capture) | post-duel plaza with RESULT banner; the ACTIVE-duel frame is `superseded_first_attempt/tablet_duel.png` (health 26/100, bot strike visible) |
| `desktop_full.png` (mouse/keyboard) | 1578×802 | full loop: tutorial 12 s → plaza 22 s → quest complete 37 s (+20 XP, unfused, far marker) → practice duel 42 s → result 58 s → LEAVE_ARENA ✓ | plaza after the loop, split form, unguided next quest offered, controls hint panel |
| `two_clients_spectator.png` | 783×691 per client | PLAYER_A + PLAYER_B both through the tutorial into the plaza, JOIN_DUEL → MATCH_1 ACTIVE (health 100 / 92), B in MAGICAL guard, SPECTATOR_1 SPECTATE accepted (spectators 1, camera FOLLOW_BOTH) | two live play views on one host plus the state-only spectator line |

Console errors in all five captures: 0. Full-run RESULT line (desktop): `tutorial_complete true · quest_hits 3 · unfuse accepted · marker true · quest_done [Q_FIRST_GUIDED_PLAZA] · character_xp 20 · dash 3.4m/0.28s · practice MATCH_1 · flight_in_pvp NO_FLIGHT_IN_PVP · guard true · duel_attack ATHLETE_HORIZONTAL_PUSH_BASIC · result SPARRING_BOT · leave_arena true`.

**Visually reviewed by me (screenshots read back):** room geometry, stand-in forms (fused single body vs split pair), guard ring, flight glow, attack flash, HUD panels in all four layouts, two-client page. **Not exercised in this milestone:** real touch gestures (the touch layout was rendered and its buttons exist; the scripted run drove intents, not synthetic touches) — covered by the following stage's browser-interaction driver.
