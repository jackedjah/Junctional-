# PASS 2 — SPEC B: BEHIND-BACK CAMERA (Jah's #1 request)

Section 13 report · gameplay-lane Claude session · 2026-09-17 · repo `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS` (master) · commits
`1d3bbd2` (camera) · `1c29a6a` (gesture guard, flight input) · `17d5209` (fresh-context review fixes) on top of `pass1_spec_a` (4da1488).
R = `CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY`. Blender: not launched. Owner lanes: no Athlete_M anatomy / Character-Creator file touched.
Evidence words: *inspected* = read code / looked at an image · *rendered/measured* = ran it and captured numbers/frames · **iPhone: NOT tested (Jah only)**.
**Touch in every probe below is EMULATED** (synthetic pointer events on the real zones in headless Chrome, unlocked frame pacing) — never a phone.

## WHAT I DID (files changed, one line each)
- `R/lab/play.js` — Spec B camera: `CAMCFG` (every Spec B tunable) + `cam` state; follow = critically damped spring on the yaw error to "behind" (closed-form step, firmer while moving / flying, `CAM_TURN_CAP` kept); release = HOLD `return_delay_s` (0.5) then GLIDE `return_time_s` (0.45, smoothstep) back behind him, `return_when_idle` toggle (movement always re-engages the follow); movement frame = camera yaw latched when the stick / keys start, re-latched on lift or > `relatch_deg` (45°); framing = pivot at 0.72 H (upper chest), aim point `look_ahead_m` (2.0) ahead at 0.34 H, distance from his bounds so he fills `frame_frac` (0.50) of the SHORT viewport side (same pixel size portrait / landscape), presets = {frame_frac, pitch_home} per orientation; collision = sphere probe (`probe_radius_m` 0.35) swept along the boom, a blocked boom applied at once (never a frame inside a wall), unblocked shortening at `pull_in_speed`, lengthening at `ease_out_speed` (2.5/s), mesh fade below `fade_below_m` (1.3); speed feel = gradual `speed_pullback` + `speed_fov_deg` (5°) at run / flight speed; flight = forward flies where the camera looks (pitch below home → ASCEND, well above → DESCEND, level → HOVER; Space / C keep priority; the pitch may dip below the pivot); lock-on = the spring targets the target → him line, boom extended `lock_extend`; Control Lab groups CAMERA / CAMERA PORTRAIT / CAMERA LANDSCAPE (all live); dev API `camState / camCfg / screenBox / hudRects / projectPoint`.
- `R/lab/cameraMath.js` (new) — the pure pieces (`wrapAngle`, `springStep`, `smoothstep01`, `framingDistance`, `relatchNeeded`, `flightVertical`), node-tested.
- `R/lab/PresentationAdapter.js` — **displayed root yaw = −(host facing)** (see WHAT I FOUND), projectile heading likewise, the attack root-drive offset is a LOCAL −Z offset.
- `R/lab/fieldScene.js` — `cameraDistance(..., radius)` sphere probe, `pointBlocked(x, y, z, r)` (returns the blocking shape; decks `walkable` and platform-edge `rim` guards are ground / body rules, not walls — the host's `blockedAt` skips them the same way).
- `R/lab/touchControls.js` — window-level `pointerup` / `pointercancel` guard for a tracked finger whose release lands outside the layer (Section 2 stuck-pressed case).
- `R/lab/play.html` — joystick zone bottom-left only (`#tc-stickzone` left 0 / width 30 % / top 62 %), the four touch powers as a 2×2 block at the right (portrait) and a column beside the round-button cluster (landscape), the swipe cue out of the middle band. **The look zone `#tc-world` (left 42 % → right edge) is unchanged** — see NEXT (bounded question).
- `R/deploy/probe_spec_b.mjs` (new) — acceptance probe A–D + convention-free back check; `R/deploy/probe_spec_b_extra.mjs` (new) — E1 flight pitch, E2 lock-on, E3 re-latch, E4 speed feel, E5 collision ease; `R/deploy/probe_spec_b_gestures.mjs` (new) — Section 2 gesture audit of the affected paths; `R/deploy/probe_camera.mjs`, `probe_facing.mjs` — yaw-sign formulas updated.
- `16_TESTS/gameplay_spec_b_camera.test.mjs` (new, 27 checks) — spring (no overshoot at any dt, settles, firmer = faster, frame-rate independent), glide easing, framing (195 px in both orientations), re-latch rule, flight rule, the tracked probe records; `gameplay_spec_a_perf.test.mjs` — asserts every `route_series_pass*.json` (no later pass may regress).
- `25_HANDOFF/PASSES/spec_b/` — tracked probe records + stills; `25_HANDOFF/PASSES/perf/route_series_pass2.json`.

## WHAT I FOUND (problems, with file:line)
- **The camera was looking at his face at ±90° headings — an S13-era sign bug found by the fresh-context reviewer, reproduced, fixed.** Host convention: forward(φ) = (sin φ, −cos φ) (`play/PlayMode.js:133-138`); the adapter set `root.rotation.y = φ` while the body's local forward is −Z, and three.js R_y(φ)·(0,0,−1) = (−sin φ, −cos φ) → the DISPLAYED heading was the mirror of the host heading across Z (equal only at 0 / 180°). Every S13 "rear offset" number was measured against that mirror; the S13 stills `deploy/probe_out/cam_desk_E_wall.png` show his face after `MOVE yaw +90°` while the check passed. Fix: `PresentationAdapter.js` root target = −φ, projectile heading −h, drive offset local; camera `behind = +root.rotation.y`. Re-proved convention-free: `camState().back_err_deg` = angle between the camera forward and the way his face points, < 5° at host headings +90 / 180 / −90 / 0 in all three modes, with stills `spec_b_<mode>_back_east/west.png` (rendered, inspected: his back).
- The joystick zone (`#tc-stickzone` left 42 % / top 34 % → bottom) covered his screen box in portrait — a thumb could land on his legs ("never under thumbs"); now bottom-left only and counted in the D check.
- The touch powers row (4 × 50 px, centred in the right column) crossed the middle band in portrait and slid under the top-right mode dock in landscape (a tap meant for E hit the dock); now a 2×2 block (portrait) / a column beside the cluster (landscape).
- `pointBlocked` treated deck slabs (`walkable`) as walls → the camera counted as "inside" the tree platform while he walked under it; aligned with the host's body rule.
- The first Spec B build kept the camera position lerp while the boom was blocked (a few frames inside the wall at 6 ms frames) → a blocked boom is now applied at once.
- Flight intent model: after Space / C release the rule could stop re-sending ASCEND; fixed (the model follows the keys). Note: the first forward push at level pitch after take-off sends HOVER and ends the take-off climb — by design ("forward flies where the camera looks"), stated here.
- The `lastMove.f` component is a world-axis value, not "forward relative to the camera"; the flight rule now reads the raw forward input.

## EVIDENCE
- inspected: Spec B bullet by bullet against the diff; the reviewer's algebra check of the spring (`springStep` = the exact critically damped closed form, signs consistent, the turn cap cannot overshoot); the HUD DOM for the rect collector (58 / 56 rects incl. the stick zone, the floating stick, every round button, the powers, the bars).
- rendered/measured — `node deploy/probe_spec_b.mjs <desktop|portrait|landscape>` (records `25_HANDOFF/PASSES/spec_b/spec_b_<mode>.json`, per-frame samples of the release and hold-back inside):

  | check | desktop 1200×750 | portrait 390×844 (touch emulated) | landscape 844×390 (touch emulated) |
  |---|---|---|---|
  | A0b back check at +90 / 180 / −90 / 0° (back error) | 0.0° all four | 0.0° all four | 0.0° all four |
  | A1 drag = free orbit (DRAG, error > 25°) | −74° | −41° | −41° |
  | A2 hold after release (error moves < 2° for 0.5 s) | 0.0° over 55 samples | 0.0° | 0.0° |
  | **A3 yaw error < 5° within delay + return time (0.95 s + 1 frame)** | **0.0° at 990 ms** | **0.0° at 974 ms** | **0.0° at 977 ms** |
  | A4 stays behind afterwards (max error, 0.4 s) | 0.0° | 0.0° | 0.0° |
  | A5 return-when-idle OFF holds / A6 movement re-engages | −57° held / 0.0° | held / 0.0° | held / 0.0° |
  | **C1 hold-back 3 s ends facing away** | turned 180.0° | 180.0° | 180.0° |
  | **C2 no oscillation** (facing velocity sign changes / last-second drift) | 0 / 0.0° (406 samples) | 0 / 0.0° (583) | 0 / 0.0° (553) |
  | C3 camera behind after the hold-back | 0.0° | 0.0° | 0.0° |
  | **D screen box vs HUD / control rects** (idle, run, fly, combo; middle band 10–90 %) | 0 hits, box 29–87 % | 0 hits, box 39–66 % | 0 hits, box 29–84 % |
  | **B1 frames with the camera inside geometry** (test route + wall hug, every rAF sampled) | 0 / 8865 | 0 / 9541 | 0 / 9550 |
  | B2 frames below the ground it stands over | 0 | 0 | 0 |
  | result | 20 / 20 | 20 / 20 | 20 / 20 |

  `node deploy/probe_spec_b_extra.mjs` (desktop + portrait, both 6 / 6): E1 level camera + forward = level flight (Δalt 0.0), look up + forward climbs (+14.7 m in 2.5 s), look down + forward descends (−19 m); E2 lock-on: camera on the target → him line (0.0° error), boom 4.0 → 7.5 m, both on screen (still `spec_b_extra_desktop_lock.png`); E3 re-latch: 45° swing kept, 90° re-latched, lift cleared; E4 speed feel: FOV 55 → 60°, boom 4.01 → 4.42 m at run, both back at rest; E5 boom 4.01 → 0.90 m against the temple wall, eased out (max 0.52 m / 100 ms). `node deploy/probe_spec_b_gestures.mjs` (Section 2 audit of the affected paths): portrait 11 PASS / 0 FAIL / 4 NOT EXERCISED, desktop 10 / 0 / 5 — tap-vs-swipe, double fire, interrupted drag (pointercancel / blur), background → foreground (visibility hidden mid-drag + mid-move), rapid release / re-drag, modal race (menu mid-drag), click-through (drag from the FLY button), lock → unlock, stuck pressed (release outside the zone), duplicate listeners (3 swipes → 3 sessions) all PASS; NOT EXERCISED: swipe/slider (no slider on this path), duplicated audio (none), network loss (in-page authority), async results after ownership change (none on this path), desktop click-through (no touch buttons).
  Spec A regression (`node deploy/route_series.mjs pass2 <PASS 1 static root> deploy/static_dist 3 1120x700,390x844`, final PASS 2 build, `route_series_pass2.json`): desktop route p95 9.9 (±0.2) → 10.1 (±0.0) ms, Δ +0.2 (tolerance 0.5 → no regression), max 22.9 → 18.8; portrait 7.8 (±0.1) → 7.9 (±0.2), Δ +0.1, max 14.5 → 14.8. Per phase the only consistent movement is the desktop combo phase 10.7 → 11.6 ms (portrait combo 8.8 → 8.8, fly 9.0 → 9.0) — cause not isolated (candidates: the per-frame ground query for the camera floor, the boom probe during root snaps); logged as an open risk for PASS 3 to watch. (Absolute numbers are ~0.5 ms higher than PASS 1's series because the machine was busier; only the interleaved pair is comparable.)
  Stills: `spec_b_desktop_back_east.png`, `spec_b_portrait_back_east.png`, `spec_b_landscape_back_west.png` (his back at ±90° host headings), `spec_b_portrait_end.png`, `spec_b_landscape_end.png`, `spec_b_extra_desktop_lock.png`.
- iPhone: NOT tested (Jah only).

## ACCEPTANCE (each check → PASS/FAIL + number)
- after a swipe release, yaw error to "behind" < 5° within delay + return time → **PASS** 0.0° at 0.97–0.99 s in all three modes (hold 0.5 s + glide 0.45 s), measured at rest; a release WHILE moving skips the hold and follows at once (by design).
- zero frames with the camera inside geometry on the test route → **PASS** 0 of 8 865 / 9 541 / 9 550 sampled frames (+ a wall-hug segment). Limits: colliders only (decks / rims are not walls by the host's rule; visual-only meshes have no colliders), unlocked-fps harness.
- hold-back test (3 s) ends facing away with no oscillation → **PASS** 180.0° turn, 0 velocity sign changes, 0.0° last-second drift, all modes.
- his screen box never overlaps HUD or control rects in either orientation → **PASS** 0 hits at idle / run / fly / combo in portrait, landscape and desktop with the thumb-landing zone counted (checked at four instants, not continuously).
- Spec A metrics preserved ("no later pass may regress them") → **PASS** by the recorded rule: desktop Δ +0.2 ms, portrait Δ +0.1 ms on the route p95 (tolerance 0.5); asserted by `gameplay_spec_a_perf.test.mjs` (55/55).
- GATE: Jah iPhone recording → **NOT MEASURED (Jah only)** — see NEXT.
- Tests: `gameplay_spec_b_camera` 27/27, `gameplay_spec_a_perf` 55/55; the full suite runs in packaging (see ZIP).

## OPEN RISKS
- The camera-drag boundary conflict is unresolved by design (bounded question below). Today: look = right 58 % of the screen; the joystick zone is bottom-left 30 % × 38 %.
- "Quick-turn animation" on pull-back: there is no dedicated clip — the root turns in place under the adapter's rate limit (16/s, 900°/s cap); a real quick-turn clip is Spec E (PASS 5).
- After a release the pitch springs back to `pitch_home`, so "forward flies where the camera looks, pitch included" holds while the look finger is DOWN (or during the 0.5 s hold); a sustained climb needs Space or a held look — Jah's call at the gate whether pitch should persist in flight.
- The screen-box check uses a conservative cuboid (his width includes the arms) and four instants; portrait keeps him at 39–66 % of the height, landscape / desktop 29–87 % (feet low — tunable via `pitch_home` / `look_height_frac` in the Lab).
- Desktop mouse look is still drag-to-look (Spec C's pointer lock is PASS 3).
- The yaw-sign fix changes the world-space meaning of local-space animation cues (hit lean, emote target turn) at non-axis headings — they are now consistent with the host convention; the S13 emote / attack stills were all taken at heading 0 / 180 and are unchanged.

## ZIP
`CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/deploy/packages/PASS2_specB.zip` · 28 751 070 bytes · 102 entries (the complete flat Netlify root) · **SHA-256 `15cbe6bb7d7760fbebe90b791442d097f99a14a4cfc00de2b32265b6defbb784`** · `node 26_LOCAL_AUTHORITY/deploy/package_pass.mjs PASS2_specB`: all 26 test files (1 008 checks) → JS syntax sweep (65 files) → CSS parse sweep → runtime/cache stamps (built 2026-09-17T11:29:39Z, commit a4c89b6, clean worktree) → protected backend boundaries → secret scan (102 files, 0 hits) → ZIP → listing integrity (102 = 102) → **fresh extraction** (byte sizes match) → **smoke test rerun from the extraction 7/7** → JS sweep from the extraction clean. Record `deploy/packages/PASS2_specB.PACKAGE.json` (tracked). Not deployed: the demo project still serves the S13 build `6aab65567e997ae33c1da204` (rollback `6aab35c5cedca9fb585a2fbe`); a DRAFT deploy of this zip for the phone review needs Jah's word (no domain / DNS change involved).

## NEXT — GATE: Jah iPhone recording (max 3 baby steps) + one bounded question
Jah, on the iPhone (Safari), open the PASS 2 candidate (I will deploy it to the demo project as a **draft** only when you say so — or run the zip locally):
1. Portrait, then landscape: walk with the joystick, swipe to look, let go — record 20 s each. Then hold the stick straight BACK for 3 s and let go.
2. Open `?lab=1` and screenshot the Control Lab after ~30 s of play (this is the pending Spec A phone measurement).
3. Reply with the two recordings + the screenshot, and one word for the question below.
**Bounded question (camera-drag area):** Spec B says the swipe area is the "empty right-side area", Spec C says "any empty space on the right half"; your S13 instruction was "anywhere unobstructed, including the left, except the joystick". Which do you want — **RIGHT** (right half only, Spec B/C) or **ANYWHERE** (everything except the joystick and buttons, your S13 note)? Nothing changes until you answer.
