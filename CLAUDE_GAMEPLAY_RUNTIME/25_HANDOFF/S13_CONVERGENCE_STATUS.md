# S13 — MASTER PRECISION / ANIMATION / WORLD / ACCESS CONVERGENCE PASS (2026-09-17)

Continues the S11 district checkpoint (da3c031) and the S12 access repair (c53aa8a, tag `s12_demo_gate`). One implementation path, no
restart, no competing animation framework; Blender was NOT launched (slot reserved) — every mesh step is node/JS.

## Checkpoints
| commit | content |
|---|---|
| `fd58eaf` S13 WIP 1 | centred rear camera + manual orbit · H = fuse · daytime world · emote endpoint IK |
| `8589114` S13 WIP 2 | exercise-pattern attacks · donor hit reaction on every target · surgical split legs (dev_0.13 = ATHLETE_M_V8) |
| `0bfbe15` S13 | review recorder + this status |
| `ae2a9b4` S13 | endpoint audit completed for every arm emote (applause, beckon, bump, five, ready, side chest, back lat) |
| final S13 commit | demo deploy 6aab6556… + status |
Rollback: `git checkout da3c031` (S11 world, V6 legs) · `?avatar=ATHLETE_M_V7` / `ATHLETE_M_V6` (previous bodies) · `?sky=night` · `?motion=MAH` · `?cam_return=<s>`.

## H replaces T for fuse — YES
`lab/play.js` keydown: `case 'KeyH': send('TRANSFORM')` (bound once; no `KeyU`/`KeyT` transform survives; T stays attack 3). Guards: G = physical,
Shift+G = magic (touch button unchanged: tap / hold). Labels updated in the CONTROLS table, the MORE sheet (`SEPARATE <H>` / `FUSE <H>`), the
guide text, play.html; the browser playtest driver presses H. Asserted by `16_TESTS/gameplay_direct_ui.test.mjs` (51/51).

## Camera (owner section: centred rear + manual orbit) — `lab/play.js`, `lab/touchControls.js`
- Default = centred rear follow of the character's DISPLAYED root yaw (PresentationAdapter's interpolated facing), always on (idle, W/A/S/D,
  diagonals, reversals, flight, attacks, emotes, lock). One setting: `CAM_RETURN_S` (0.24 s exponential ease, rate-capped 11 rad/s) drives both
  the follow and the post-drag return; `?cam_return=` overrides. The follow never feeds `cam.manual`, so the latched input basis is untouched — no
  movement/camera loop.
- Manual look = a deliberate drag (mouse on the view / touch look zone, past the tap threshold): the camera holds the chosen angle while the
  character keeps moving; release (`orbitEnd` from touchControls, mouseup, pointer cancel, blur, orientation change) starts the return at once.
- Framing from the character's own bounds: crown-to-tips ≈ 54 % of the viewport height, aim at 0.55 H, 0.36 rad down; wheel / pinch = a zoom
  multiplier. Collision stays boom-shortening only (`fieldScene.cameraDistance`). Menus / emote surface / panels own their input.
- Acceptance `deploy/probe_camera.mjs` (A–G, real key + mouse events; touch = synthetic pointer events on the zones — EMULATED, no device):
  desktop 9/9, touch 9/9. Dev API `cam()/camFollow()/camLook()/cameraDebug()` kept for probes (an explicit `cam(dist/pitch)` is a fixed framing).

