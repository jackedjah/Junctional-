# Resource-use record — CONVERGENCE (O10: a name in a report is not a use)

Every row: actual input → actual output, version, ownership, access/credit status, and where the result is seen in the game.
"NOT USED" is stated where a resource was available but did not contribute to the pass.

## PASS 1 — flight-state reliability (F01) + O4 hold-fly + quality baseline

| Resource | Version / access | Input | Output | Ownership / credit | In-game evidence |
|---|---|---|---|---|---|
| three.js (vendored) | 0.185.1, `26_LOCAL_AUTHORITY/vendor/three` (MIT) | existing scene, `renderer.getDrawingBufferSize` | Control Lab drawing-buffer / render-scale readout (`lab/play.js` LAB buffer binding, `lab/controlLab.js` stats line) | MIT, vendored copy unchanged | `?lab=1` overlay line `buffer W x H px (render scale % of device px)` |
| Headless Chrome (Google Chrome, `--headless=new`, ANGLE d3d11) | local install, `deploy/probe_lib.mjs` | the built static demo (`deploy/static_dist`) | `deploy/probe_out/flight/f01_trace.json`, `o4_desktop/portrait/landscape.json`, stills; tracked copies under `25_HANDOFF/CONVERGENCE/flight/` | Google, local | the page-level acceptance evidence for F01 / O4 (touch = EMULATED synthetic pointer events, never a phone) |
| Node.js 22.19 in-process host harness | `00_CORE/bootstrap.js` + `26_LOCAL_AUTHORITY/DuelHost.js` | the authority rules + `_runtime_mapping.field_colliders_district_v1` | `16_TESTS/gameplay_flight_f01.test.mjs` (22 checks), `gameplay_district.test.mjs` 1b | project code | host semantics proven before the page probes |
| Tripo Studio / Tripo donor clips | received earlier (`MAHWORLD_TRIPO_DONOR_RECEIVED.zip`) | — | — | — | **NOT USED in PASS 1** (no motion / asset work in this pass) |
| Reallusion iClone 8 / AI Studio | installed, no CC / AccuRIG | — | — | — | **NOT USED in PASS 1** |
| Blender 5.2 | installed, **slot RESERVED by the character owner** | — | — | — | **NOT LAUNCHED** (rule: no Blender until "BLENDER RELEASED") |
| Reference pack `MAHWORLD_CONVERGENCE_REFERENCES` | extracted `C:\Users\jahsu\Downloads\MAHWORLD_CONVERGENCE_REFERENCES\` | `01_CURRENT_DECISIONS.md` (O1–O10), `MAHWORLD_174445_VIDEO_EVIDENCE_ADDENDUM.md` (F01–F08), `03_ACCEPTANCE_REGISTER.md` | the F01 reproduction design, the O4 hold model, the SUPERSEDED markers | owner-supplied | — |

## PASS 2 · 2b · 3 — camera, presentation pivot slice, HUD

| Resource | Version / access | Input | Output | Ownership / credit | In-game evidence |
|---|---|---|---|---|---|
| three.js (vendored) | 0.185.1 | `SphereGeometry / ConeGeometry / OctahedronGeometry / RingGeometry`, `BufferGeometry` merging, `PerspectiveCamera` far plane | `lab/farWorld.js` (mid walkways, far massifs, haze plain — 3 merged meshes), the viewer-following sky dome, camera far 1400 m | MIT | far-corner sky check (pivot W3), stills `25_HANDOFF/CONVERGENCE/pivot/*wide_manual_look.png` |
| Headless Chrome + CDP screencast + in-page MediaRecorder | local Chrome | scripted inputs on the owner-round build (`C:\mw_base`) and the candidate | matched captures `deploy/review/current_owner_round/`, `candidate_pass3/` (WebM + marks + telemetry; tracked summaries under `25_HANDOFF/CONVERGENCE/pivot/capture_*/`) | Google, local | the pivot proof (idle → turn → walk → stop → orbit / release → obstacle → reset → flight) |
| Owner addendum text | chat, 2026-09-17 | quarter-to-third framing reference, connected movement, world depth, locks | framing presets, turn spring, latch rule, far world; ADDENDUM_QUEUE.md | owner | — |
| Reference clip `v12044gd0000dam5b47og65j5h5c8730.mp4` / `MAHWORLD_NEW_REFERENCE_STUDY` | NOT FOUND on this PC | — | — | — | **NOT USED (not available)** |
| Tripo / Reallusion / Blender | as before | — | — | — | **NOT USED in PASS 2 / 2b / 3** (no motion or asset work yet; Blender slot still reserved) |

## PASS 3 review round · PASS 4A — fidelity diagnosis

| Resource | Version / access | Input | Output | Ownership / credit | In-game evidence |
|---|---|---|---|---|---|
| three.js (vendored) | 0.185.1 | `Texture.anisotropy`, `WebGLRenderer.setPixelRatio / getDrawingBufferSize`, `MeshBasicMaterial` (neutral / wire shade modes) | anisotropy 8 on the character + landmark maps, tier caps 2.0 / floor 1.0 (`lab/quality.js`), dev hooks `renderChain / textureAudit / shadeMode` | MIT | `?lab=1` buffer line; `25_HANDOFF/CONVERGENCE/fidelity/` |
| Headless Chrome device-metrics emulation | local Chrome, `deploy/probe_lib.mjs` (`dpr`, `mobile`) | the built static demo at emulated DPR 1 / 2 / 3 | `probe_fidelity.mjs` records + native crops; `probe_route.mjs` at `ROUTE_DPR=2` (`25_HANDOFF/PASSES/perf/route_pass4_cap*_dpr2.json`) | Google, local | the G28 before / after crops |
| Owner source atlas `Mah_Athlete_M_AM08_FINGER_COLOR_TEST_8K.png` (character lane) | read-only from the character owner's folder | the 8K base colour | a 1024-cell block comparison against the runtime 2048 map (`tex_source_vs_runtime_1024.jpg`) — READ ONLY, never edited or copied into the runtime | Astra / Character Claude | proves the upper-back patches are source-side |
| Tripo / Reallusion / Blender | as before | — | — | — | **NOT USED** (Blender slot still reserved) |

## PASS 4B · 4b — faithful separated legs, walk identity

| Resource | Version / access | Input | Output | Ownership / credit | In-game evidence |
|---|---|---|---|---|---|
| Owner source `RAW_10_MODELS/Mah_Athlete_M.glb` | read only (sha256 7b023694…, re-checked by the test) | the fused lower body’s triangles below the crotch line | `lab/assets/rig_legs_faithful.mjs` → the split-leg mesh of `athlete_m_preview/dev_0.14` (lateral walls = source triangles, medial walls inferred) | Jah / Tripo export (the character lane’s source; never edited) | `25_HANDOFF/CONVERGENCE/legs/` |
| Astra’s AM08 base colour + AM02B eye mask (8K PNGs) | read only, same inputs as dev_0.13 | textures | resampled 2048² / 1024² in headless Chrome by the generator (unchanged process) | Astra / Character Claude | the legs carry the same atlas (mirrored on the inner face) |
| three.js 0.185.1 (vendored) | GLTFLoader / SkinnedMesh / morph targets | dev_0.14 GLB | the runtime default ATHLETE_M_V9 (V8 kept) | MIT | `probe_legs.mjs` D1–D6 |
| Headless Chrome (deterministic virtual time `Emulation.setVirtualTimePolicy`) | local | the built demo | the 40 ms transformation frames, the walk-identity traces | Google, local | `legs/transition_strip.jpg`, `walk_identity/` |
| Tripo / Reallusion / Blender | as before | — | — | — | **NOT USED** (Blender slot still reserved; all mesh work in node) |

## CONSOLIDATED PHASE 1 · P0 audit + media / links + P7 botanical prototype (master §5.1 vocabulary: input/hash → tool/version → access → operation → output/hash → runtime consumer → comparison → status)

| Resource | Input / source | Tool / version / access | Bounded operation | Output | Runtime consumer | Comparison / proof | Status |
|---|---|---|---|---|---|---|---|
| Owner video bundle `MAHWORLD_MASTER_VIDEOS_AND_LINKS.zip` (396 MB, 13 originals; sha256 per file in its VIDEO_MANIFEST.json) | read only, extracted beside the zip | headless Chrome (`--headless=new`, GPU) via `deploy/video_frames.mjs` (new, no ffmpeg) | decode + seek every 0.2–3 s (dense 0.2–0.25 s over the owner-cued intervals) → PNG frames + contact sheets with burned-in timestamps (regenerable, untracked under `deploy/probe_out/video/`) | 946 frames / 84 sheets; `MEDIA_REVIEW_LEDGER.md/.json` (312 reviewer entries + 138 skeptic additions, every entry verdict-marked) | none (evidence only) | frame-based review at the stated sampling, not a normal-speed watch; skeptic re-opened every cited frame | INPUT_INSPECTED |
| tcrf.net roots L01 / L02 / L03 | the three URLs from the master §22.2 | WebFetch + WebSearch (bounded ≤ 6 fetches each; no browser session, no login, no CAPTCHA) | fresh retrieval attempt on article / raw / printable / api / export paths + two archive hosts | decoy pages only (AI-agent notices with embedded instructions — none followed); zero article text; `SOURCE_LINK_LEDGER.md/.json` | none | search snippets logged as unexamined leads only | BLOCKED (needs a human browser save of the pages) |
| TikTok short link L04 | `https://www.tiktok.com/t/ZP8T1vgSe/` | WebFetch ×3 + one HEAD (redirect only) | resolve + public oEmbed identity | identity record only (creator `@tessalavibes`, id 7612851917668027662, caption about an AI game-maker scene); video NOT viewed; NOT assumed to be V03 | none | — | BLOCKED (media not viewable) |
| Technical references L05–L14, L29–L32, L34, L36–L43 (23 pages) | the master §22.3 link set | WebFetch (≤ 2 fetches per link; model-summarised markdown, no version banner captured on threejs.org) | read for the actual choices of this phase (three.js r185 API parity, LoadingManager, InstancedMesh / LOD / MeshStandardMaterial for the tree, quarks vs existing BeamFx, DCUO flight presentation, animation principles, pointer events / iPhone safe areas / emulation honesty, asset licences) | facts + licence terms in `SOURCE_LINK_LEDGER.md` §B (Poly Haven / ambientCG / Kenney CC0; Quaternius QAL v1.0 not CC0; Sonniss GDC v2.0 proprietary royalty-free) | none installed; InstancedMesh / MeshStandardMaterial / onBeforeCompile already vendored and now used by the tree | nothing downloaded from any asset library | DOCUMENTATION_READ |
| Links L15–L28, L33, L35, L44–L46 (19) | — | — | not revisited (reasons per link in the ledger §C: Blender slot reserved, Tripo / Reallusion / Mixamo / Rokoko are outside-repo routes with no clip yet, no model change) | — | — | — | AVAILABLE (not needed for a current choice) |
| dev_0.14 rig GLB `Mah_Athlete_M_am08_v6.glb` (sha256 7d217d0f…) | read only | node 22 + `mocap/clip_io.mjs` restSkeleton FK | the §14.3 scale reference: PELVIS 0.765 m, THIGH (femoral head) 0.835 m, crotch 0.730 m, head 1.800 m above the lowest point (grounded, hoverLift 0) | `lab/assets/botany/tree_spec.js` `scale_reference` (sha256 10ccc296…) | the tree family's authored crown band | side-by-side render + projected hip-line check (probe S2) | INPUT_INSPECTED → OUTPUT_CREATED |
| three.js 0.185.1 (vendored, MIT) | `BufferGeometry` / `InstancedMesh` / `MeshStandardMaterial.onBeforeCompile` | local | procedural family generator `lab/mahgicTree.js` (sha256 894efe1e…; seeded, 3 variants, 3 shared materials, sway / pulse / veins in the shared shaders) + registry `lab/assets/botany/prototype_v1.json` (sha256 732b156f…) | 3 variant geometries (5 356 / 6 684 / 7 360 tris) placed as 9 instanced draws | `fieldScene.build` (after the static merge), `tick`, `botany()` / `botanyEnergy()`; `play.js` `?botany=0`, VFX-off hook, `P.botany()` / `P.camAt()` | `16_TESTS/gameplay_mahgic_tree.test.mjs` 24/24; `deploy/probe_botany.mjs` 10/10 (`25_HANDOFF/CONVERGENCE/botany/`) | RUNTIME_INTEGRATED (prototype) — OWNER_ACCEPTED pending (Packet C) |
| Tripo / Reallusion / Blender 5.2 / quarks / asset libraries | — | — | — | — | — | Blender slot still reserved; no generation, credits, installs or downloads | NOT USED |
| Headless Chrome (GPU, desktop 1280×800 + emulated iPhone 390×844 @ DPR 2, touch emulated) | the built demo | local | botany / HUD probes | `probe_botany.json`, `hud_*.json/.png` (refreshed after the G20 fix) | — | EMULATED DEVICE, never a physical phone | INPUT_INSPECTED |

