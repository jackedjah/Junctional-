# MAHWORLD OVERNIGHT PLAYABLE DEMO CONVERGENCE — REPORT (2026-09-15, DEVELOPMENT)

Owner brief: "CONTINUE — MAHWORLD OVERNIGHT PLAYABLE DEMO CONVERGENCE" (real-phone controls · compact game HUD · actual Athlete silhouette · animation coverage · password-protected fob.systems/mahworld). Status record: `OVERNIGHT_DEMO_STATUS.md`. Baseline preserved: Rules 17–23, three-mode dock, attack-stack foundation, camera-relative movement, lock-on, harmless free roam, flight rules, colliders, OD-29, deterministic recovery, LAN testing.

## OVERALL RESULT

The owner can open and play the reworked demo NOW on a phone over the home Wi-Fi (`START_MAHWORLD_PHONE_TEST.cmd`) or on the PC (`START_MAHWORLD_RULES_17_23.cmd`). The hosted `https://fob.systems/mahworld` demo is PREPARED (server-side password gate, base-path mount, packaged build, Dockerfile, proxy rule) but NOT deployed: the fob.systems host (Netlify, static) cannot run the stateful backend, the site's source is not on this machine, and no backend host or password was available in this session. Nothing paid was provisioned. Physical-phone acceptance is still the owner's to give.

## PHONE SWIPE ROOT CAUSE

Traced on the final source (`lab/play.js` before this pass): there was no attack-gesture recogniser at all. Touch path was: right-half `touchmove` → camera orbit (always), `MOD` button + swipe → dash only, `ATTACK` → a plain tap that cast the armed move. A swipe on the right side therefore rotated the camera; a swipe near the ATTACK button lifted off the button (touch events stay bound to their start element, so the tap fired only on a clean lift); the old `#tbtns` cluster and the `#g-actions` row duplicated actions; the guard/fly buttons could be covered by an open panel; taps on empty ground attacked (`tapAt` fell through to `attack()`); the stick had a fixed origin and no per-touch ownership. Host-side there was no defect: every accepted gesture in this pass reaches the same `RULES_CAST` and the host still validates and refuses (evidence: refusal feedback below).

## MOVEMENT FIX

`lab/touchControls.js` (new): pointer-event ownership by pointer id, roles fixed at pointerdown (STICK · CAMERA · PINCH · GESTURE · DASH_SWIPE · BUTTON), one finger's release / cancel never touches another finger; floating stick (origin = touch point, radius 56 px, dead zone 0.14, magnitude clamped, diagonals normalised by the existing world-vector path, run above 0.88 of the radius); `blur` / `visibilitychange` / `orientationchange` / resize release everything; the layer prevents browser scroll / zoom. Movement is still camera-relative from the real camera vectors (alignment 1.000 at 90° in the reruns). MOVE cadence 60 ms, snapshot poll 60 ms (was 90 / 100), no host speed / accel / dash / timing changes. Measured on emulated touch: stick + orbit with two fingers moved 8.5 m while the yaw changed, movement continued when the orbit finger lifted, stopped within one poll after the stick lifted, no drift (< 0.08 m), no stuck modifier, backgrounding and rotation while the stick is held release every input.

## FINAL CONTROL LAYOUT

