# PLAYABILITY, LOCK-ON, COLLISION AND PRESENTATION PASS — REPORT (2026-09-14, DEVELOPMENT, loopback only)

Owner brief: "CONTINUE — MAHWORLD PLAYABILITY, LOCK-ON, COLLISION AND PRESENTATION PASS". Scope kept: no combat-engine rebuild, no class-balance change, no Astra asset / .blend touched, no networking, no production mounting. Everything below is a DEVELOPMENT build of the existing local-authority sample.

## FIELD URL / LAUNCHER

- Launcher: `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\START_MAHWORLD_RULES_17_23.cmd` (double-click). It runs `node 26_LOCAL_AUTHORITY\lab_host_server.mjs --memory --dev-hooks --field --open`, prints the run's address and opens the default browser at it. The port is OS-assigned every run (never 8140); nothing else is started or stopped; the store is a throwaway memory store (no RECOVERY_HELD on relaunch).
- Printed line (smoke test this pass, no browser opened): `MAHWORLD PLAYABLE SAMPLE (development only, loopback) → http://127.0.0.1:64650/lab/play.html?field=1`.
- Manual alternative: `cd CLAUDE_GAMEPLAY_RUNTIME && node 26_LOCAL_AUTHORITY\lab_host_server.mjs --memory --dev-hooks --field` then open the printed URL. `?dev=1` starts with developer info visible; `?touch=1` forces the touch layout; `?account=PLAYER_B` is the second fixture account.

## CAMERA-RELATIVE MOVEMENT

Previous defect (owner observation): the input math assumed a camera forward with the wrong sign on x, so W/A/S/D drifted relative to the screen at most camera angles. Fix in `lab/play.js` → `cameraBasis()` takes the flattened `camera.getWorldDirection()` as forward and `(−f.z, f.x)` as right; `moveVectorFromInput(ix, iz)` = `iz·forward + ix·right`, normalised (diagonals are never faster: `moveVector(1,1)` length = 1.000), and the WORLD vector goes to the host as the existing `MOVE {forward (world −z), strafe (world +x), run, yaw}` intent. Movement stays camera-relative while locked; facing follows the movement heading except during a locked wind-up. Journaled as before (every MOVE is a CMD record).

Evidence (browser, real key / stick events, host positions read back): camera yaw 0 / 90 / 180 / 270°, keys W, D and A+W each: alignment of the measured world displacement with the camera vector = 1.000 (0.999 once) on desktop, portrait and landscape; `all_ok: true` in every transcript (`evidence/play/pass3_*/transcript.json` step "camera-relative movement").

## CLICK/TAP LOCK AND FOUR-ARROW MARKER

- Client: a click (mouse press/release within 8 px, < 2 s) or a tap (< 8 px, < 350 ms, on the canvas or the touch orbit strip) raycasts the adapter's entity roots; a hit on a combatant sends only `LOCK_TARGET {aim_id}`. Drags never lock. A tap on empty ground performs the selected move (same as J / ATTACK).
- Host (`RulesField.lock`): validates exists / alive / same field / hostile / ≤ 30 m acquisition / line of sight against the authoritative colliders; refusals `NO_SUCH_TARGET · TARGET_DOWN · NOT_HOSTILE · TARGET_NOT_VISIBLE · TOO_FAR · NO_LINE_OF_SIGHT`. Duplicate lock returns `duplicate: true` with the original `since_t` (no timer restart). `maintainLock` clears on KO (either side), removal, match change, hostility change, > 34 m for 2 s, LOS lost for 1.5 s, or an explicit `LOCK_TARGET {aim_id: null}` (Esc / UNLOCK). No auto-jump to another target on defeat; allies are refused (`NOT_HOSTILE`) — support moves aim allies through the existing support aim.
- Marker: `PresentationAdapter` kind `LOCK_MARKER` — four inward-pointing corner arrows (gold fill, dark outline, billboarded), one acquire pulse (0.35 s), follows the target's smoothed render position (no shaking), fades to 25 % while the host reports `lock.visible = false`, removed the frame the host clears the lock. It is mounted only from the snapshot's `rules.me.lock` — never from the click. Top-centre panel shows the locked name, class and health; cover / range grace is spelled out.
- Evidence: lock after a 70 px drag = null; click → host lock `{target: FIELD_DUMMY, visible: true}` → marker mounted (opacity 1) → panel "LOCKED: FIELD_DUMMY (ATHLETE) 1000 / 1000"; second click → `since_t` unchanged; Esc / UNLOCK → lock null, marker removed. Behind PILLAR_SE: host refused `NO_LINE_OF_SIGHT {blocker: PILLAR_SE}` and the HUD showed "LOCK REFUSED: no line of sight" (screenshots `p1_02_locked.png`, `p1_03_los_refused.png`).

