# PASS 1 — SPEC A: SMOOTHNESS FOUNDATION

Section 13 report · gameplay-lane Claude session · 2026-09-17 · repo `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS` (master) · commits
`5e1082b` (PASS 1) + `497bc95` (fresh-context review fixes) on top of `74b3ec5` (tag `s13_convergence`). Runtime root R =
`CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY`. Blender: not launched. Owner lanes: no Athlete_M anatomy / Character-Creator file touched.
Evidence words: *inspected* = read code / looked at an image · *rendered/measured* = ran it and captured numbers/frames · **iPhone: NOT tested (Jah only)**.

## WHAT I DID (files changed, one line each)
- `R/lab/quality.js` (new) — LOW / MED / HIGH tiers (pixel-ratio cap + floor, particle scale, clouds, city fins, fog reach, LOD distance, antialias); selection `?quality=` → saved (localStorage) → device (coarse pointer = MED, else HIGH); adaptive pixel ratio inside the tier with 60 Hz-aware thresholds `ADAPT = { drop_ms: 21, raise_ms: 17.5 }` (Control Lab tunables).
- `R/lab/controlLab.js` (new) — the Control Lab overlay: 240-frame frame-time graph, rolling 600-frame p50 / p95 / p99 of the frame interval AND of main-thread work, dropped-frame % (PROPOSED definition, labelled), > 50 ms %, tier select, live pixel ratio, draw calls / triangles, a tunables registry that reads/writes live objects (never copies). Open: `?lab=1` (phone), Backquote (keyboard), `MAHWORLD_PLAY.lab()`.
- `R/lab/fieldScene.js` — `THREE.LOD` per landmark (far level = grid-clustered copy of the runtime mesh built once at load, meshes collected before wrapping); **static-world merge** (`mergeStatic`: every static opaque mesh sharing a material is baked into one mesh per material per 120 m chunk — 119 meshes → 31; excludes MAHWORLD_SKY / MAH_EMBLEM / TREE_ELEVATOR subtrees, instanced / skinned / transparent / custom-rendered meshes); tier-driven clouds + fog; `setQuality()`, `lodInfo()`, `mergeInfo()`, `onLandmark` hook; `shapesNear` reuses one list (no `concat` per query); `tick()` caches the emblem / elevator lookups; `clear()` resets LOD list and caches.
- `R/lab/cityScene.js` — city fins are a tier option.
- `R/lab/PresentationAdapter.js` — animator distance LOD (≤ 22 m every frame · ≤ 50 m every 2nd · ≤ 100 m every 4th · beyond every 8th; skipped time carried, per-entity phase stagger, distant rigs integrate in one larger sub-step); particle count per tier; **effect recycling** (PROJECTILE / ZONE / IMPACT roots pooled by kind + radius + class colour, point sets pooled by count, re-dressed on reuse); shared soft / streak textures are never disposed (they were disposed on every effect removal before → re-upload on the next cast).
- `R/lab/RigAnimator.js` — `animate(v, dt, maxStep)` accepts the LOD sub-step (default unchanged 1/30 s).
- `R/lab/play.js` — quality + Control Lab wiring, `PERF` breakdown (entities / render / host tick / snapshot / HUD / rigs animated / main-thread work from the callback start), single `perfReset`, warm-up now also draws a PHYSICAL impact + a point set, **per-landmark and whole-scene warm draws** (culling off, both LOD levels, restored exactly) the frame after load, reused `ME_VIEW` / seen-map swap / loop-based `posOfActor`, dev hooks `perf / perfReset / lab / labSet / quality / renderOnce / fxMount / fxRemove / strikePulseDebug / mergeInfo`.
- `R/deploy/static/static_host.js` — host tick + snapshot timing exposed (`tick_ms_last_frame`, `snap_ms_last_frame`).
- `R/deploy/probe_lib.mjs` — `unlockFps` launch flags (headless Chromium otherwise paces rAF at 30 Hz).
- `R/deploy/probe_route.mjs` (new) — the Spec A test-route driver; `R/deploy/route_series.mjs` (new) — interleaved before/after series with medians + spread + tolerance rule; `R/deploy/package_pass.mjs` (new) — Section 2 packaging pipeline; `R/deploy/test_static_demo.mjs` — accepts a dist path (reruns from the fresh extraction).
- `16_TESTS/gameplay_spec_a_perf.test.mjs` (new, 53 checks) — tiers, selection order, adaptive thresholds, Control Lab statistics on a synthetic series, the tracked route series (no-regression rule), LOD evidence.
- `16_TESTS/gameplay_phase5a.test.mjs`, `24_TEST_SCENARIOS/scenarios.js` — two pre-existing failures (present at 74b3ec5, verified in a clean worktree) were measurement-timing flaws, not rule changes: MAHGIC spend is now sampled at the cast (before 4 s of regen), flight drain is sampled while flying (before the forced descent's regen). Assertions otherwise unchanged; the fresh-context reviewer independently confirmed the phase5a one is not a weakening.
- `25_HANDOFF/PASSES/PASS_0_AUDIT.md`, `25_HANDOFF/PASSES/perf/*` (tracked evidence + README), `.gitignore` (package zips / fresh folders).

## WHAT I FOUND (problems, with file:line)
- The ~600–700 ms hitch on the first strike / first special cast was NOT the effect shaders: it was the **first-sight upload of a landmark** (the gym: +98 geometries, +15 textures, one new program the first frame the camera turned to it — `renderer.info` before/after, rendered/measured) plus a **35 ms per-mount cost of every effect** (fresh geometry + materials each strike; `R/lab/PresentationAdapter.js` `remove()` also disposed the shared `SOFT_TEX`, forcing a re-upload). Fixed by warm draws at load + pooling.
- `R/lab/play.js` had two `perfReset:` keys in the dev-API object literal (last one won, so `worst` was never cleared) — merged.
- `PERF.work_ms` / `update_ms` were measured from the rAF timestamp (the vsync tick), inflating "work" by the callback lag — now from the callback start.
- Harness variance: identical builds measured p50 16 ms / p95 38 ms under machine load (other Chrome + Codex processes, a stale recorder process of mine) and p50 6 ms / p95 9 ms idle. Only interleaved pairs are comparable; the acceptance record is a 3× interleaved series.
- Pre-existing: no Control Lab, no dropped-frame definition, no bone angular-velocity threshold (PASS 0); adaptive-resolution thresholds (42 / 22 ms since S07) never reacted on a 60 Hz phone (fixed: 21 / 17.5 ms, tunable).

## EVIDENCE
- inspected: Spec A bullet by bullet against the diff — fixed step + bounded catch-up already in `static_host.js:26` (12-step cap, then re-base; no time teleport), presentation `dt` clamped at 0.35 s (`play.js`), `visibilitychange` releases held inputs; per-frame allocations reduced (listed above; remaining ones listed under OPEN RISKS); no shadow maps / post effects exist in this runtime, so tiers scale what exists (pixel ratio, particles, clouds, fins, fog, LOD).
- rendered/measured (headless Chrome, GPU on, unlocked pacing, DAY, ATHLETE_M_V8, HIGH tier, this laptop; commands: `node deploy/route_series.mjs pass1 <S13 static root> deploy/static_dist 3 1120x700,390x844`, single runs `node deploy/probe_route.mjs …`; files in `25_HANDOFF/PASSES/perf/`):

  | viewport | phase | p50 A→B | **p95 A→B (spread)** | p99 A→B | max A→B | >25 ms % | >33 ms % | >50 ms % |
  |---|---|---|---|---|---|---|---|---|
  | 1120×700 | route | 6.6→5.9 | **9.2 (±0.5) → 9.0 (±0.5)** | 11.2→10.8 | 177.9→21.0 | 0→0 | 0→0 | 0→0 |
  | 1120×700 | walk | 7.2→7.2 | 10.1→9.9 | 13.0→12.3 | 19.0→16.8 | 0→0 | 0→0 | 0→0 |
  | 1120×700 | fly | 6.3→5.8 | 8.2→8.3 | 9.3→9.8 | 13.1→14.5 | 0→0 | 0→0 | 0→0 |
  | 1120×700 | land | 6.2→5.5 | 8.0→7.8 | 8.9→9.5 | 10.3→11.4 | 0→0 | 0→0 | 0→0 |
  | 1120×700 | combo | 7.5→6.0 | 10.1→9.4 | 12.6→11.7 | 177.9→17.0 | 0.2→0 | 0.1→0 | 0.1→0 |
  | 390×844 | route | 5.5→5.0 | **7.6 (±0.6) → 7.4 (±0.5)** | 9.2→9.0 | 189.3→16.6 | 0→0 | 0→0 | 0→0 |
  | 390×844 | walk | 5.9→5.8 | 8.4→8.1 | 10.3→10.0 | 13.0→16.6 | 0→0 | 0→0 | 0→0 |
  | 390×844 | fly | 5.3→4.8 | 6.9→6.7 | 7.9→7.9 | 11.5→12.0 | 0→0 | 0→0 | 0→0 |
  | 390×844 | land | 5.3→4.6 | 6.8→6.4 | 7.6→7.6 | 9.5→11.4 | 0→0 | 0→0 | 0→0 |
  | 390×844 | combo | 5.9→5.3 | 8.2→7.9 | 10.1→9.8 | 189.3→13.6 | 0.1→0 | 0.1→0 | 0.1→0 |

  A = S13 build (74b3ec5), B = PASS 1 build (497bc95), medians of 3 interleaved runs each. Triangles at the route end 425 522 → 322 178 (desktop), draw calls 53 (desktop) / 44 (portrait); spawn view 104 calls after the merge (was ~390). Control Lab PROPOSED dropped % (B): 4.3 % desktop / 3.8–5 % portrait — meaningless on an unlocked harness, logged only. Per-phase breakdown (B, desktop): entities + animators 1.8–2.5 ms, render 2.4–4.0 ms, host tick ≈ 0, snapshot 0.3 ms, HUD 0.5–0.7 ms per 100 ms, rigs animated per frame 8.4 (walk, all near) → 2.2–2.4 (later phases). Tier illustration (portrait, single runs, pre-merge build): MED route p95 6.6 ms, LOW 5.8 ms.
  First-strike stall isolation (rendered/measured): before fixes 665–729 ms render on the first E strike (`renderer.info` +98 geometries / +15 textures / +1 program `tripo_node_…_material` = the gym); after landmark warm draws + pooling: worst frame after `perfReset` = 47–51 ms (the harness's own 1.5 s-window worst), first debug IMPACT mount first-draw 35–43 ms → 10–12 ms.
  Frames saved: `deploy/probe_out/*.json` (gitignored) + tracked copies in `25_HANDOFF/PASSES/perf/`; merged-city still checked by eye (scratchpad `merge_view.png`: plaza, halls, rims, labels, diamonds intact).
- iPhone: NOT tested (Jah only). The Control Lab is on the build (`?lab=1`); Jah's screenshots are the gate input.

## ACCEPTANCE (each check → PASS/FAIL + number)
- before/after p95 frame time on the test route, logged → **PASS**: desktop 9.2 → 9.0 ms, portrait 7.6 → 7.4 ms (3× interleaved medians, tolerance max(0.5, spread)); no regression in any phase beyond spread; enforced by `gameplay_spec_a_perf.test.mjs` (53/53) from the tracked series file.
- before/after dropped-frame % on the test route, logged → **PASS (candidates logged, definition not adopted)**: > 25 / > 33.4 / > 50 ms shares 0 % → 0 % on both viewports (combo 0.2 / 0.1 / 0.1 % → 0); PROPOSED 1.5×-median 4.3 % / 3.8 %. Jah picks the definition (OPEN RISK).
- "No later pass may regress them" → rule installed: the series file is the reference; later passes rerun `route_series.mjs` against it.
- iPhone numbers from Jah's Control Lab screenshots → **GATE — NOT MEASURED (Jah only)**; prerequisite: the packaged build on the demo project (not deployed by this pass — see NEXT) and `?lab=1`.
- Spec A bullets: fixed step + interpolation + delta clamp → PASS (inspected, pre-existing, verified by the route); no per-frame allocations → PARTIAL (reduced; remaining list below); adaptive resolution + tiers → PASS (rendered: tier/pixel ratio in every report); static world merge + LOD → PASS (rendered: 119 → 31 merged meshes, 4 landmark LODs, 104 spawn draw calls); Control Lab graph / p50 / p95 / p99 / dropped % → PASS (rendered: stats in every report); test route → PASS.
- Tests: 25 files, all passing (`package_pass.mjs` stage 1; see ZIP).

## OPEN RISKS
- Harness ≠ phone: all numbers are this laptop's desktop GPU, unlocked pacing; the phone runs vsync'd at 60 Hz where the PROPOSED dropped definition starts to mean something. p95 differences of 0.2 ms are within noise; the real wins are the removed 150–700 ms stalls and −25 % triangles / −75 % spawn draw calls.
- Remaining per-frame allocations (inspected, not yet removed): NPC / presence view literals in `play.js` (~9 per frame), `adapter.ids()` per frame, per-rig `view` / velocity objects in `PresentationAdapter.js` update, `e.particles.filter` per effect, `rulesHud` `others.filter` per entity. Next Spec A cleanup candidates, after PASS 2 camera work (which touches the same frame block).
- Animator LOD saves ~50 % of far-rig work at 60 Hz and less at 30 fps (sub-step now scales with the LOD step, but the rig's per-step cost is the floor).
- `antialias` is a context attribute: a tier change applies it on the next load. Clouds / fins apply on the next room build.
- Dropped-frame definition still PROPOSED; bone angular-velocity threshold (Spec E) still undefined — not invented.
- Landmark warm draws cost ~90–180 ms once per landmark at load (visible in the log), inside the loading phase.

## ZIP
`CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/deploy/packages/PASS1_specA.zip` · 28 742 815 bytes · 101 entries (the complete flat Netlify root: `index.html`, `netlify.toml`, `netlify/edge-functions/gate.js`, `BUILD_INFO.json`, the four runtime trees) · **SHA-256 `3a72d716da95d87c264dffe15f0b6406521b1ecaae0e87c66113efe5e3fb4630`** · pipeline `node 26_LOCAL_AUTHORITY/deploy/package_pass.mjs PASS1_specA`: all 25 test files (979 checks) → JS syntax sweep (64 files) → CSS parse sweep (2 blocks) → runtime/cache stamps (built 2026-09-17T09:14:01Z, commit df9c66b) → protected backend boundaries (gate is the only function, no stores/tests/env, no remote imports) → secret scan (101 files, 0 hits) → ZIP → listing integrity (101 = 101) → **fresh extraction** (byte sizes match) → **smoke test rerun from the extraction 7/7** → JS sweep from the extraction clean. Record: `deploy/packages/PASS1_specA.PACKAGE.json` (tracked). The zip itself is gitignored (rebuildable from commit df9c66b with the same command). Not deployed: the demo project still serves the S13 build `6aab65567e997ae33c1da204` (rollback `6aab35c5cedca9fb585a2fbe`); deploying the PASS 1 package is a separate owner decision (no domain / DNS change involved).

## NEXT
PASS 2 — Spec B behind-back camera (internal checkpoint reached; continuing without waiting). The Spec A iPhone measurement stays PENDING and is folded into the PASS 2 gate: when the PASS 2 candidate is ready Jah opens it with `?lab=1` on the iPhone and screenshots the Control Lab after the test route.