- Left thumb: floating movement stick (lower-left 42 % × 66 % zone; resting circle bottom-left).
- Left, above the stick: HOLD ATTACK and HOLD DASH (66 px round; quick tap of ATTACK = explicit attack fallback, quick tap of DASH = dash toward the stick / forward).
- Right side (below the dock, above the action column): world drag with no modifier = camera orbit, two fingers = pinch zoom; HOLD ATTACK + swipe = the armed move's gesture (24 px minimum, dominant axis; `TAP_SELECT + ATTACK` moves accept any swipe or tap); HOLD DASH + swipe = directional dash; tap an enemy = lock-on; tap empty ground = nothing.
- Top-right: PHYSICAL | PHYS MAHGIC | SPECIAL MAHGIC dock, one drawer (tap a move → armed + drawer collapses; ⓘ / `?` = how to perform), compact readout "Athlete Drive · READY".
- Right column: FLY / LAND (contextual; NO FLIGHT in a match), GUARD PHYS, GUARD MAGIC, MORE (⋯ → practice battle, reset, separate / fuse, interact, wave, help, guide, dev panel, unlock; About text with honest limitations).
- Top-left: compact vitals (health · combat MAHGIC · flight MAHGIC) with the diamond motif; top-centre: state pill (FREE ROAM — HARMLESS / PRACTICE BATTLE / MAH MATCH) + locked target + refusal feedback.
- Desktop keeps a slim ATTACK · DASH · LOCK bar; keyboard unchanged (J attack, Q dash, G/H guards, F fly, T, Z, 1–4, Esc, F3 dev).
- Feedback: "SWIPE ↑ for Athlete Drive" / "WRONG SWIPE — ↑ for …" / "PICK A MOVE (top-right)" / "NOT ENOUGH MAHGIC" / "COOLING DOWN x s" / "STILL RECOVERING" / "LOWER THE GUARD FIRST" / "LAND FIRST" / "NO FLIGHT IN MAH MATCH", plus a refusal tone. A brief "hold ATTACK, swipe here" cue appears for 7 s after the guide.
- Diagnostics inspector (DEV panel, F3): modifier state, finger roles, stick vector, last gesture (matched / mismatch), armed move + its gesture, last command, last host response, move-ack and poll latency, recent events.

## ACTUAL CHARACTER SOURCE

`26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.1/Mah_Athlete_M_preview.glb` — an isolated, geometry-only development copy of `RAW_10_MODELS/Mah_Athlete_M.glb` (sha256 7b023694ea92…; identical bytes to the Astra starting source and the WORKING copy), generated by `lab/assets/make_athlete_m_preview.mjs` (read-only source access; 12 863 triangles, positions / normals / UVs kept, the two 11 MB texture images dropped → 616 KB). Manifest status `CANDIDATE` + `preview_status: DEVELOPMENT_PREVIEW_UNAPPROVED`; never promoted, never retained as production. Runtime: graphite / platinum `MeshStandardMaterial` with a faint class-tint emissive, forehead crest at the head socket, 1.8 m fused height, source faces +Z so the factory rotates it to the contract's −Z. Silhouette on screen: head, shoulders, chest, arms, waist and the tapered fused lower body of the actual model (front and back views in the evidence). Used for every class during testing (tint only) — labelled in the DEV panel and About. Not touched: Astra working files, original GLBs, .blend files, retained masters, Athlete_F, other classes; Blender never launched. The articulated stand-in remains available (`?avatar=STAND_IN` / DEV avatar picker) and is the automatic fallback.

## ANIMATIONS WORKING