## LOCKED VS UNLOCKED AIM

Unlocked: the selected move commits along the current facing (unchanged rules). Locked: during STARTUP only, the host turns the attacker toward the target at `lock.turn_rate_deg_s` = 540°/s (`_runtime_mapping.lock`, development tunable); the commit uses the facing at commit, so there is no homing, no range extension (lock at 8.5 m: dummy HP unchanged), no wall pass (melee needs LOS; projectiles impact walls `R1723_PROJECTILE_WALL`), and no category change. Projectiles are aimed at the target's position at release and keep a fixed heading.

Evidence (practice damage on): unlocked 90° off → miss (916 → 916); locked 90° off → facing turned 1.571 → 0.628 during the 0.2 s wind-up and the strike landed (916 → 832); locked 180° off → only 1.26 rad turned in the wind-up (rate-limited) → miss (832 → 832). A real test defect was found and fixed: the earlier lock-turn assertion in `gameplay_rules_17_23.test.mjs` read the last damage record of the whole log (vacuous); it now asserts the 90° hit and the 180° rate-limited miss explicitly.

## FREE-ROAM ATTACK RESULT

Combat context is recorded at commit (`FREE · PRACTICE · MATCH`) and revalidated at every impact / tick (`contextValid`): outside a practice battle or match the full cast runs (phases, projectile, impact visual, sound) and the host records `R1723_HARMLESS` — zero damage, status, knockback, self-KO (Last Pulse) or reward; the target only gets a `last_touch_t` for the flinch. Banner: **FREE ROAM — ATTACKS ARE HARMLESS** / **PRACTICE BATTLE — DAMAGE ON THE DUMMY** / **MAH MATCH — DAMAGE ACTIVE**. The explicit **PRACTICE BATTLE** button (`FIELD_PRACTICE {on}`) enables damage on the dummy / practice ally only; BAGE outside-match healing is unchanged. Evidence: free-roam strike → IMPACT entity `{harmless: true}`, dummy 1000 → 1000, `last_touch_ago_s` set; after the button → banner switched and the same strike did 84 (1000 → 916).

## FLIGHT BUTTON

Permanent **FLY [F]** button in the action row (touch: the round FLY button); while airborne it reads **LAND [F]** and a flight panel appears beside it with the flight bar and the exact instructions "Space = up · C = down · F = land" (F lands). In a MAH MATCH or duel the button reads **NO FLIGHT IN MAH MATCH** and is inert (the host refuses anyway). F's old "face the camera" binding moved behind developer mode (Shift+F with F3 on). Evidence: label "FLY [F] uses flight MAHGIC" → flew (`flight.powered`) → panel text captured → "LAND [F]" → landed → in a 1v1 match: "NO FLIGHT IN MAH MATCH", banner "MAH MATCH — DAMAGE ACTIVE", press → still grounded.

## HUD / FIRST-OPEN GUIDE

New `lab/gameHud.js` (built once, delegated pointer handling): health, combat MAHGIC, flight MAHGIC bars top-left · state banner + locked target top-centre · DEV / HELP / GUIDE top-right · category tabs, four move chips (cost / cooldown, hold = details card ≤ 30 % height), selected move + dash cooldown + guard + statuses bottom-left · ATTACK · LOCK/UNLOCK · DASH · GUARD PHYS · GUARD MAGIC · FLY/LAND · SEPARATE/FUSE · PRACTICE BATTLE · RESET PRACTICE buttons bottom-centre (touch: round cluster with the same words). Developer information (host line, log, class picker, team / niche / incoming fixtures, colliders version, camera yaw) is hidden until **F3** or the DEV button. First open shows a dismissible five-line guide (remembered per browser via localStorage; GUIDE button reopens it). Layouts: desktop 1600×900, portrait 390×844, landscape 844×390, tablet 1024×768 — all driven in the evidence runs with no occluded button. The old rules control-centre DOM (`#ruleshud`) is kept as a logic module only and is never displayed.

## ENVIRONMENT / COLLISIONS

