# M20 working notes — quality pivot (in progress; the ledger section is written at the checkpoint)

M20 starts at `c51ac67`. Owner directive 2026-09-27: stop expanding; refine / remove / replace / re-light / reshape / polish. Reinforcement (same day), priority queue: 1 waterfall + water transition, 2 rock smoothing, 3 sky / atmosphere, 4 trees / crystal vegetation / grass, 5 buildings / entrances, 6 HALO dome / interiors, 7 magic ecology, 8 surface polish, 9 life / NPC, 10 remaining ugly areas. Lens: "does this look like a real premium game world where our characters naturally belong?" Evidence standard: fixed-camera before / after; "If the improvement is not obvious: do not call it a win." The next owner report must give: areas upgraded, before / after evidence, what still looks weak, what was reduced / softened / replaced, how the world better supports characters, confirmation of no map expansion, confirmation that running jobs stayed alive.

Method used: worktree agents per area → adversarial review → fix → re-verify → the lead merges (cherry-pick) only what passes, fixing any remaining blocker itself; the lead works the waterfall / water / Veil lane directly. Agent brief: `M20_AGENT_BRIEF.md`.

## Merged (branch tip `e8449fa` at the time of writing)
- **Water (lead):** `water.js` skyWater — Fresnel mirror of the live atmosphere dome, calm / rough patches, ridge-skyline band, BLUE clamp r ≤ 0.85 g, sea shore shallows; canals, sea, Veil basin, ripple window. Sea slate `#2b4760`; the ripple window wears the body's skyWater uniforms (it showed a dark 48 m square round the player at sea). Veil lake lighter (it read as a black hole from above).
- **Veil Falls (lead):** film down the rock to the sea (ridge triangles, 3 cm proud); three LEVEL-lipped strands from the notches 107 / 110 / 112 (the lip used to follow the crest 80 → 147 → 86 m, a triangle of water on a slope); the curtain spans the bays in the chord frame instead of lining knife-thin fins (hairpins removed, sharpest lower-curtain turn 52°); horsetail clumps, paler opaque body; flush plunge line (all tiers); spray wall from 3.6 m (HIGH / MED); hem dissolves into the spray. Tests `gameplay_world_m20_water` 9, `gameplay_world_veil_district` draw budget 18.
- **Veil highland (lead):** room-card glass on villas / civic hall (was a flat cream screen at night); hidden lawn vertices sink under the paving (a dark patch showed through); lawn neutral under the lavender sky; residents (visual-only, beyond reach, `gameplay_world_m20_residents` 7); soft Veil crystals.
- **Wave 1:** cleanup + soft crystals; light / post / materials.
- **Wave 2:** sky (storm-light grey-violet day, deep-blue night, pearl sun, altostratus veil; lead review fixes: veil wrap pop, zenith streak bands, zenith `#63678b`); mountains round 1 (massif normals, fracture planes, spray-wet Veil rock, rock islands) + lead host-safety fix (ISLE_SW keeps M9 heights inside the reach square, `gameplay_world_m19_mountains` check 11).
- **Wave 3:** architecture / MAH MATCH / entrances (goalpost portal frames removed, built canopies + fascia names + downlights, stone base, per-portal uniforms, MAH MATCH screens + mezzanine hall); vegetation (district tree crown shading, metal root flare, no hanging diamonds; Veil blooms / hedges; zoned grass) + lead fix (no white caps on TITAN apexes at mid-range).
- Full suite at `25653a6`: 69 files, 632 checks passed, 34 files failing — identical to the bridge-blocked baseline (`f15b_clean`).

## Running when these notes were written
- Mountains round 2 (silhouettes, close-range rock, islands, MED cost) — workflow `wf_bb5a9c3f-8e3`.
- Wave 4: HALO dome / deck / interiors + subtle magic ecology — workflow `wf_b792f3a2-a6a`.
- Planned wave 5: ground / roads / grass polish + remaining ugly areas (self-review of the whole world).

## Still weak / open
- The Veil rock itself: knife-thin collision / keep-circle fins at stations 109 / 111 and pale planar faces; FP (camera at the fin foot) still shows large pale sheets; the small TITAN / NORTH falls are flat sheets inside reach.
- Mountains round 1 changed shading only (silhouettes unchanged) — round 2 targets that.
- Sky: overhead a little flat; near cumulus show terrace contours (march jitter 0.2); world greyer under the storm light.
- District trees: crown silhouettes are the GLB's (tree lock forbids mesh edits); mid-range change is small.
- MAH MATCH fins barely read at distance; TITAN fall ledge still a heavy simple deck.

## Checkpoint still to do
Whole-world before (`c51ac67` frames) / after renders (day, night, phone MED), evidence sheets into `evidence/`, the M20 ledger section + index row, CONTINUE_HERE, full suite, one owner report with the seven requested items.
