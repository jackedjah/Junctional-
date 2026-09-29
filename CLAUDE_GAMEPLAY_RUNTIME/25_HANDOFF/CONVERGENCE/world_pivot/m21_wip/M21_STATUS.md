# M21 — final high-ROI polish pass: status at the OpenCode migration freeze (2026-09-28)

M20 is the accepted world baseline (ledger section M20 in `../MASTER_WORLD_PIVOT_LEDGER.md`). The owner opened M21 (one lead, targeted fixes,
1–3 cameras per fix, one broad evidence set at the end) and then froze the work for the OpenCode migration. Nothing below was left half-applied
in the runtime: the tree at the migration commit is clean.

## Done (committed)
- **Priority 1 — global tone** (`0cec0cd`): ACES exposure 1.15 → 1.28 in `26_LOCAL_AUTHORITY/lab/play.js` and its mirror
  `deploy/world_preview/world_preview.js`. In-page tests at V03 / V05 / V07 / V13: hemisphere ×1.3 and sun ×1.18 barely moved the image
  (the look is environment-led); exposure is the one even lever. +0.1 exposure = median lightness +0.02, chroma +3 %, near-white share unchanged.
  `16_TESTS/gameplay_world_warm_class_light.test.mjs` models the same exposure (7/7). Full-suite status unchanged (not re-run after this one-line change).

## In progress (NOT applied — preserved as a patch)
- **Priority 2 — small cloud "capsules"** (`cloud_heaps_UNVERIFIED.patch`, against `lab/world/cloudBodies.js`): for the HEAP form only, the cell
  field shapes the dome more (`pow(.,0.6)*(0.5+0.5x)` → `pow(.,0.75)*(0.3+0.7x)*(0.8+0.4 f.g)`) and the footprint edge noise rises 0.2 → 0.38.
  It was rendered once (V09 / MX / V21) but the render was never reviewed, so it is unverified. Apply with `git apply`, render V09 / MX / V21 day
  with `deploy/world_preview/capture.mjs`, compare against the current frames, keep only if the small clusters clearly read less like capsules
  without stipple. Rejected on the way: lowering the field blur (`lodB` ×0.4) brings back checker stipple inside clouds.
- **Verdict 2026-09-28 (OpenCode lead, rendered V09 / MX / V21 day before + after, 2x zoom crops): no visible change —**
  the heap clusters read as smooth capsules in both sets, full-frame and zoomed. Patch REVERTED, tree clean; the file above
  stays parked. Do not re-try this exact variant; any new attempt must first confirm the visible capsules are the HEAP form.

## Not started (owner's M21 list, in order)
3. Terrace-tree grounding: small per-tree planted pits on the north terraces (NOT the rejected full soil overlay — see ledger M20 "removed").
4. Veil Falls close-range banding (inside / very near the fall) — smallest shader adjustment; normal views win if in conflict.
5. LEAN identity: `LEAN_SPIRE_HOUSE` (-110, 272) is buried in `MACRO_RIDGE_RIDGE_NEAR`; try a low-cost visibility correction; flag if it needs relocation.
6. MED plaza-floor shader cost (+33 % static ALU vs a330208, `surfaceDetail.js` zonedPaving MED path): same look, cheaper MED branch.
7. One quick audit for obvious defects. Candidate seen: a thick bright-yellow gold rail in the MX foreground (the plaza edge ring's brushed
   gold from the M20 identity pass) — check at eye level whether it reads garish.
Then the owner's final exit test (major defects? another large pass justified? ready for the first character calibration pass?) and, if yes,
a clean PRE-CHARACTER WORLD CHECKPOINT. Character integration waits for explicit owner authorization.

## Reference add-on 01 — GUIDE PILLARS (done, OpenCode lead 2026-09-28)
- **Site:** NEXUS south perimeter (0,-70) yaw 0 — open sand, zero colliders r12, lamp 10 m N, doors/courts/routes 20 m+.
  B (training forecourt) rejected: gym-lane + door queue + inlay overlap. C (FOREST_W clearing) rejected: the clearing IS the pond.
- **Build:** `lab/world/ledArtifacts.js` (new) + worldB registration; two 5.2 m platinum drums (dark graphite-platinum body),
  graphite collars, chrome dome caps, gold finials, stone plinths, contact decals; 14 draws all tiers (LOW: plain, SEG 10).
  Registry via one guarded builder line (+73 JSON lines); CYLINDER colliders r0.75/h5.2 via a 1-line authority branch
  (9457 → 9459 shapes, `--check` IN SYNC, dev.json +22 hand-minimal); `guide_meet` encounter reservation DISABLED.
- **LED:** 2 feathered travelling bands + slow 16 s pearl-bridged 5-class cycle in GLSL only (emissive cap 0.62, hue survives
  ACES); day gain 0.55 / night 1.0; shared wall-clock; no strobe. All 11 hex literals in-law (colour law 4/0).
- **Corrections:** v1 clipped white (flood) → dark body + cap; v2 still flooded (weak modulation) → deep band floor; a syntax
  slip broke two renders, caught by `--check` discipline (now run after every edit). Mast-ring reuse tried, subliminal by
  design, REVERTED (cityScene zero diff) — reuse gate UNMET by decision, not by oversight.