## Emotes — exact endpoints — `lab/animData.js`, `lab/RigAnimator.js`, `lab/rig_profile.json`
- New ENDPOINT channel on keys (`IK(key, { R: { hand:[x,y,z], pole:[x,y,z], w, contact } })`), interpolated by `sampleClip`.
- RigAnimator 12c `emoteArmIK`: live FK pivot through the composed trunk + girdle (pelvis → chest → clavicle → scapula, quaternions, real rest
  offsets), 2-bone solve, humerus expressed in the scapula frame, hinge = f × u (this rig's flexion sign), pronation about the true forearm
  axis, twist carriers follow, head / torso push-out unless `contact`. Named allowance `pose_overrides.emote_endpoint` (arms only) for those
  frames; `pose_overrides.perch` for the perch knees.
- Endpoints: WAVE (0.30, 1.72, 0.06) beside the head — the old wave swept the crown; FRONT_LAT_SPREAD fists ON the waist (±0.225, 1.06, 0.05,
  contact) — they used to float at clavicle height; DOUBLE_BICEPS fists at the ears (±0.42, 1.69, 0.06); THUMBS_UP (0.26, 1.28, 0.34);
  APPLAUD (wrists part 26 cm / meet 9 cm in front of the chest); BECKON; FIST_BUMP; HIGH_FIVE; READY (fists up at chin height); SIDE_CHEST
  and BACK_LAT_SPREAD (targets in the CHEST frame so the twisted trunk carries them). `eulerFit` picks the XYZ branch that fits the allowance.
- `16_TESTS/gameplay_emote_endpoints.test.mjs` (FK on the delivered skeleton): 0.0–0.1 cm wrist error, head clearance, continuity, limits —
  22/22. Emotes without an arm endpoint by design: NOD, SHRUG, QUIET_LAUGH (no hand target), PERCH, the exercise demo loops and the grooves.

## Attacks as exercise patterns — `lab/RigAnimator.js` step 5
- PUSH (slot E, rules name HORIZONTAL_PUSH) re-authored as a HORIZONTAL push: setup = scapular retraction, elbows just behind the shoulder line,
  forearms forward (fists at the pecs), chest up, neutral trunk, knee brace; execution = humeri to horizontal + elbow lockout + scapular
  protraction, ≈7° restrained trunk drive + leg extension, palms forward. The previous overhead press with a leg dip / spine arch is gone —
  no forward lean.
- PULL (slot R, rules name VERTICAL_PULL) re-authored as a vertical pull (lat pulldown): reach up wide → elbows down and back to the ribs,
  scapular depression + retraction, chest up, fists at the upper chest.
- HINGE / ROTATION / UPRIGHT_ROW / CAST unchanged. `gameplay_rig_pose_fk` 33/33, `gameplay_rig_limits` 64/64.

## Donor usage — `lab/play.js`, `lab/PresentationAdapter.js` path, `lab/RigAnimator.js` 10a, host
- The Tripo upper-body layer is now the DEFAULT (`MOTION.mode = TRIPO_UPPER`, `?motion=MAH` opts out) and is armed on EVERY rigged character
  (player, others, NPCs, the practice dummy, split figures) — cast_a_spell drives the SPECIAL cast staging; hit_to_head is the hit reaction.
- Host: `RulesField` records `last_hit_from`; `PlayMode.npcView` exports `last_hit_ago_s / last_touch_ago_s / last_hit_from`; the client
  passes `hit_dir` for me / NPCs / rules others. Donor HIT: 60 ms blend-in, arms mirrored for a blow from the right, trunk yaw/roll + head
  turn toward the blow, from-behind = head/chest snap BACK; one inertialization capture per entry/exit; lower body stays MAHWORLD (mask).

## Lower body — `lab/assets/rig_legs_surgical.mjs`, `make_class_rig_v5.mjs --legs surgical --hip-x 0.045`, dev_0.13
- Each split leg's OUTER half is the fused taper's own cross-section outline at that height (angular sampling, Gaussian-smoothed along the
  limb): calf bulge, knee valley, quad / hamstring shape are the species'. Narrowed to 0.5 of the fused half-width below the knee so two limbs
  fit side by side, and FLUSH with the pelvis shell at the crotch (v4 protruded ~10 mm). The INNER half is inferred from that outline (a convex
  D whose depth is the outline's own front / back extent, medial bulge 0.62). Pointed tip on the TIP bone axis; rings inside the pelvis to the
  femur-head dome. PACKED = the exact fused outer surface + a thin medial D → the packed pair reproduces the fused silhouette.
- dev_0.13 = ATHLETE_M_V8 (default; built from the same inputs/flags as dev_0.12 incl. the axilla unweld). Gates: `gameplay_rig_v5_gates`
  8/8, `gameplay_leg_surface` 6/8 (the two open items — gait-swing / X-gather strain band — are the same pre-existing ones as dev_0.12, with
  slightly better numbers), `gameplay_rig_bind` 25/26 (same pre-existing shoulder/ribcage item as dev_0.12).

## World — `lab/fieldScene.js`, `lab/cityScene.js`
- DAY is the default (`?sky=night` keeps the S07 template): sun disc at the key light, denser white clouds (22 quads), cool dome, fog matched
  to the horizon, sun 1.95 + front fill (NoToneMapping kept — hero materials untouched), black platinum floors kept in daylight (metalness
  0.84–0.88), buildings keep their glTF double-sided faces (v11 forced FrontSide → missing panels) with 0.35 env intensity so the uploaded
  base-colour textures read as authored (gold temple / silver-blue gym / blue tower / emerald market), matte distant ridge, city emissive trims
  at 45 % by day. Collision / landing / perch unchanged (`gameplay_district` 30/30).

## Public access
- Demo project (mahworld-test-preview): the S13 build is LIVE behind gate v2 — deploy `6aab65567e997ae33c1da204` (password page,
  wrong-password error + rate limit, signed HttpOnly/Secure session, refresh / logout, assets 401 without a session); verified after the deploy
  with `release.mjs --check` + real Chromium desktop and EMULATED iPhone (game state: ATHLETE_M_V8, FIELD, 4 landmarks, no private-network
  requests). Rollback = publish deploy `6aab35c5cedca9fb585a2fbe` (S11 world, V6 body) in the Netlify UI; both permalinks answer 401 unauthenticated.
  The static build ships V8 + V7 (V6 dropped from the upload to keep the zip small; still in git).
- https://fob.systems/mahdemo is still the main site's 404. With the owner's `netlify login` the cause became precise: the main site's 93
  redirect rules + 21 header rules are compiled from the netlify.toml of its build SOURCE (MAHFITT v399 zip), which is not on this laptop and
  not downloadable — so the digest-clone route deploy would have dropped them and is now refused by the tool. Owner options: (1) put the
  MAHFITT v399 project folder/zip here → I add the three lines to its netlify.toml and deploy draft → prod; or (2) one UI click: add the
  domain alias `mahdemo.fob.systems` to the DEMO site (fob.systems is on Netlify DNS; my API attempt was blocked by the safety classifier).
  Owner chose (2): **https://mahdemo.fob.systems is live and verified** (16/16, desktop + emulated iPhone — 25_HANDOFF/S13_CLOSURE.md);
  the path form remains blocked on the main site's source.

## Review video
`26_LOCAL_AUTHORITY/deploy/review/s13/mahworld_s13_review.webm` (3 min 20 s, 1120×700) + `marks.json` + one still per chapter. Chapters:
district (day) → camera (W/A/S/D no look input, S reversal, move + MANUAL LOOK + release) → locomotion fused / H split / split gait / H fuse →
flight, gym-roof landing, PERCH → emotes (MANUAL LOOK: wave, lat spread, double biceps, thumbs up, applause, back lat spread) → attacks E/R/T/Y + special (gold) →
hit reaction on the practice dummy → TAB radial, Q menu, controls help → temple / tower deck landing (MANUAL LOOK) → final sweep → end card
(touch = EMULATED). Every non-rear view is a real mouse drag labelled MANUAL LOOK; no automatic showcase orbit.

## Remaining visible defects (honest)
- Split legs: two pre-existing strain-band items under extreme knee/hip angles (≤ 1.9 % edges, 81 inverted tris in the X-gather) — same class
  as dev_0.12; the leg tips are stylised spikes (as before).
- Shoulder/deltoid mass thins when the arms go fully overhead (double biceps, wave) — skinning of the delivered mesh; the axilla unweld (V7/V8)
  helps but does not remove it; a native rig job would.
- Flight trick: none shipped (omitted on purpose rather than a gimmick).
- Practice dummy reaction plays on harmless touches too (light).
- Distant ridge is still a stylised low-poly horizon.
- fob.systems/mahdemo route: blocked on credentials (above).
