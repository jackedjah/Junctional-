# S11 — FOUR LANDMARK DISTRICTS + BLACK PLATINUM GROUND (local review candidate)

world_version DISTRICT_V1 · rig ATHLETE_M_V6 dev_0.11 default (V7 dev_0.12 dev-selectable) · motion MAH default (TRIPO_UPPER dev-selectable) · appearance AM08+K3 (Astra finish not imported)

## Inputs (protected, never served)
`MAHWORLD_CHARACTERS\INCOMING_BUILDINGS\MAHWORLD_BUILDING_EXPANSION\INPUTS\` — temple 25c4c6e9…, gym, tower, market, training display (hashes / triangle counts in REPORTS/SOURCE_INSPECTION.json and copied into the manifest provenance).
## Runtime derivatives (Blender decimate_buildings.py, one native job, done)
`26_LOCAL_AUTHORITY/lab/assets/buildings/_decimated/{temple,gym,tower,market}_rt.glb` 70k / 70k / 80k / 70k tris, base colour 2048² JPEG, normal 1024², 3.5–4.4 MB each (15.4 MB total vs 306 MB / 7.44 M tris source). `training_display_rt.glb` 30k tris exists but is feature-flagged off (manifest `enabled: false`).
## Placement (metres, y up) — `lab/assets/buildings/district_v1.json`
temple (0,178) yaw 180° scale 81.80 → 58.8 × 60.5 × 80 m · gym (−112,110) yaw 90° scale 73.52 → 71.5 × 72 × 72 m · tower (112,110) yaw −90° scale 73.04 → 45 × 57.2 × 72 m · market (0,258) yaw 180° scale 65.13 → 33.6 × 32.4 × 64 m. Transform = T · R_y(yaw) · S · bottom-centre offset, identical for visuals, colliders, map markers. Plaza (112 m) untouched: spawn (0,4), tree elevator (30,40), NPC routes. Field 600 m (walls x ±175, z −56.5…292).
## Collision / support — `play/rules1723/district_v1_colliders.json` (deploy/build_district.mjs)
2328 finite BOX pieces (2.5 m cells × 1.5 m storeys, from the runtime mesh: walls / columns / slabs with y0+h) + walkable deck slabs from upward-facing faces with ≥ 3 m clear air. Broad-phase by building envelope (Colliders.js groups). Vertical: ground-relative ceiling (FIELD 100 m dev override), solid-top hover hold (no landing on spires), deck-underside clamp, support extends body-radius past deck edges, ≤ 1.6 m ledges are glidable.
Usable landing levels (area): temple 79.5 / 61.5 m · gym 72 (1044 m²), 70.5, 69, 67.5, 66 · tower 66, 58.5 (288 m²), 57 (363 m²), 45 (138 m²) · market 64.5, 57 (119 m²), 51.
## Perch — emote `PERCH` (Tab → Browse, or EMOTE {emote_id:'PERCH'}): hover-perch on real support; refused in flight / transit / dash (NO_SUPPORT); cancels on move/dash/fly/attack/guard/transform. Not a chair sit.
## Rollback
dev_tuning `local_authority.play.rooms.FIELD.world_layout: "CITY_2"` (+ size_m 112) restores the plaza-only layout; `field_colliders` (CITY_2) is untouched in the ruleset.
## Evidence
`deploy/review/district/mahworld_district_review.webm` (115 s, 13 chapters + stills) · `16_TESTS/gameplay_district.test.mjs` 30/30 · perf (headless d3d11, 3 s samples): desktop 1280×720 plaza wide 311 calls / 426 k tris / 16.7 ms (was 309 / 286 k / 16.7), skyline 67 / 501 k / 16.7, temple close 55 / 345 k / 16.7; phone 390×844 16.7 ms everywhere (one 33 ms frame on the skyline). Static build 46 MB (was 26 MB).