- One authoritative collider set: `rules_17_23.dev.json → _runtime_mapping.field_colliders` (`FIELD_COLLIDERS_DEV_1`, 13 shapes: four walls at ±15 m, four 0.6 m pillars at (±7, ±7), three rounded 1.3 m barriers, two 1.5 m ramps). `play/rules1723/Colliders.js` (pure): swept capsule `resolveMove` with axis-separated wall sliding and sub-steps, `groundHeight` (ramps), `lineOfSight`, `projectileImpact`. The same object serves movement and dashes (`PlayMode.integrate / dashStep`), lock acquisition / maintenance, melee visibility, placement and projectiles. Its version + shape count are part of the ruleset fingerprint frozen per match (`RULESET_FREEZE`) and published in the snapshot (`rules.colliders`).
- Visuals are built FROM that layout (`lab/fieldScene.js`): grid floor, chromium / platinum shapes, cool blue-white key + rim lights, dark sky, rounded barriers, capped pillars, ramps, corner beacons — nothing visible exists without a collider and vice versa. Local camera collision sweeps the boom outward against the same shapes and pulls in (`applied` 9 → 2.4 m behind a pillar).
- Evidence: running into WALL_W stops at x = −14.58 (body radius 0.4); the diagonal run along it slides 7.2 m in z with x clamped; walking into PILLAR_SE stops at z = 7.94; camera pulled in behind the pillar (`p1_10_camera_pullin.png`).

## PLAYER ASSET USED / LIMITATION

Searched the handoff / export areas without opening Astra working files: `ASTRA_VISUAL_CLEANUP/ATHLETE_M/13_HANDOFF_EXPORTS` is empty; `14_HANDOFF_EXPORTS/Athlete_F` holds a `.blend` + `HANDOFF_MANIFEST.json` still pending approval (not a runtime GLB); the only `.glb` files are STARTING_SOURCE copies (`PHASE_1B_ATHLETE_F/01_SOURCE_COPY/Mah_Athlete_F.glb`, `LEAN_CLASS/*/01_STARTING_SOURCE/…`, `TITAN_F/01_STARTING_SOURCE/…`) — raw inputs, not released runtime assets, so they were not used. **No released runtime GLB / manifest exists; the character on screen is a code-generated TEMPORARY PREVIEW** (labelled in-world and in the menu): head with visor, neck, torso with class emblem, shoulder caps, upper / lower arms with elbows, hands, a fused tapered lower-body silhouette with a ring light, facing, strike / cast / guard / flight / hit / KO poses. It is NOT the finished Athlete and will be replaced through the existing `AssetSlot` binding when a reviewed GLB is released.

## ANIMATION / MAGIC IMPROVEMENTS

All driven by authoritative phases (`rules.me.cast.phase / progress`, entity spawns, `last_hit_ago_s / last_touch_ago_s`), never by client timers deciding damage. Physical: anticipation (arm chambered, torso wound, plant) → release (torso + shoulder drive through impact, contact flash + particles + floor ring) → recovery blend-out. Physical magic: the striking hand gathers a category-coloured glow that travels with the hand. Special magic: gathering cast pose, glowing hands, projectile with halo + trail, impact ring / flash. Hit reactions on both sides (0.35 s flinch), interruptions blend back to idle. Restrained particle bursts (≤ 22 points, 0.5 s). Sound: `lab/fieldSound.js` synthesises short cues (swing, impact / harmless impact, cast, magic impact, lock / unlock, fly / land, dash) after the first user gesture — no audio assets.

## BROWSER EVIDENCE

Driver `26_LOCAL_AUTHORITY/evidence/play/cdp_playtest.mjs --pass3` (headless Chrome, fresh profile each run = a completely new player; real key / mouse / multi-touch events; every state read back from the host snapshot). Folders (screenshots + `transcript.json`, 0 page errors each):

| run | folder | result |
|---|---|---|
| desktop 1600×900 | `evidence/play/pass3_desktop/` | guide shown + dismissed; 12/12 movement checks aligned; drag ≠ lock, click lock, duplicate, Esc clear; LOS refusal; free-roam harmless → practice damage; 90° locked hit / 180° rate-limited miss; no range extension; FLY → LAND → NO FLIGHT IN MAH MATCH; wall / slide / pillar / camera; F3 dev toggle; reset |
| portrait 390×844 (touch) | `evidence/play/pass3_portrait/` | same sequence with stick / taps / round buttons, plus orientation change |
| landscape 844×390 (touch) | `evidence/play/pass3_landscape/` | same sequence |
| tablet 1024×768 (touch) | `evidence/play/pass3_tablet/` | same sequence (see transcript) |
| rules 17–23 regression through the new HUD | `evidence/play/cdp_rules_desktop_pass3/` | class picker ×5, tabs / chips / details, strike 84, guards 34.2 / 47, Mend 630 → 830, zone + debuff, niche 1v1 (invisible / immune / Discord), reset |

New-player discoverability (fresh profile): the guide names move / look / lock / attack / fly; every action has a labelled button; the flight button is found by its label "FLY [F]" and its airborne instructions were read back from the screen. This is a scripted headless playthrough, not a human session — the owner's own run from the launcher is the remaining check.