Inventory (existing sources: `CLAUDE_RUNTIME_FOUNDATION/05_ANIMATION_CONTRACT` (29-clip contract, no authored clips), `12_ANIMATION_RUNTIME/AnimationStateController.js` (mahloco state port, clip requests), `11_PREVIEW_RUNTIME/PreviewStage.js` (mixer + morph / seam hooks), `lab/PresentationAdapter.js` (phase-driven procedural presentation). The mounted Athlete_M preview has no skeleton, morph targets or clips, so every VERIFIED row below is whole-body procedural motion driven by authoritative state, measured on the mounted mesh through the `mePose()` probe:

| ACTION | EXISTING SOURCE | RUNTIME BINDING | VERIFIED / MISSING |
|---|---|---|---|
| idle / hover | contract FUSED_IDLE / FUSED_HOVER (no clip) | adapter idle breathing (root tilt / bob), emitter ring, flight glow | VERIFIED (subtle) |
| movement start / acceleration / running | contract FUSED_GLIDE + host accel 14 m/s² | adapter lean 0.06 + bob while `mahloco` is a moving state; position from host | VERIFIED (whole body) |
| turning | host facing | root yaw eased at 14/s | VERIFIED |
| deceleration / stop | host decel 40 m/s² | lean returns to 0 | VERIFIED |
| fused movement | mahloco FUSED_GLIDE | as above | VERIFIED |
| separated-leg movement | contract SPLIT_* (no clip) | needs leg meshes / rig | MISSING — rigid asset has no separable legs; fused silhouette stays (labelled) |
| fuse / separate transformation | mahloco UNFUSE / REFUSE sequences (non-cancellable, host) | adapter charge pulse + seam glow scale; no morph | PARTIAL — timing / cost preserved; visual separation MISSING (no PACKED morph / split meshes) |
| flight takeoff / hover / ascent / descent / forward | host flight controller | flight ring glow, lean 0.2, altitude from host (root_y 1.3 m measured), warning / forced colours | VERIFIED |
| flight turning | host facing | root yaw | VERIFIED |
| landing | host landing controller | glow off, lean out | VERIFIED |
| ground dashes F/B/L/R | host DASH | directional trail + faster position ease | VERIFIED (trail measured) |
| aerial dashes | host DASH airborne | same trail | VERIFIED in earlier pass (playability run) |
| physical attacks | rules cast STARTUP → commit → RECOVERY | rigid: wind-up twist 0.2–0.38 rad, release lunge −0.28 m + torso dip, contact flash, floor ring, particles, recovery back to idle (measured) | VERIFIED (whole body; no arm swing) |
| physical MAHGIC | same phases | class-tinted hand glow at the estimated hand socket (0.5–0.6 opacity measured) + strike | VERIFIED (whole body) |
| special MAHGIC | same phases | cast rise + both-hand glow, projectile halo / trail, impact ring | VERIFIED (whole body) |
| physical / magical guards | host GUARD | brace tilt 0.13 / lift, guard ring (orange / blue), guard tone | VERIFIED |
| hit reactions | host `last_hit_ago_s` | recoil −0.28 rad + 0.16 m (measured after the incoming fixture) | VERIFIED |
| interruptions | host fizzle / interrupt | pose blends back to idle; no client timer | VERIFIED (blend-out) |
| attack recovery / lowering | host RECOVERY phase | recovery blend 0.5 s | VERIFIED |

## ANIMATIONS MISSING / BLOCKED

- Limb / hand articulation (arm swing, strike arm, cast hands, leg propulsion) — needs a skinned rig; the preview is one rigid mesh.
- Separated-leg form and the UNFUSE / REFUSE visuals (curl, charge, burst / star, knees-up, align, snap) — need `_UPPER_SPLIT` / `_LEG_L` / `_LEG_R` meshes and the PACKED morph the contract expects.
- All 29 contract clips are unauthored; the AnimationStateController exists but has nothing to play. Laser contact / tip propulsion fields, established aura colours and trails per class are not authored assets yet (a class tint is routed).
- Nothing was claimed by scaling the mesh; the transform charge pulse is a whole-body effect and is labelled as such.

## TOUCH AND BROWSER EVIDENCE

Browser-emulated touch (headless Chrome, CDP touch → pointer events, fresh profile each run; NOT a physical phone): `evidence/play/phone_portrait/` (390×844), `phone_landscape/` (844×390), `phone_small/` (320×568): permanent controls only (stick, ATTACK / DASH holds, 3 modes, FLY, 2 guards, MORE; no desk bar, no old cluster); stick + orbit with two fingers; enemy tap locks, ground tap harmless; HOLD ATTACK + swipe ↑ = exactly one cast × 3 (dummy 1000 → 748 with practice on), wrong swipe ← refused with "WRONG SWIPE — ↑ for Athlete Drive", ATTACK tap fallback = 1 cast; HOLD DASH + swipe → "DASH ✓ RIGHT 3.4m", modifier lifted first still counts once; touch-cancel → no cast, no stuck finger; drawer scroll leaks nothing, arming collapses, outside tap dismisses drawer and MORE and is consumed; guards / FLY / LAND buttons; background and rotation release inputs; animation probes above; reset through MORE. Desktop: `pass3_desktop_demo/` (full playability regression through the new HUD: movement at four yaws, lock, LOS refusal, free roam vs practice, 90° / 180° aim, range, FLY, collisions, camera pull-in, F3), `dock_desktop1440_demo/` (three modes, one drawer, placement, no leaks, five classes, level fixture, resize, preserved systems), `cdp_rules_desktop_demo/` (class picker, chips, strike, guards, Mend, zone, niche 1v1, reset). Zero console / page errors in every run. Physical-phone evidence: none yet — the owner's review is the acceptance step.

## PRESERVED GAMEPLAY

Focused host suites after all changes: rules 17–23 60/60 · attack stack 22/22 · OD-29 26/26 · 5B recovery 46/46 · 5A lab server 46/46 · play sample 97/97 (one assertion updated: the three human-approved three.js addons are now served read-only). Browser regressions above cover class-stack resolution, costs / cooldowns / balance (untouched data), guards, interruptions, lock-on + marker, facing-direction attacks, harmless free roam, battle-only damage, flight restrictions, collision, camera boom. OD-29 / NO_CONTEST / rewards / replay untouched (suites). Both launchers work (smoke-tested; files byte-identical: rules launcher 35a1d513, phone launcher 4f61bab4). An owner-started `lab_host_server.mjs` (cmd.exe, 9:06 PM) was left running untouched.

## DEMO URL / DEPLOYMENT STATUS

NOT DEPLOYED. Prepared and verified locally: `--demo` mode (server-side gate for demo entry, every API, the live connection; login rate limit 5/min/IP + 60 s lockout; HttpOnly SameSite=Lax cookie, Secure behind HTTPS; logout; `/api/dev/*` and `/api/hold` absent) and `--base-path /mahworld` (direct navigation, refresh and trailing slash resolve; assets / API / GLB under the prefix; outside the prefix → 404). curl evidence: login page 200 · unauthenticated page 401 · unauthenticated API 401 `DEMO_LOGIN_REQUIRED` · wrong password 401 · right password 303 + cookie · game / modules / three.js / GLB 200 · dev endpoint 404 · 5 bad attempts → 429 · logout → 401 · password absent from logs. Package: `node 26_LOCAL_AUTHORITY/deploy/build_demo_package.mjs` → `deploy/dist/` (115 files, 2.4 MB, private-content scan clean, booted from its own folder and served the gated game), `deploy/Dockerfile`, `deploy/README_DEMO_DEPLOY.md` (Netlify proxy rule for `/mahworld/*`). fob.systems = Netlify project `unrivaled-quokka-ddcf49` (static hosting; the read-only MCP connection shows no repo and cannot run a persistent process). The client has no dependence on localhost / LAN / the owner's laptop (all URLs are page-relative).

## PASSWORD CONFIGURED — YES/NO, NEVER PRINT IT

NO. The gate reads `MAHWORLD_DEMO_PASSWORD` from the host environment only; no password was supplied in this session and none exists in files, source, reports, URLs, screenshots or logs (a throwaway test value was used for the local curl check and discarded).

## HOSTING COST OR ACCESS BLOCKER

1. A persistent Node 22 host for the authoritative backend (container / small VPS — the smallest compatible options are paid; none provisioned). 2. Access to the fob.systems site source to add the two proxy lines (not on this machine; Netlify MCP here is read-only). 3. The owner-supplied demo password in that host's environment.

## LOCAL LAUNCHER PATH

`C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\START_MAHWORLD_PHONE_TEST.cmd` (phone on the same private Wi-Fi; prints `http://192.168.x.x:<port>/lab/play.html?field=1`) · `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\START_MAHWORLD_RULES_17_23.cmd` (PC, opens the browser). Firewall note from the LAN pass still applies (Node allowed on Private networks; the current Wi-Fi profile was Public).

## CHANGED FILES / ROLLBACK

Checkpoints: `26_LOCAL_AUTHORITY/evidence/checkpoints/overnight_2026-09-15_before/` (originals + SHA256SUMS: play.js 4a8c40ae, play.html e78a24cc, gameHud.js d6d776f8, PresentationAdapter.js c08282b5, rulesHud.js f4c9e31c, fieldSound.js 5361c62d, lab_host_server.mjs 96fae5f4, cdp_playtest.mjs 20f43a83) and `overnight_2026-09-15_after/` (new SHA256SUMS). Rollback = copy the before-checkpoint files back and delete the new files.
Modified: `lab/play.js` (touch wiring, relative base path, gesture path, refusal feedback, preview binding, debug probes), `lab/play.html` (compact HUD + touch layer CSS), `lab/gameHud.js` (compact HUD, MORE / DEV panels, dismiss layer, scroll-safe chips, unlock), `lab/PresentationAdapter.js` (rigid-figure support, no floating disclaimers), `lab/rulesHud.js` (hit reactions for others), `lab/fieldSound.js` (tick / refuse / guard cues), `lab_host_server.mjs` (three addons + assets mount, `--demo`, `--base-path`), `evidence/play/cdp_playtest.mjs` (`--phone`, new-HUD helpers), `16_TESTS/gameplay_play_sample.test.mjs` (addons policy assertion), `COMMAND_AUTHORITY_CONTRACT.md`, `lab/PRESENTATION_ADAPTER_CONTRACT.md`, ledger OPEN line. New: `lab/touchControls.js`, `lab/GlbCharacter.js`, `lab/assets/make_athlete_m_preview.mjs` + `lab/assets/athlete_m_preview/dev_0.1/{Mah_Athlete_M_preview.glb, manifest.json}`, `deploy/{build_demo_package.mjs, Dockerfile, README_DEMO_DEPLOY.md, dist/}`, `25_HANDOFF/OVERNIGHT_DEMO_STATUS.md`, this report, evidence folders `phone_*`, `*_demo`. Untouched: rules data, class balance, PlayMode / RulesField / Protocol, colliders, launchers, Astra folders, models, foundations.

## THREE BABY STEPS FOR THE OWNER

1. Double-click `START_MAHWORLD_PHONE_TEST.cmd`, type the printed address into the phone (same Wi-Fi), dismiss the 5-line guide.
2. Left thumb on the lower-left = walk; drag on the right = look; tap the grey figure ahead = lock (four arrows).
3. Tap PHYSICAL (top-right) → tap "Horizontal Push", then HOLD ATTACK (left) and swipe ↑ on the right. Tap MORE → PRACTICE BATTLE to see damage.

## KNOWN LIMITATIONS

- Browser-emulated touch only; real-phone feel (thumb reach, latency, browser chrome) is unverified until the owner tests.
- The preview character cannot articulate limbs or separate legs; SPLIT keeps the fused silhouette; transformation visuals are a whole-body pulse only.
- Class differences on the body are tint-only (every class uses the Athlete_M preview during testing).
- Gesture thresholds and the level-band / lock tunables remain development values (ledger).
- Flight-energy exhaustion descent stays the development fallback.
- Demo progress resets on server restart (memory store); hosting not deployed.

## PROCESS STATUS

All temporary test servers and headless Chrome instances started by this pass exited (each run closes its server and kills its Chrome; launcher smoke tests used `--exit-after`). The owner-started `lab_host_server.mjs` (cmd.exe, 9:06 PM) is untouched. No deployed demo service exists yet.
