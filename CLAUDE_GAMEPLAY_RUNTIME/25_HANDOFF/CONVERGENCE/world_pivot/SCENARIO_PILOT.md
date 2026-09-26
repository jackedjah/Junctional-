# Scenario pilot — option E (owner-approved 2026-09-26): rock + platinum, high quality

**Status: rock delivered and tested in isolation · platinum NOT generated (plan limit) · nothing is canonical · waiting on owner review.**
No further Scenario credits will be spent until the owner reviews this comparison.

## What ran, what it cost

| | rock / geological surface | platinum architectural panel |
|---|---|---|
| model | `model_scenario-texture` (Scenario Texture) | `model_scenario-texture` |
| parameters | 1024 × 1024, quality `high`, `eraseSeam: true`, seed field 8101 | 1024 × 1024, quality `high`, `eraseSeam: true`, seed field 8102 |
| prompt | the exact recorded prompt #1 in `SCENARIO_GATE.md` | the exact recorded prompt #2 |
| dry-run price | 33 CU | 33 CU |
| result | job `job_GtABG46vBKZd6satDdZooGNH` → asset `asset_W4CzpvEc7bnJgoZG9fogYu6Z` (success, one generation, no re-roll) | **refused before any job existed**: `429 PlanLimitReachedError` — the free team's `custom-generation` allowance is **50 CU** and the rock took 33, so a second 33 CU job does not fit. Not retried; not downgraded to medium (that would change what was approved) |
| charged | **33 CU** (project usage confirms: 33 CU, 1 job, 1 image) | 0 CU |

Seeds: the model's live schema exposes **no seed parameter** (it is a gpt-image-2 based texture generator). The seed value was sent and is
recorded for provenance, but the output cannot be reproduced bit-for-bit from it; one generation, no re-roll, is what keeps the pilot controlled.

## Inspection of the rock map (`evidence/scenario_pilot/`)

- Content: a credible stratified gneiss face — horizontal bands, vertical joints, mineral grain (`rock_source_1024.png`).
- Seamless: wrap-edge differences equal interior neighbour differences (left/right 13.6 vs 15.5, top/bottom 17.2 vs 17.0 on 0–255 luminance);
  the 2 × 2 proof shows no seam (`rock_tiling_proof_2x2.jpg`). Tile repetition is visible at 2 × 2, as for any tile.
- Neutral: mean RGB 135 / 137 / 139, mean saturation 3.8 % — and the conversion keeps luminance only, so the colour law holds by construction.
- Artifacts: the seam-erase pass leaves two ~64 px bands (near 13 % and 85 % of each axis) about 25 % softer than the rest, with a faint
  horizontal smear near the bottom. Free-plan downloads are served through a `wm=true` transform: no visible watermark was found (high-pass
  scan `rock_highpass_scan.jpg`), an invisible embedded mark cannot be excluded.

## Conversion to the MAHWORLD detail workflow (`convert_detail.py`)

Luminance → R: high-passed detail value (σ 56 px circular FFT blur, so the tile stays seamless; mean 0.50, ±2σ range) · G / B: tangent-plane
normal from a lightly blurred height · A: roughness variation (crevices rougher). The derived map is still seamless (wrap 0.126 vs interior
0.157; 0.158 vs 0.151). Preview: `rock_detail_map_preview.jpg`.

## Isolated comparison (never on the canonical branch runtime)

Built in a scratch git worktree of `bf80c74`; the three integrations are kept as patches only (`pilot_integration_variant{A,B,C}.patch` —
`lab/world/surfaceDetail.js` `applyGeology` gains an optional `detail` map, `lab/world/macro.js` loads it for the ridges). Matched renders:
same pinned tree, same views, same order (`renders/pilot_before`, `pilot_after` = A, `pilot_afterB`, `pilot_afterC`), including two pilot-only
close views P1 (~10 m) and P2 (~25 m) of a ridge wall at the north canal.

| variant | use | result |
|---|---|---|
| A | 8 m tile, value + roughness + height into the derivative bump | visible photographic grain up close, but the bump aliases into a glittery speckle on shaded faces — rejected |
| B | 10 m tile, value + roughness, the map's own normal channels (no bump) | clean, but at 10–25 m barely distinguishable from the procedural grain — no material gain |
| C | **36 m tile (meso scale)**, value + roughness + normal channels, visible to 600 m | **the one that matters**: at 30–300 m — where the ridges are actually seen — faces read as stratified, weathered rock instead of flat grey polygons (`pilot_meso_crops_before_C.jpg`, `pilot_compare_before_A_B_C.jpg`) |

Variant C's remaining faults: a single planar projection stretches the map into streaks on faces oblique to the projection axis (fix: a
two-axis blend, one more texture read), repetition could show on the very largest faces, and the low-poly facet silhouette is geometry and
stays. It does not change the sky, the buildings or anything outside the ridges.

## Performance (measured on the matched renders; software WebGL, not a phone test)

- Draw calls: unchanged in all 7 views. Shader programs: unchanged (the ridge variant replaces the non-pilot one). Textures: +1.
- GPU memory: 1024² RGBA8 + mips ≈ **5.6 MB** (512² ≈ 1.4 MB for MED; LOW would skip it).
- Shader: +1 texture fetch and ~15 ALU per ridge fragment (+1 more fetch with the recommended two-axis blend).

## Verdict

- **Rock: yes, at the meso scale.** Used as 36 m detail (variant C), the pilot materially improves the ridge rock at the distances it is seen;
  as close-range micro detail (A / B) it does not. Adoption would need: the two-axis blend, 512 on MED / off on LOW, and owner approval.
- **Platinum: not tested** — blocked by the free plan's 50 CU generation allowance (17 CU left). It needs either a plan upgrade, the allowance
  to reset, or an owner decision to allow a medium-quality (12 CU) generation instead.
- Nothing here is canonical: no texture, loader or shader path from the pilot is in the branch runtime.

## M8E note (2026-09-26): platinum not requested

The M8E architecture pass re-asked whether the 12 CU medium platinum map would materially improve the facades. It would not: the three
wall families (`FACADE_PLAIN`, `COMPOSITE`, `CLADDING`) already carry per-panel tone, roughness, macro value, grain, seams and bevels, and a
1024 px panel map is micro detail (2–3 mm per pixel on a 2 m panel) that mips away at the 5–40 m the facades are seen from — the same case
as rock variants A / B, which gave no material gain. The facade gain came from geometry and light (windows, frames, rooflines, occupancy).
0 CU spent; 17 CU of the free allowance remain.