## FOCUSED TESTS / OD-29

| suite | result |
|---|---|
| `16_TESTS/gameplay_rules_17_23.test.mjs` (colliders, free roam, practice, lock validation / grace / turning / range / wall impact / 3v3 / recovery + the corrected lock-turn assertion) | 60 / 60 |
| `16_TESTS/gameplay_play_sample.test.mjs` | 97 / 97 |
| `16_TESTS/gameplay_od29_disconnect.test.mjs` (real-elapsed 10 s grace, NO_CONTEST, journaled deadline readings) | 26 / 26 |
| `16_TESTS/gameplay_phase5a.test.mjs` / `gameplay_phase5b.test.mjs` | 46 / 46 · 46 / 46 |
| `16_TESTS/gameplay_phase4.test.mjs` / `gameplay_phase4_1.test.mjs` / `gameplay_runtime.test.mjs` / `gameplay_asset_slot.test.mjs` | 85 / 85 · 33 / 33 · 125 / 125 · 11 / 11 |

No pre-existing failures in these suites; no new regressions. OD-29 behaviour untouched (RECOVERY_HELD_DEV stays; QA replay memory-isolated).

## CHANGED FILES (sha256 prefix before → after)

Modified (rollback = restore the "before" content; no generated copies exist):
- `26_LOCAL_AUTHORITY/play/rules1723/RulesField.js` fa38f403 → 2374368c (lock, LOS, context, harmless impacts, projectile wall impact, ABORT op, snapshot fields)
- `26_LOCAL_AUTHORITY/play/rules1723/rules_17_23.dev.json` ab383643 → 83d403a8 (`_runtime_mapping.field_colliders`, `lock`, `combat_context` only; owner tables untouched)
- `26_LOCAL_AUTHORITY/play/PlayMode.js` c5917df5 → c3493961 (collider integration, ground following, LOCK_TARGET / FIELD_PRACTICE intents)
- `26_LOCAL_AUTHORITY/Protocol.js` 10f070cb → acc5c3b3 (LOCK_TARGET, FIELD_PRACTICE, ABORT validation)
- `26_LOCAL_AUTHORITY/lab/play.js` 5fbb68f3 → aa9dc805 · `lab/play.html` e3014e70 → 72dc49e2 · `lab/PresentationAdapter.js` c00b9a2f → a1eb3f37 · `lab/rulesHud.js` dc30f8bd → 9f4f267f (lock-aware aim, `currentAim`)
- `26_LOCAL_AUTHORITY/lab_host_server.mjs` 585d1c00 → 828291e6 (`--field`, `--open`) · `START_MAHWORLD_RULES_17_23.cmd` 12dab7a8 → 35a1d513
- `26_LOCAL_AUTHORITY/evidence/play/cdp_playtest.mjs` 2ad4ad32 → d0e69f0d (`--pass3`, new HUD selectors) · `16_TESTS/gameplay_rules_17_23.test.mjs` 65ca0ecc → 9236d01c · `16_TESTS/gameplay_play_sample.test.mjs` → cf5dcb53 (§14 enables practice explicitly)

New: `play/rules1723/Colliders.js` 22ef38e1 · `lab/fieldScene.js` 901b2578 · `lab/gameHud.js` 44c350d1 · `lab/fieldSound.js` 5361c62d · `25_HANDOFF/PLAYABILITY_PASS_REPORT.md` · evidence folders `evidence/play/pass3_*` and `cdp_rules_desktop_pass3`.

Unchanged: `DuelHost.js` f68bceb4, `RulesMath.js` 10387440, `03_RESOURCES/Resource.js` 9e77d322, `00_CORE/dev_tuning.dev.json` 84e8399f, the owner packet copy, mahloco, every Astra folder, RAW/WORKING models, `.codex`.

## OPEN / NOT DONE (honest)

- `lock.turn_rate_deg_s` = 540°/s, acquisition 30 m / drop 34 m, LOS grace 1.5 s, range grace 2 s and the collider layout are DEVELOPMENT tunables in `_runtime_mapping`, not owner canon (ledger OPEN line added).
- The preview humanoid is temporary; no released GLB exists; a first-person / cinematic camera, final VFX, final animations and audio assets remain out of scope.
- Practice-mode default is OFF (free roam harmless) per the brief; the rules regression run therefore enables it through the visible button first.
- Owner action: double-click the launcher and test again (movement at any camera angle, click/tap lock, attack in free roam vs practice, FLY [F], collisions). Report what feels wrong; nothing beyond this pass is authorised.