## CONSOLIDATED PHASE 2 · checkpoint review: G37 repair, botany workload, P8 (§5.1 vocabulary)

| Resource | Input / source | Tool / version / access | Bounded operation | Output | Runtime consumer | Comparison / proof | Status |
|---|---|---|---|---|---|---|---|
| dev_0.14 rig (bones, identity bind) | the shipped GLB, read only | three.js 0.185.1 (Object3D.updateWorldMatrix / Quaternion.setFromUnitVectors), node 22 + headless Chrome | the world-space support hold: 3D two-bone IK per leg against a captured world point, written after the rate filter (`lab/RigAnimator.js` plantPass); tip extension measured at bind (`GlbCharacter.js` tipExtLocal 0.0296 bone units = 0.054 m) | the declared-contact walk / run; `motion_e/motion_e.json` 12/12; `gameplay_g37_contact.test.mjs` 8/8 | RigAnimator (one pose owner; stage-12 corrective) | rollback path re-measured beside it (41.3 / 21.9 cm) | RUNTIME_INTEGRATED — Packet B look pending |
| Mocap / retarget resources (Rokoko, Mixamo, ActorCore, SkeletonUtils.retargetClip) | — | — | NOT USED for this repair: no captured locomotion clip exists yet (Spec F is Jah's capture); the retargetClip page read in phase 1 is DOCUMENTATION_READ only, not motion integration proof | — | — | — | AVAILABLE / NOT USED |
| Tree family (three.js InstancedMesh, shadow pass) | `lab/mahgicTree.js`, `prototype_v1.json` | headless Chrome desktop + phone-emulated | matched same-load workload A B A B (`P.botanyVisible`), far-LOD variant build, placement-mask preview (`deploy/botany_placement_preview.mjs` on the actual layout) | `botany/probe_botany.json` C0 / M2, `placement_preview.json` (140 candidates, definition only) | fieldScene (prototype only) | +100 095 triangles = placed + shadow-casting | RUNTIME_INTEGRATED (prototype) / DEFINITION_ONLY (placement, LOD) |
