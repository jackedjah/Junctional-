# MAHWORLD LIVING CHARACTER PASS — OPERATIONAL HANDOFF
_Updated 2026-09-16 for **MOTION MASTER TASK B** (intact anatomy, authored motion, playable demo). The rig-repair record (R1–R8) and the living-character record follow below and stay valid where this section does not supersede them._

Owner brief: the V3 clip was reviewed and the separated-leg deformation, shoulder action and transformation choreography were rejected. This section records what was actually broken, what replaced it, the three owner decisions as implemented, and what is still visibly wrong. Nothing was purchased, uploaded or deployed; sources and Astra/Codex files were read-only; the owner's Chrome, Codex session and processes were left alone.

## M1 · Versions that load today

| id | file | sha256 | what changed |
|---|---|---|---|
| **ATHLETE_M_V4** (default) | `26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.7/Mah_Athlete_M_am08_v4.glb` | `853e366f1c78166e…` | complete lofted legs, deltoid cap bound to the humerus, asymmetric knee blend; textures unchanged (AM08 + K3) |
| ATHLETE_M_V3 | `…/dev_0.6/Mah_Athlete_M_am08_v3.glb` | `cd73afc760c19261…` | the build reviewed and rejected — `?avatar=ATHLETE_M_V3` |
| ATHLETE_M_V2 | `…/dev_0.5/…v2.glb` | `a17b70a757b1175b…` | the first reviewed build — `?avatar=ATHLETE_M_V2` |
| **TITAN_M_V3 / BAGE_F_V3 / LEAN_F_V3** | `lab/assets/{titan_m,bage_f,lean_f}_preview/dev_0.3/` | `96158eee…` / `bac5b773…` / `39000c36…` | same pipeline with their own landmarks; dev_0.2 / dev_0.1 kept |