- **Evidence:** `evidence/m21_guide_pillars.jpg` (R1A/R1B day/night); 8-phase night loop GIF + MED 393x852 frames (local refpack
  dir); probes: module builds on MED, 3 HEAP bodies total in sky (visible capsules likely STREET/SHEET — do NOT retry the
  parked HEAP patch; verify form first). Tests: colour_law 4/0, host_safety 21/0, combat_zones 8/0, duel_roster 12/0,
  warm_class_light 7/0, material_realism 10/0; build_static_demo 200 files clean. Independent review: KEEP (4/5 gates).
- **Follow-up (queued, not started):** fascia-line travelling band in own-class colour (hook: architecture.js pushColored +
  ARCH_SEAMS uT; evidence: 1 house closeup clip) to close the existing-accent reuse gate. Then terrace grounding (M21 #3).

## M21 #3 terrace grounding (done, OpenCode lead 2026-09-29, commit 3cf6db3)
- 11 terrace-slab trees (FOREST_N_W/E + BAGE, gy 0.5, failing the bed-edge test) get merged soil discs (r = pitR)
  + stone course rings (+0.35 m) in forest.js only: 2 draws, +0.8k tris, HIGH/MED (LOW builds none), flush decals
  (max 2 cm proud, contactAO precedent), no registry / collider / geometry change. Packet: live_review packet 02 (W/E day/night + MED).
- Route taken after a reverted shader attempt: a slabMat pit patch compiled but sampled nothing visible and then failed
  program validation (slab vanished, hidden district-floor bed showed through) - root cause not isolated; reverted fully.
  Flush merged decals chosen as the robust vehicle. Tests: tree_lod 8/0, material_realism 10/0, colour_law 4/0, host_safety 21/0.

## M21 #4 Veil close-range banding (assessed 2026-09-29: REJECTED, fully reverted, tree clean)
- BEFORE at curtain base (WB1), lip (WB2), foot (FP): hard lateral striping + white core blowout + a diagonal sheet seam.
- Tried: streak smoothstep 0.32-0.92 -> 0.22-0.95 and alpha floor 0.6 -> 0.68. AFTER: no obvious change at any cam.
- Cause judgement: striping is structural (discrete vfStrand strands + sheet/boundary geometry, not the noise ramp);
  the FP diagonal is a sheet boundary no ramp can feather. Normal views stay strong - no further falls shader churn
  without owner direction. A geometry-pass note (hem/seam continuity) is the honest vehicle, not another constant tweak.

## M21 #5 LEAN spire house (assessed 2026-09-29: FLAG, no fix attempted)
- Rendered LEAN1/LEAN2 day: the house body is entirely inside MACRO_RIDGE_RIDGE_NEAR; only the 22 m platform edge
  + spire crown show (a small red/white element floating high on the rock face). Any visibility correction needs
  relocation or ridge reshaping = a layout change. Per owner direction: STOP and FLAG rather than start a cascade.
- Owner decision needed: relocate / reshape / accept as a ridge-crown folly. Red LEAN road + terrace groves read well.

## M21 #6 MED shader cost (measured 2026-09-29: PARKED, no cut)
- MED zonedPaving fragment: 167 ALU-tokens vs 103 at a330208 (+62% broad count; the +33% in the brief is a narrower
  count - same direction). Fetches 4 vs 1. Spec-level trims move nothing (bevel:0 saves 6, grain/macro:0 save 0 -
  cost is structural). Real cuts mean removing accepted M20 look (soft patches, bevel relief, wear channels, pits),
  each needing MED proof renders + regression risk, with no phone profile proving a real problem (static counts are
  not frame times; LOW held per law). Verdict: park until a physical-device profile justifies it.

## M21 #7 defect audit (2026-09-29: rail cleared, one unidentified cluster flagged, fragment tweak reverted)
- Gold rail (MX foreground) = the flat NEXUS gold inlay ring (RingGeometry #d9b25a, r52) at grazing angle. Fine at
  player eye level (PLAZA frame shows warm granite, no bar); bold from low aerials as a landmark ring. NO CHANGE.
- White square-diamond + pole cluster ~(30..36,-36..-28) + white humanoid groups on the east plaza: UNIDENTIFIED after
  12 probes (ruled out: wayfinders/crowns/posts by instance positions, sprites, gear bush-hints, combat scale refs
  which need ?scaleRefs, NEXUS-fragment cause, horses by name, gold census). Rays pass through to ground (shader-
  displaced or points); base geometry sits at origin. A plaza-fragment shrink (fcl size x0.55 NEXUS-only) showed NO
  visible effect and was REVERTED (unproven changes do not ship). Needs live-devtools follow-up or owner eyeball -
  do not burn more blind probes.

## M21 #7 audit close-out (2026-09-29)
- Rail: cleared (flat NEXUS gold inlay ring, fine at eye level). Blue plaza splotch: authored floor-canvas paint. Horses: ambient life, fine.
- Cream diamond-sprout cluster ~(30..36,-36..-28): 19 probes. Ruled out: wayfinders, sprites, gear hints, scale refs,
  NEXUS-fragment cause (shrink had no effect, reverted), horses-by-name, road furniture, shards, courts (only 2 placed:
  (45,110) + (-47,121.5)). Rays pass through (points/shader-displaced); base geometry at origin. Best remaining
  hypothesis: meadow walk-side tufts with seed-head tops (unconfirmed). Crop evidence kept at refpack audit_crop paths
  for owner eyeball - do not burn more blind probes; needs live devtools or a second camera side.
- Suite: 71 files, 38 ok, 656 checks, 33 known-fail (mahgic_tree 30/0 only with static_dist present - kept deliberately).
