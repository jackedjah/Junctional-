PASS 2 — camera: O1 persistent manual orbit + explicit reset · O2 drag on both sides · preferred vs obstruction distance · fade restore

Report separation (owner addendum rule): (1) already in progress = this pass (camera) when the addendum arrived; (2) appended by the addendum = the presentation pivot (PASS 2b), walk identity (PASS 4b), sky / far-background (PASS 2b slice + PASS 9) — see ADDENDUM_QUEUE.md; (3) completed now = PASS 2 below; (4) remaining = PASS 2b, 3, 4, 4b, 5, 6, 7, 8, 9 + gates.

WHAT I DID:
  26_LOCAL_AUTHORITY/lab/play.js         O1: `cam.mode` follow · orbit · resetting. A drag enters ORBIT and the orbit PERSISTS after release (no return on release, timer, movement, attack or flight); the camera keeps following his position. `camReset()` = explicit reset (Backspace, middle click, ⟲ CAM button, dev API) — a smoothstep glide of `reset_time_s` = 0.5 s back to the rear view at home pitch, collision-safe because the boom probe still runs every frame; then rear follow resumes. The Spec B release/return rules (`return_delay_s`, `return_time_s`, `return_when_idle`, `releaseT` glide) are removed. Obstruction: `pe = pitch + pitchBias`; when the boom at `pe` would drop below `readable = min(dist, max(min_readable_m 2.2, 0.7·dist))` the camera searches pitch steps (0.12 rad) up to `pitch_up_limit` 0.9 for the pitch giving the most distance and eases the bias in (6/s) / out (2.5/s) — it unwinds as soon as the plain pitch is clear; above the limit only as a dead-end escape when the boom would sit at the floor. Never sideways. Fade: the last step to opacity 1 is never skipped (a body was left at 0.998 transparent); below 35 % the visible meshes are hidden outright instead of drawn half-transparent (F03), and only the meshes the fade hid are restored (form switching hides others by design). Control Lab: mode readout, reset time, obstruction pitch-up on/off, min readable, pitch-up step / limit (return fields removed). Dev API: `camReset`, `meMaterials`, camState `mode / resetting / pitch_bias / obstructed`.
  26_LOCAL_AUTHORITY/lab/fieldScene.js   `cameraDistance`: a boom blocked at the very first sample walks back to the first CLEAR point (0.9 … 0.55 m) instead of a fixed 1.0 m that could sit inside the obstacle (13 inside-frames in the temple dead end before).
  26_LOCAL_AUTHORITY/lab/gameHud.js      `#g-utils` with the ⟲ CAM reset button (right side; the `+` speed control joins it in PASS 3); `act.camReset`.
  26_LOCAL_AUTHORITY/lab/play.html       O2: `#tc-world` spans the whole screen (left 0); the joystick zone (later sibling) and every HUD control (higher z-index) own their own touches. `#g-utils`: desktop = top of the action column; touch = fixed column at the right edge above the 2×2.
  26_LOCAL_AUTHORITY/deploy/probe_camera_pass2.mjs   NEW page probe (desktop / portrait / landscape): O2a–d, R1 reset control, F02a/b facade pitch-up + unwind, F02c/d tower niche (overhang), F03a/b dead-end collapse + exact restore.
  26_LOCAL_AUTHORITY/deploy/probe_spec_b.mjs · probe_spec_b_gestures.mjs   A2–A4 / A5 (automatic return) marked SUPERSEDED — O1 with replacements A2o (orbit persists 2 s after release), A2p (move / attack / flight leave it alone), A3o (explicit reset < 5° within reset_time_s + 1 frame), A4o (stays behind after the reset, no geometry), A6o; the gesture audit asserts ownership (one DRAG session, no stuck DRAG, keys released, modal ownership, lock cleanliness) + orbit persistence, with an explicit reset between cases; the fly leg of the box check heads south over open plaza (with the synced colliders the old north-east heading reached the tower's recesses).
  16_TESTS/gameplay_camera_pass2.test.mjs   NEW (21): source contracts (no return rules, reset reachable four ways, effective pitch in the goal, first-clear boom floor, fade restore) + tracked evidence (pass2_* records, facade / niche samples, Spec B O1 samples).
  16_TESTS/gameplay_spec_b_camera.test.mjs  release-return check SUPERSEDED — O1; asserts the persist samples and the explicit-reset samples (< 5°).
  25_HANDOFF/CONVERGENCE/ADDENDUM_QUEUE.md  the owner addendum integrated into the queue (dependency order kept; reference files NOT FOUND — stated, not fabricated).

REVIEW ROUND (fresh-context reviewer, fixed before continuing):
  · the reset glide now interpolates a FROZEN error (`err0` captured on the first resetting frame): a front view that turns mid-glide can no longer flip the shortest path (180° whip); a reset ends a live drag first, keeps its clock if already resetting, and restores the requested distance (`cam.zoom = 1`).
  · automatic pitch-up applies only OUTSIDE a manual orbit (a manual view keeps its chosen pitch: the boom shortens — the owner's rule); `readable = max(min_readable_m, readable_frac 0.45 × preferred)` with the fraction exposed in the Control Lab (phone 8.7 m boom → 3.9 m, desktop 4 m → 2.2 m); the unwind steps down one pitch step at a time only while the next-lower pitch is still readable (no limit cycle); the dead-end escape above `pitch_up_limit` is documented in the Control Lab and below.
  · the eased camera position is probed too: a fast sweep (the reset glide) never leaves the real camera inside geometry — new page case R2 "reset at the wall" (0 inside frames over 165–240 frames, three modes).
  · the Spec B reset evidence starts from a REAL orbit offset (A3o-: −58° … −74°) instead of the 0° left behind by walking; the tower niche case now faces him out of the recess so the camera really is obstructed (22 obstructed frames per mode); F02a asserts the runtime's own readable distance (desktop min applied 2.50 m ≥ 2.20 without pitch-up needed; portrait 4.10 m ≥ 3.91 with a 0.70 rad bias).
  · fade hysteresis (hidden below 30 %, shown above 45 %) — no pop at a 0.9 m wall; base-transparent (aura / glow) materials are never touched by the fade, so the material check is universal; F03a asserts "hidden below 30 %" instead of the old clamp tautology.
  · still open by design (disclosed): the dead-end escape may pitch to 1.2 rad (top-down) for the frames where the only alternative is a camera inside the wall; the pitch-up recovery itself (follow mode) is a deviation from "shorten the boom only" that the Card A phone review must judge.

WHAT I FOUND:
  · F02 (extreme back close-ups along the gym facade) had two causes: the host collided against invisible S11-size walls (fixed in PASS 1), and the boom's only recovery was a straight collapse to 1.0 m. With pitch-up recovery the facade case keeps ≥ 3.1 m (desktop) / ≥ 2.15 m (phone) at a 0.4–0.7 rad bias.
  · The old 1.0 m floor sat INSIDE the obstacle in a dead end (temple south wall: 13 inside-frames); the first-clear walk-back fixed it (0 inside-frames).
  · F03: the fade epsilon left the body at opacity 0.998 / transparent after a collapse — a real "pale polygons" contributor; fixed and proven by `meMaterials()`.
  · Z cannot be the reset key (it cycles the attack mode) → Backspace + middle click on desktop, ⟲ CAM on touch.
  · In ORBIT, walking forward turns him away from the camera (camera-relative movement) so the rear view reappears without any automatic camera motion — expected under O1.

EVIDENCE
  inspected:          play.js follow / boom blocks, touchControls.js finger roles, the reference pack O1 / O2 text, the tower niche and temple wall colliders.
  rendered/measured:  `node deploy/probe_camera_pass2.mjs desktop|portrait|landscape` → 8/8, 13/13, 13/13 (records + stills under `25_HANDOFF/CONVERGENCE/camera/`): facade min applied 2.50 m desktop (readable 2.20, no pitch-up needed) / 4.10 m portrait (readable 3.91, bias 0.70 rad), 0 inside frames; niche (camera into the recess): 22 obstructed frames, 0 inside frames, no half-visible close-up; reset at the wall from |err| 89–120°: 0 inside frames through the glide; dead end: collapse to 0.50 m with the body hidden, 0 inside frames, exact restore after walking clear (base-opaque materials back to opacity 1, nothing hidden, boom back at 100 %).
                      `node deploy/probe_spec_b.mjs desktop|portrait|landscape` → 22/22 ×3 (`25_HANDOFF/PASSES/spec_b/`): A2o release persists (|Δ| < 3°, |err| 74°), A2p move / attack / flight Δ 0.0°, A3o- real offset before the reset (−58° … −74°), A3o reset |err| < 5° at 540–544 ms (0.5 s + 1 frame), A4o stays behind with 0 inside frames over the whole reset phase; box checks idle / run / fly / combo all clear of the HUD.
                      `node deploy/probe_spec_b_extra.mjs desktop|portrait` → 5/5 ×2 (E1 SUPERSEDED — O4). Gesture audit (`probe_spec_b_gestures.mjs`) portrait 12/12 (4 not exercised), desktop 11/11 (5 not exercised) under the O1 semantics (ownership + persistence + explicit reset between cases).
                      `node 16_TESTS/gameplay_camera_pass2.test.mjs` → 30/30; `gameplay_spec_b_camera` 31/31; all test files green.
  iPhone:             NOT tested (Jah only). Touch = EMULATED synthetic pointer events.

ACCEPTANCE (brief §PASS 2):
  O1 manual orbit persists after release / timer / movement / attack / flight   → PASS (A2o, A2p ×3 modes)
  explicit reset control on the right near `+`, smooth, collision-safe          → PASS (R1: 50 px, right edge above the 2×2, no overlap; A3o/A4o; the boom probe runs during the glide)
  < 5° rear-yaw check applies to the reset with the documented time              → PASS (0.5 s + 1 frame: 546 ms)
  O2 drag both sides outside actual controls; controls own their touches          → PASS (O2a left half, O2b stick zone moves only, O2c drag over FLY ≠ press, O2d FLY hold ≠ orbit)
  preferred vs obstruction distance; no collapse along facades                     → PASS (F02a/b; niche F02c/d)
  fade restores cleanly (F03)                                                      → PASS (F03a/b, meMaterials)
  speed-FOV / pull-back / lock reframe / strike shake stay OFF                     → PASS (test contract)
  A2–A4 SUPERSEDED — O1 with replacement tests                                     → PASS
  Control Lab exposes the new fields                                               → PASS (mode, reset time, pitch-up, min readable, step, limit)

OPEN RISKS:
  · The pitch-up recovery (follow mode only) raises the view to ≤ 0.9 rad (52°) beside tall facades; the dead-end escape can reach 1.2 rad briefly (the alternative is a camera inside the wall). It is a deviation from "shorten the boom only" for the automatic view; a manual orbit never pitches automatically. Phone feel = Card A.
  · The far boom on phones (8.7 m portrait) reaches more obstructions than the 4 m desktop boom; PASS 2b reframes both (pivot).
  · Touch emulation cannot prove the real thumb reach of ⟲ CAM.

SUPERSEDED: Spec B A2–A4 / A5 (automatic return), gesture-audit "returns behind" clauses → O1. Spec B E1 → O4 (PASS 1).
CANDIDATE: not published. Live demo unchanged.
ZIP:              produced at the Card A gate (after PASS 2b + PASS 3).
NEXT:             PASS 2b — presentation pivot slice (framing presets, held-stick + orbit proof, connected movement first slice, sky / far-background slice, matched capture), then PASS 3 (HUD). Card A gate after PASS 3.