**rig_version** and **appearance_version** are recorded in the developer note (`glbInfo` → dev panel / reports), not the player HUD. Appearance is still `AM08_BASE_CLOSED_RETAINED textures + AM02 K3 eye mask` — **the S05N Codex appearance package was not available at this checkpoint** (`CHARACTER_EXCHANGE\CODEX_APPEARANCE` did not exist; the root and `README.md` were created, my output is at `CHARACTER_EXCHANGE\CLAUDE_RIG\RIG_2026-09-16_V4\` with `handoff.json` `package_complete: true`). Continuation action when Codex delivers: run `make_class_rig_v3.mjs` on the new geometry (measurement and binding are topology-independent) and re-run `16_TESTS/gameplay_{rig_bind,leg_surface,rig_pose_fk}.test.mjs`; do not reuse vertex-index weights.

## M2 · What was actually wrong, measured on the reviewed asset

- **The separated legs were not a surface.** The cut-half + mirror construction has **1299 non-manifold seam edges**; in an ordinary swing (knee 54°, hip 32°) triangles collapse to **0.10×** their length with 18 inversions, and 108 inversions in a deep gather (`16_TESTS/gameplay_leg_surface.test.mjs` on dev_0.6). That is the pinched, discontinuous look at 35–40 s. A PACKED morph cannot add the missing triangles, so the construction was replaced (`lab/assets/rig_legs.mjs`): each leg is a **closed loft of 34 elliptical rings × 22 segments** sized from the fused body's own sections at every height, dense loops around the measured knee with a patella swell and posterior fold, a closed tip and a hip dome, UVs from the nearest fused-body vertex, and a PACKED target that is the same topology pressed onto its half of the fused silhouette. Result on all four bodies: **manifold, 0 open edges, 0 inversions** in the swing and in the X-gather; the knee keeps 98 % of its section.
- **The knee blend.** With a real tube the first blend band pinched the inside of the knee; it is now the joint's own diameter below the knee and no more than 40 % of the thigh above it (Titan and Bage have a 9 cm thigh — a symmetric 7 cm band handed the hip to the shin).
- **The shoulder cap was fixed.** The clavicle segment runs horizontally through the deltoid, so the geodesic solve gave the cap to CLAV and the arm rose under a stationary shoulder (60–62 s). The deltoid cap (outer shoulder shelf from the joint up to the top of the arm mass, outside the torso column) is now seeded to **UPPERARM**, and the animator adds **scapulohumeral rhythm**: past ~30° of abduction the clavicle elevates at a third of the arm's rate, forward flexion protracts it, and the chest rolls slightly toward a high arm.
- **The gather folded backward.** The tuck used positive THIGH/TAIL x, which on a hanging bone swings the limb *behind* the body (29–31 s). Replaced by the owner's choreography (M3).

## M3 · The three owner decisions, as implemented

1. **Crossed forearms (no 75° cap for this pose).** Fitted by forward kinematics on the delivered skeleton against the measured chest: the pectoral surface is 0.175 m ahead of the CHEST bone and the torso half-width 0.16 m. Fit: shoulders flexed 52°, **internally rotated 95°**, elbows held 19 cm out beside the lower pectorals, elbows bent 69°; forearms lie on the chest, hands meet at the sternum and just past it, the left forearm a touch ahead. **What actually limited the X was humeral rotation (±34° in the shared table), not the elbow** — the transformation's own allowance (`rig_profile.pose_overrides.transformation`) raises `UPPERARM_y` to ±100° and the hip/knee ranges; the elbow stays inside the shared 75°. A full reach to the opposite shoulder is not available on this chest depth with these limb lengths; that is recorded, not hidden. The coarse clearance ellipsoid stands aside for this pose (it is wider than the real torso); the FK test checks the real chest front instead.
2. **Slow sideways glide.** A held sideways input is a continuous controlled glide (`lateral_glide` in the profile): chest yaw 10–16° toward travel, pelvis 5–8°, a 3–6° bank, the leading arm opening 18° toward travel, the trailing shoulder settling 10–14° back with a loose hand; preparation 0.18 s, brake 0.28 s, reversals blend through neutral. Never DASH. The adapter now passes the signed lateral share of travel; world +x is model −x on the 180°-turned body, so the lead side is resolved from the rig's real handedness.
3. **Hovering separated gait.** Presentation lift = max(3.5 cm, 7 % of the measured leg) in separated form, eased through the transformation, with a small never-negative bob on the gait phase; the authoritative height and capsule are untouched. Asserted: neither tip reaches the ground through the whole walk; the fused form does not lift.
4. **Separation choreography.** Gather = knees to the navel (hip 106°, knee 117°), pelvic tuck as a *posterior* tilt, restrained spine rounding, the X above; the packed leg pair is shown from the first beat so the knees gather as one mass without tearing a fused bridge. Release = a quick star with 6 % overshoot (the shortest beat: 0.38 / 0.22 / 0.40 of the existing host duration). Settle = into the hover. FUSE reverses it. Host timing, costs and cancellation untouched.

## M4 · Angle convention and profile

`rig_profile.json` now states **bend from straight (0° = extended) with an explicit axis and sign per joint** (`angle_convention.joints`); the earlier INSIDE-angle table is kept as source data only and converted at that boundary. The transformation allowance, glide and hover parameters live there too; per-character fitting values stay in each manifest (`measurements`, `legs_measured`).

## M5 · Motion resources (one bounded inventory)

No FBX/BVH in Downloads or the project; no Auto-Rig Pro or AccuRIG installed; **iClone 8 is installed** with Basic Walk / Basic Run / Idle / Boxing presets, but `.iMotion` is GUI-only and no export was possible without opening the owner's iClone. Mixamo/Rokoko need an account download. **The four foundations (idle, walk, run, punch) are therefore AUTHORED procedurally on the repaired rig and labelled so** in `lab/motion_retarget_profile.json`, which also records the bone map (Mixamo and CC names), axes, units, rest-offset policy, in-place root treatment and the hover adaptation, plus the exact one-step owner action for either source. No motion file was used and none is claimed.

## M6 · Verification (focused, not the whole suite)

`rig_bind` 26/26 on each of the four assets · `leg_surface` 8/8 on each (new) · `rig_limits` 63/63 (updated to the owner decisions: the transformation is checked against its own allowance; the gather must bring the knees *forward*) · `pose_anatomy_fk` 33/33 (new checks: X in front of the pectoral surface and crossing, knees forward and high, star span, settle, glide yaw/pelvis/bank/lead arm/mirroring, hover clearance) · anim data 46/46 · emotes+NPCs 21/21 · beam audio 12/12 · asset slot 11/11 · play sample 97/97. Runtime boot: 0 page errors with ATHLETE_M_V4 in the daylight field. The other suites were **not** rerun in this pass (per brief); the previous 17-suite result stands as historical.

## M7 · Footage and stills

| what | path |
|---|---|
| **the recording** — one pass, 105.4 s, 1024×576, **10.6 fps** measured (captured in a quiet window; see M8), 0 page errors, no audio | `26_LOCAL_AUTHORITY/evidence/play/video_motion_master/video/mahworld_rig_repair_clip.webm` + `marks.json` + chapter stills |
| full-resolution stills, each captured **on the pose** (a dev-only `holdPose` freezes one entity's animator so a 1.3 s transition can be photographed), with the composed joint angles beside each | `26_LOCAL_AUTHORITY/evidence/play/rig_repair_stills/v4_*.png` + `v4_index.json` — `v4_03b_x_gather.png` / `v4_03c_x_gather_side.png` (the X-gather), `v4_05_knee_mid_stride.png`, `v4_06d/06e_lateral_glide_*.png`, `v4_02_elbow_deep_flex.png`, `v4_03_guard_shoulder.png` |

The recording has **no audio** (canvas screencast only). Clip order: idle → fused travel → flight → SEPARATE (X-gather, star, settle) → separated hover walk front-three-quarter then rear → lateral glide right and left → FUSE → DOUBLE_BICEPS + UPRIGHT_ROW → one action per attack mode → fingertip trail near and at ~25 m.

## M8 · Still visibly wrong / limits (say it plainly)

- **Capture rate.** Headless Chrome on SwiftShader; while the owner's Chrome/Codex session was active the page rendered at 300–900 ms/frame (2–3 fps), against 111 ms when quiet. The recorder waits for a quiet window; the clip's measured rate is in its `marks.json`. It is not a GPU or phone measurement. Judge shapes from the stills and timing from the clip.
- The gather shows the knees as **one packed mass** until the burst (a transitional packed pair); the two knees separate at the star. This is the coherent-surface option the brief allows, not two visibly independent knees during the gather.
- The X's hands meet at the sternum, not at the opposite shoulders (chest depth vs limb length — measured, above).
- Bage_F: a 69° arm raise still moves the outer ribcage 12 mm (its shoulders are only as wide as its ribs). Lean_F's elbow is a proportional station. Split-leg inner faces now have real geometry, but their UVs are nearest-vertex copies of the fused body, so the inner thigh texture is a mirror of the outer.
- Blinking is a shader fade of the K3 mask; expressions are coarse derivative bones; no lids, no globes — the Codex package is the route to real eyes.
- No captured motion; foundations are authored.
- `renderer.shadowMap` still off (blob shadows). `surface_contact_m` still defaults in `BeamFx.js`.

## M9 · Launch (three steps)

1. Double-click `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\START_MAHWORLD_RULES_17_23.cmd` (PC) or `START_MAHWORLD_PHONE_TEST.cmd` (phone on the same Wi-Fi, open the printed `http://<pc-ip>:<port>/lab/play.html?field=1`).
2. Skip the guide; left thumb / WASD to move, hold a sideways input for the glide, F for FLY, MORE → SEPARATE / FUSE (or the form control), long-press MORE for the emote radial.
3. `?avatar=ATHLETE_M_V3` shows the rejected build for comparison; `?avatar=ATHLETE_M_V4` is the default.

## M10 · Files changed in this pass

`lab/assets/rig_legs.mjs` (new), `lab/assets/make_class_rig_v3.mjs` (legs, deltoid cap, knee blend), `lab/RigAnimator.js` (choreography, transformation allowance, glide, hover, girdle rhythm), `lab/PresentationAdapter.js` (lateral share, hover lift, holdPose), `lab/play.js` (V4 default, NPC dev_0.3, rig/appearance versions, holdPose hook), `lab/rig_profile.json`, `lab/motion_retarget_profile.json` (new), `16_TESTS/gameplay_leg_surface.test.mjs` (new), `16_TESTS/gameplay_rig_limits.test.mjs`, `16_TESTS/gameplay_rig_pose_fk.test.mjs`, `16_TESTS/gameplay_rig_bind.test.mjs`, `evidence/play/rig_repair_stills.mjs`, `evidence/play/cdp_playtest.mjs` (clip chapters). Checkpoint: `26_LOCAL_AUTHORITY/evidence/checkpoints/motion_2026-09-16_after/` with `SHA256SUMS` (the pre-pass state is `rigrepair_2026-09-15_after/`).

---

# RIG AND MOTION REPAIR RECORD (2026-09-15, late) — superseded where M1–M10 say so
_Updated 2026-09-15 (late) for the **RIG AND MOTION REPAIR** pass. The living-character record from earlier the same day is kept below, from "EARLIER RECORD" onward; where the two disagree, this section is current._

Owner brief for this pass: the portrait recording was reviewed and **the deformation and movement quality were rejected**. This is the repair record — what was actually wrong in the asset, what changed, and how each claim was measured. Nothing was deployed, purchased or installed. Astra's editable masters, `RAW_10_MODELS`, `WORKING_10_MODELS` and the owner's processes were read-only: the four source GLBs and the two Astra textures were re-hashed after the pass and are byte-identical.

## R1 · Runtime character versions (what loads today)

| id | file | sha256 | what it is |
|---|---|---|---|
| **ATHLETE_M_V3** (default) | `26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.6/Mah_Athlete_M_am08_v3.glb` | `cd73afc760c19261…` | the repaired rig: measured cross-section joints + geodesic surface binding. Same 30 joints, same two body primitives (`upper` / `fused_lower`), same `*_SPLIT_LEGS` mesh with the `PACKED` morph, same AM08 + K3 textures as v2 |
| ATHLETE_M_V2 | `…/dev_0.5/Mah_Athlete_M_am08_v2.glb` | `a17b70a757b1175b…` | **the version the owner reviewed** — kept for comparison and rollback (`?avatar=ATHLETE_M_V2`) |
| **TITAN_M_V2** | `lab/assets/titan_m_preview/dev_0.2/Mah_Titan_M_v2.glb` | `09c23e6cc3b225a5…` | NPC body, same repair |
| **BAGE_F_V2** | `lab/assets/bage_f_preview/dev_0.2/Mah_Bage_F_v2.glb` | `3e879ac10fc6c848…` | NPC body (the owner's "Warlock": the class stays **BAGE**, the name is recorded as pending) |
| **LEAN_F_V2** | `lab/assets/lean_f_preview/dev_0.2/Mah_Lean_F_v2.glb` | `ce7c1de96d8a0679…` | NPC body for LEAN — Lean_M still unusable (1.93 M triangles, no retopo), Lean_F stands in |

Sources (read-only): `WORKING_10_MODELS/Mah_{Athlete_M,Titan_M,Bage_F,Lean_F}.glb`; Athlete textures from `ASTRA_VISUAL_CLEANUP/ATHLETE_M/04_TEXTURE_WORK/…` (AM08 base + AM02B eye mask). The older Athlete builds (dev_0.2–0.5) and the v1 NPC rigs (dev_0.1) stay on disk and selectable.

## R2 · What was wrong, and what it is now

Every number is measured from the asset by `16_TESTS/gameplay_rig_bind.test.mjs`, which evaluates linear blend skinning straight out of the GLB. Heights are fractions of body height H (Athlete H ≈ 1.82 m, so 0.01 H ≈ 1.8 cm).

| body | elbow (reviewed → repaired) | wrist | knee | shoulder |
|---|---|---|---|---|
| Athlete_M | 0.586 → **0.635** H | 0.469 → **0.520** | 0.220 → **0.316** | **0.752** |
| Titan_M | 0.581 → **0.631** | 0.453 → **0.506** | 0.220 → **0.350** | **0.755** |
| Bage_F | 0.591 → **0.660** | 0.470 → **0.525** | 0.220 → **0.350** | **0.760** |
| Lean_F | 0.575 → **0.618** | 0.442 → **0.526** | 0.220 → **0.265** | **0.755** |

- **The elbow sat inside the forearm and the knee inside the calf.** The old generator used fixed fractions of a limb (elbow at 46 % of shoulder-to-fingertip, knee at a constant 0.22 H for every body). On the Athlete that is ~9 cm low at the elbow and ~17 cm low at the knee — the arm appeared to bend mid-forearm and the leg to fold inside the calf bulge. Joints are now the **narrowest cross-section between the two neighbouring bulges**, and the shoulder sits **inside the humeral head** (one arm-radius below the top of the arm mass), not on the deltoid surface.
- **An arm could pull the ribs.** On Lean_F, bending one elbow moved the torso surface **188.9 mm**; it now moves **0.22 mm**. Weights follow the surface (geodesic distance over the welded mesh graph), so influence has to travel over the armpit to reach the ribs.
- **Joint sections hold under load.** At the profile's deepest legal elbow bend (75° of flexion) the elbow keeps 85 % of its rest section on the Athlete (was 83 %) and 93 % on Bage_F (was 74 %); the knee keeps 87 % at 69°.
- **The three NPC bodies had no arm bones at all.** Their arm/torso separation was found with an empty-bin gap in the |x| histogram, which only exists when the arms hang clear of the body. On Titan, Bage and Lean the arms touch, the search ran past the silhouette, and the arm vertex set came out empty. Separation is now the **density minimum walked inward from the arm mass**, and all three have working arms.
- **The animator and the asset disagreed about which side was which.** The shipped rigs put `_L` bones at model **−x** with the face at **+z** (the runtime turns the whole body 180° about Y, which moves the character but mirrors nothing). The procedural poses were authored for `_L` at +x, so shoulder abduction ran inward and at idle the elbows were being driven into the ribs. The convention is now resolved in **one place** (`RigAnimator.js`, from the rig's own bone positions); authored clips keep the asset's convention; tests read the rest skeleton from the GLB (`16_TESTS/lib/rest_from_glb.mjs`) instead of a typed-in fixture.
- **Below 10 fps the character animated in slow motion.** `play.js` clamped the frame delta to 0.1 s, so at 3 fps the performance advanced a third of a second per second while the host kept moving the body at full speed — floaty, late motion, and it affected the footage the owner reviewed. The animator now spends the real elapsed time in 1/30 s sub-steps, still bounded so a stalled tab cannot integrate a 10 s jump. Asserted: 1 s at 4 fps reaches the same pose as 1 s at 30 fps.
- **The shoulder-girdle retraction did nothing.** The row and upright-row poses retracted with `CLAV_z`, but the clavicle runs along x, so rotating it about z only lifts the shoulder. Retraction moved to `CLAV_y`, and `rig_profile.json` gained the missing `CLAV_y` range.

## R3 · Method and tools (reusable; per-character values stay in each manifest)

`lab/rig_profile.json` holds the **method and the art-direction limits only**. Per-body fitting values — measured landmarks, section radii, and whether each joint came from a narrowing or a proportional station — live in each asset's `manifest.json` under `measurements`.

- `lab/assets/rig_measure.mjs` — cross-section landmark finding: section profiles, bulge peaks, the narrowing between two bulges, the arm/torso density separation, the shoulder-girdle band. A candidate joint is accepted only when the narrowing **survives a half-band shift** of the profile; otherwise the fit falls back to a proportional station and says so in the manifest.
- `lab/assets/rig_weights.mjs` — geodesic binding: weld by position, build the surface graph, claim a territory per bone, multi-source Dijkstra per bone, weight by a gaussian of geodesic distance whose **sigma is measured** as that bone's own limb thickness. Top-4, normalised. A soft lateral gate (the same measured separation) keeps a shoulder field out of the middle of the chest.
- `lab/assets/make_class_rig_v3.mjs` — writes the GLB. Everything structural is unchanged from v2: two body primitives with their `extras.role`, the split-leg mesh with the `PACKED` morph, materials and embedded textures.
- **Blender** (Microsoft Store 5.2.1, headless) was used only as an independent check of the measurement, in `lab/assets/rig_solve_blender.py`; its cross-section numbers agree with the JS ones (Athlete knee 0.3255 vs 0.316 H, elbow 0.622 vs 0.635 H). **Its bone-heat solver cannot bind these meshes** — it creates the vertex groups, assigns zero weights to every vertex, and still reports `FINISHED` — and its glTF export dropped the skin and merged the two body primitives. That export is kept, clearly marked, at `athlete_m_preview/dev_0.6/rejected_blender_export/` with a README; it is not the delivered asset. AccuRIG / Character Creator are not installed on this machine.

**Angle interpretation.** `rig_profile.json` uses the **INSIDE angle**: a straight elbow is 180°, so the Athlete's deepest elbow of 105° inside means **75° of flexion**, not 105°. Runtime bone values are radians of flexion from rest (`flexion_rad = (180 − inside_deg)·π/180`). On this rig a bone that hangs down swings forward on **negative** x and a bone that points up bends forward on **positive** x, so the elbow closes at `FOREARM_x −1.31`, the knee at `SHIN_x +1.48`, and the hip lifts at `THIGH_x −1.31`. Limits are applied after the whole layer stack composes, so an emote stacked on travel and a guard still cannot escape them.

## R4 · Verification (re-run on the delivered files)

- **`gameplay_rig_bind`** — 26/26 on each of the four assets: one skin, IBMs match, both body primitives keep their roles, the `PACKED` morph survives, weights normalised with ≤ 4 influences and no unweighted vertex, every body bone bound, elbow/wrist/knee at measured narrowings (or at a station the manifest declares), bending an elbow moves the hand > 5 cm while torso, head and other arm move < 0.01 mm, and the joint sections hold.
- **`gameplay_rig_pose_fk`** (new) — 19/19: composed poses are run through the real skeleton and checked as *anatomy* rather than as signs — hands stay on their own side, a guard puts both hands in front of the chest, travel leans forward inside the 5–12° band, the separated legs swing in antiphase with real stride and ground clearance, and DOUBLE_BICEPS holds the elbows wide instead of crossing them at the throat. This is what exposed the side-convention split.
- **`gameplay_rig_limits`** — 57/57 (55 from the animator work plus two frame-rate fidelity assertions).
- Full suite, 17 files: **748 assertions, 0 failures** — anim data 46, asset slot 11, attack stack 22, beam audio 12, emotes+NPCs 21, loadout 4/2/2 16, OD-29 26, phase 4 85, phase 4.1 33, **phase 5A 46/46**, phase 5B 46, play sample 97, rig bind 26, rig limits 57, pose FK 19, rules 17–23 60, runtime 125.
  - Phase 5A's HTTP-transport convergence check, reported as failing under load in the previous pass, **passed in this run**. It is load-sensitive rather than fixed; treat a future failure there as the same intermittent issue.
- Runtime boot: `play.html?field=1` loads `ATHLETE_M_V3` in the daylight field with **0 page errors**.

## R5 · Footage and stills

| what | path |
|---|---|
| **The recording** — one pass, 102.7 s, 1024×576, 8.9 fps, 0 page errors | `26_LOCAL_AUTHORITY/evidence/play/video_rig_repair_clip/video/mahworld_rig_repair_clip.webm` |
| chapter marks + one still per chapter | `…/video_rig_repair_clip/video/marks.json`, `still_00…08.jpg` |
| full-resolution joint stills (1600×900), each captured **on the pose**, with the composed joint angles recorded beside it | `26_LOCAL_AUTHORITY/evidence/play/rig_repair_stills/` + `repaired_index.json` |
| the same clip at 1600×900 (slower capture) | `…/video_rig_repair/video/mahworld_rig_repair_desktop.webm` |
| daylight and effects evidence | `…/evidence/play/daylight_beams/NOTES.md` |

Clip order: idle close-up → fused travel from the side (accelerate, turn, stop) → flight → SEPARATE → separated walk from three-quarter → FUSE → DOUBLE_BICEPS and UPRIGHT_ROW → one action in each of the three attack modes against the dummy → fingertip trails close up and again at ~25 m. Drawers are closed throughout and the scene is daylight.

The stills are the better evidence for *deformation* (the clip's frame rate is a property of this machine — see R6). `repaired_02_elbow_deep_flex.png` holds 1.25 rad of elbow flexion, the profile limit, with the elbows clear of the ribs; `repaired_05_knee_mid_stride.png` catches 0.95 rad of knee flexion mid-cycle.

Both recording drivers live beside the evidence: `evidence/play/cdp_playtest.mjs --layout clip --field --video --clip` for the clip, `evidence/play/rig_repair_stills.mjs` for the stills.

## R6 · Honest limits from this pass

- **The recording's frame rate is this machine, not the game.** Headless Chrome on SwiftShader (software rasteriser, no GPU) at 8.9 fps; an owner session running concurrently pushed earlier takes to 2–3 fps. It is not a phone or GPU measurement, and browser-emulated touch is still not a physical-phone acceptance pass.
- **Lean_F's elbow is a proportional station, not a measured narrowing.** Its arm profile has no narrowing that survives a half-band shift — the limb is thin and the mesh sparse there (11–25 vertices per section). The manifest declares `elbow_source: proportional_station`, and the bind test checks it against that claim instead of pretending it was measured.
- **The cocoon gather no longer wraps the arms around the shins.** Inside the 75° elbow limit it is a rounded, compact silhouette rather than a ball. A tighter tuck needs corrective shapes or a helper joint, not a wider limit.
- A textbook upright row (elbows above the hands) needs about ±90° of humeral rotation; `UPPERARM_y` is capped at ±0.6 rad, so the move is authored as a high pull. Raising that limit is an art-direction decision, not a bug fix.
- **No real shadows.** `renderer.shadowMap` is off and the field keeps blob shadows; enabling it needs lights and meshes flagged to cast, a scene change this pass did not make.
- `surface_contact_m` still defaults inside `BeamFx.js` and should move into `presentation_defaults.json` to keep one home for tunables.
- Under a capture stall of about a second, an emote can be observed restarting from zero. It does not reproduce in normal running; the stills therefore capture on the pose rather than on a stopwatch, and the state at each shot is recorded next to the image.
- Titan's chest crystal no longer stretches from arm motion now that its arms have their own bones, but none of the three NPC bodies has been re-reviewed by the owner. Bage_F and Lean_F still show a seam at the hip line in split form, and split-leg inner faces still mirror the outer texture.
- Everything here is still a development preview built from Tripo source geometry; it is not a retained or production character, and **this body does not carry Astra's latest eyes or face** — only the retained AM08 textures and the AM02 K3 eye mask.

## R7 · Launcher

1. Double-click `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\START_MAHWORLD_RULES_17_23.cmd` (desktop) or `START_MAHWORLD_PHONE_TEST.cmd` (phone on the same Wi-Fi; open the printed `http://<pc-ip>:<port>/lab/play.html?field=1`).
2. Guide → move with the left thumb, look with a right drag, pick a mode top-right and a move, HOLD ATTACK and swipe its arrow.
3. MORE → ACTIONS / LOADOUT / EMOTES; **long-press MORE** (or press V on desktop) for the six-favourite radial; walk up to an NPC and use the TO: chip for a directed or paired emote.

Avatar override: `?avatar=ATHLETE_M_V2` (**the build reviewed before this repair**), `?avatar=ATHLETE_M_AM08`, `?avatar=ATHLETE_M_RIGGED`, `?avatar=ATHLETE_M_RIGGED_8K`, `?avatar=STAND_IN`.

## R8 · Rollback

- Files changed in this pass are copied, with `SHA256SUMS`, to `26_LOCAL_AUTHORITY/evidence/checkpoints/rigrepair_2026-09-15_before/` and `…_after/`. Copy a `_before` file back over the live file to revert one change.
- To revert the character alone, no file change is needed: `?avatar=ATHLETE_M_V2`. To revert the default, put `dev_0.5` back at the front of the avatar list in `lab/play.js` and `CLASS_ASSETS` back to the `dev_0.1` NPC folders.
- Rig source, exported GLB and mapping live together in `athlete_m_preview/dev_0.6/`: the delivered GLB, its `manifest.json` (measurements, joints, weight method, texture provenance), the Blender `.blend` of the measured skeleton, and the rejected Blender export with its README.

---

# EARLIER RECORD — LIVING CHARACTER PASS (2026-09-15, evening)

Owner brief: "CONTINUE MAHWORLD — LIVING CHARACTER, PRECISE COMBAT, SOCIAL EMOTES AND SIGNATURE LASER LOCOMOTION" (consolidated master prompt). This file is the compact operational record; the playable result and footage are named at the end. Nothing was deployed, purchased or installed; Blender was never launched; Astra's editable masters and the owner's server were untouched; every asset here is an isolated runtime derivative.

## 1 · Runtime character versions (superseded by R1 — ATHLETE_M_V2 and the dev_0.1 NPC rigs are now the rollback targets)

| id | file | sha256 | what it is |
|---|---|---|---|
| **ATHLETE_M_V2** (default) | `26_LOCAL_AUTHORITY/lab/assets/athlete_m_preview/dev_0.5/Mah_Athlete_M_am08_v2.glb` | a17b70a757b1175b… | 30-joint measured derivative rig (body 17 + FINGERS_L/R + BROW/CHEEK/JAW + THIGH/SHIN/TIP L/R), body mesh = `upper` + `fused_lower` primitives on one skin, `*_SPLIT_LEGS` mesh with the `PACKED` morph; textures = Astra's retained **AM08** base colour (GOLD_B + finger fix) + source normal + **AM02 K3** emissive eye mask (strength 3, linear (1, 0.3, 0.02)) |
| ATHLETE_M_AM08 | `…/dev_0.4/Mah_Athlete_M_am08_rigged.glb` | 4e3926eec4a789e8… | previous build (17 joints, no split legs) — `?avatar=ATHLETE_M_AM08` |
| ATHLETE_M_RIGGED / _8K | `…/dev_0.3`, `…/dev_0.2` | 303a7ad3946aed7c… / 1f3fbc345bee0557… | source-colour mobile / 8K builds |
| TITAN_M_RIGGED | `lab/assets/titan_m_preview/dev_0.1/Mah_Titan_M_rigged.glb` | a778907c2736995f… | NPC body, own proportions + textures |
| BAGE_F_RIGGED | `lab/assets/bage_f_preview/dev_0.1/Mah_Bage_F_rigged.glb` | 496e6e2377de9723… | NPC body (the owner's "Warlock" NPC: class stays **BAGE**, the name is recorded as pending) |
| LEAN_F_RIGGED | `lab/assets/lean_f_preview/dev_0.1/Mah_Lean_F_rigged.glb` | 275344dfb5f440d7… | NPC body for LEAN — **Lean_M was not usable** (1.93 M triangles, no retopo), so Lean_F stands in; recorded in the ledger |

Generator for all five at the time: `lab/assets/make_class_rig.mjs` (superseded by `make_class_rig_v3.mjs`, see R3) (measurement-driven landmarks per mesh; weights top-4 gaussian with region constraints; face/finger weights blended out of HEAD/HAND). Source GLBs, Astra folders and the retained `.blend` were read-only.

## 2 · Runtime modules and where the settings live

- `lab/presentation_defaults.json` — **the one** tunables file (alive rhythms, gait cycle distance, beam weights, audio gains, face limits, emote radial). Artistic settings only.
- `lab/ANIMATION_CHANNELS.md` — the shared contract (bone names, mesh roles, face channels, gait/beam API, emote clip format).
- `lab/RigAnimator.js` v2 — layered: alive idle (breathing 4–6 s per breath, blinks 3–7 s, gaze eyes→head→torso, posture variation 7–14 s, all seeded per character) → locomotion (fused travel posture / separated single-phase gait) → flight → dashes → per-pattern attacks from host phases → guards → authored emote clips → hit reaction → transformation phases → KO. Face layers REACTION > COMBAT > EMOTE > MOOD.
- `lab/animData.js` — 21 emotes (entry/loop/exit clips, paired roles + `contact_t`, form variants) and 11 expressions, HAND_POSES, CLASS_STYLE.
- `lab/BeamFx.js` + `lab/fieldSound.js` — tip beams (thin core + narrow halo + filament, ground glint/ripple/streak on the real support surface, airborne trail, one↔two crossfade during transformation) and propulsion audio (continuous hover tone, one concise pulse per support event, voice limit, coalescing).
- `lab/GlbCharacter.js` — v2 loader: form switching (`setForm(packed, showLegs)`), blink uniform over the K3 glow, bone anchors for the beams. Note: GLTFLoader copies mesh extras only, so the fused-lower primitive is identified by the indexed mean height.
- Host: `play/emote_catalog.dev.json`, intents `EMOTE {emote_id, to?}` / `EMOTE_STOP` / `EMOTE_INVITE` / `EMOTE_JOIN`, three field NPCs, snapshot `npcs`, `paired`, `invite`, `emote_target`, `host_t`.

## 3 · Gait, beams, emitter transition

One phase drives everything: `phase += 2π · (actual speed / distance_per_full_cycle) · dt`; support events are phase crossings (left at 0, right at π) and feed the beam pulse and exactly one audio pulse each — no timers. Verified at two frame rates: 26 events in 10 s at 2.5 m/s (expected 26.3) and 66 in 25 s at 24 fps (expected 65.8), split evenly L/R. Fused = one stronger continuous beam (idle 1.0, travel 1.25, brace 1.5); separated = two weaker beams (baseline 0.3, step peak 0.5–0.65, swing residual 0.12). During UNFUSE the packed legs take over inside the same silhouette before the commit, then `PACKED` 1→0 opens them while the emitters cross-fade one→two (REFUSE reverses it).

## 4 · Verification run so far

- Host suites: emotes+NPCs 21/21 · anim data 35/35 · beam audio 12/12 · rules 17–23 60/60 · play sample 97/97 · attack stack 22/22 · loadout 4/2/2 16/16 · OD-29 26/26 · 5B 46/46 · asset slot 11/11. Phase 5A: 45/46 — the one failure is the HTTP-transport convergence check, which fails on this machine under load and is reported as-is, not explained away.
- Emote UI driver (`evidence/play/cdp_emote_ui.mjs`): phone portrait **16/16** and desktop 1440×900 **17/17**, 0 page errors — long-press MORE opens the radial and a quick tap still opens MORE; tap and hold-drag-release both perform; centre/off-slot release cancels; an outside tap is consumed (no lock, cast or camera change); BROWSE shows all six groups and 21 entries from the host catalog; SQUAT while fused gives "SEPARATE FIRST"; ★ favourites persist across reload; scrolling the collection never moves the camera; partner emote without a target asks for one and never sends LOCK_TARGET; with a target it invites, the NPC accepts on its own, the sheet shows PAIRED and LEAVE releases it.
- Integration probe (`evidence/play/living_probe`, `living_probe2`), 0 page errors: v2 capabilities (split legs, packed morph, face + finger bones, K3 eyes, beams), all three NPC bodies loaded and placed, blink observed, fused beam on the ground, UNFUSE sequence with the leg reveal, directed WAVE at BAGE_F answered with NOD, FIST_BUMP invitation accepted with a shared `t0`.

## 8 · FOOTAGE (recorded from the running build, CDP screencast of the whole page → in-page MediaRecorder VP9; no ffmpeg on this machine)

| file | length | frames | size |
|---|---|---|---|
| `26_LOCAL_AUTHORITY/evidence/play/video_living_desktop1440/video/mahworld_demo_desktop1440.webm` | 269 s | 3155 | 23,950,601 bytes |
| `26_LOCAL_AUTHORITY/evidence/play/video_living_portrait/video/mahworld_demo_portrait.webm` | 291 s | 4109 | 28,719,584 bytes |

Chapters (also in `video/marks.json`, with a still per chapter beside it):

| time | chapter |
|---|---|
| 0:00 | close view: breathing ribcage, relaxed shoulders, calm face, head re-aims (no eyes on this asset) |
| 0:07 | idle: breathing, resting posture |
| 0:09 | run forward → stop (lean, arms back, settle) |
| 0:13 | backward glide (backward hinge) |
| 0:15 | take-off, forward flight, landing |
| 0:23 | dashes: left, right, forward, back |
| 0:42 | PHYSICAL attacks (four movement patterns) |
| 0:55 | PHYSICAL MAHGIC attacks (hand-bound effect) |
| 1:02 | SPECIAL MAHGIC casts (both hands) |
| 1:09 | guards + incoming hit reaction |
| 1:16 | SEPARATE (curl → charge → burst → star → recover) and FUSE (knees up → align → snap) |
| 1:21 | emotes: WAVE, NOD, READY |
| 1:29 | MORE sheet → LOADOUT → EMOTES → GUIDE (real taps) |
| 1:46 | close view: breathing, blinks, calm → curious → smile (QUIET_LAUGH) → SHRUG with brow asymmetry, relaxed hands |
| 1:58 | SEPARATE with the emitter transition (one beam → two), then the separated swagger gait: alternating limbs, tip pulses, pelvis / shoulder counter-rotation |
| 2:09 | separated: side glide dance (tip pulses) and SQUAT demonstration (leg articulation) |
| 2:23 | FUSE back (two beams converge to one), fused travel with the single beam and streak |
| 2:30 | flex: DOUBLE_BICEPS, FRONT_LAT_SPREAD · exercise: UPRIGHT_ROW demo · dance: MAH_GROOVE |
| 2:53 | hidden emote menu: long-press MORE → favorites radial → tap a favorite; BROWSE groups (real taps) |
| 3:25 | directed WAVE at NPC_BAGE_F (BAGE body) and its social reply |
| 3:29 | paired FIST_BUMP invitation → NPC accepts → shared timeline |
| 4:29 | end |

The first recording of this pass was discarded: after the dash chapter the player was left at the arena edge and the camera ended up in blackness for the later chapters. The recorder now re-centres through the host's own PRACTICE_RESET between chapters and verifies the character is on screen before each one; every chapter in the delivered file is framed. Two of the three NPCs (TITAN_M, LEAN) wander 11–13 m out and the walk-to routine could not reach them inside its budget, so the desktop file's NPC chapter shows BAGE_F only (directed WAVE → her NOD reply → FIST_BUMP invitation accepted on a shared timeline). The **portrait file reaches all three**: BAGE_F (wave + reply + paired fist bump), TITAN_M (directed flex + reply) and LEAN (wave + reply), each in its own class body. The NPC bodies are also in `evidence/play/living_probe/` and `evidence/play/assets_v2/`.

## 5 · Honest limits (living-character pass; where R6 disagrees, R6 is current)

- **Blinking is a SHADER effect, not eyelid animation.** The asset has no eyelid geometry and no blink morph, so `lab/GlbCharacter.js` injects a `uBlink` uniform that fades the K3 emissive eye mask and darkens the masked texels; the animator drives it on a 3–7 s schedule. Nothing on the face moves for a blink. Facial *expressions* are crude derivative bone bending (BROW / CHEEK / JAW) on a Tripo head with no iris or mouth-interior geometry; gaze is head/neck re-aiming, not eye movement. Real eyes remain an Astra dependency (retained AM19-or-later export).
- Split legs are an engineering approximation (narrowed outer half + mirror, capped ring). Visible defects: Titan_M's chest crystal stretches when the right arm folds across the chest; Bage_F/Lean_F show a dark seam at the hip line in split form; leg inner faces mirror the outer texture; Athlete brow weights are asymmetric (the source head is turned); Titan's NECK bone received no vertices.
- Lean_M is not shippable without retopo; Lean_F stands in.
- Frame times here come from headless software rendering (swiftshader) and are not a phone measurement; emulated touch is not a physical-phone acceptance pass.

## 6 · Launcher

1. Double-click `C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\START_MAHWORLD_RULES_17_23.cmd` (desktop) or `START_MAHWORLD_PHONE_TEST.cmd` (phone on the same Wi-Fi; open the printed `http://<pc-ip>:<port>/lab/play.html?field=1`).
2. Guide → move with the left thumb, look with a right drag, pick a mode top-right and a move, HOLD ATTACK and swipe its arrow.
3. MORE → ACTIONS / LOADOUT / EMOTES; **long-press MORE** (or press V on desktop) for the six-favourite radial; walk up to an NPC and use the TO: chip for a directed or paired emote.
Avatar override: `?avatar=ATHLETE_M_AM08` (previous build), `?avatar=ATHLETE_M_RIGGED`, `?avatar=ATHLETE_M_RIGGED_8K`, `?avatar=STAND_IN`.

## 7 · Rollback

`26_LOCAL_AUTHORITY/evidence/checkpoints/living_2026-09-15_before/` (originals + SHA256SUMS) and `…_after/` (post-pass copies + SHA256SUMS). Copy a `_before` file back over the live file to revert any single change.
