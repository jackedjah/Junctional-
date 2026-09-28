# M20 working notes — quality pivot (in progress; the ledger section is written at the checkpoint)

M20 starts at `c51ac67`. Owner directive 2026-09-27: stop expanding; refine / remove / replace / re-light / reshape / polish. Reinforcement (same day), priority queue: 1 waterfall + water transition, 2 rock smoothing, 3 sky / atmosphere, 4 trees / crystal vegetation / grass, 5 buildings / entrances, 6 HALO dome / interiors, 7 magic ecology, 8 surface polish, 9 life / NPC, 10 remaining ugly areas. Lens: "does this look like a real premium game world where our characters naturally belong?" Evidence standard: fixed-camera before / after; "If the improvement is not obvious: do not call it a win." The next owner report must give: areas upgraded, before / after evidence, what still looks weak, what was reduced / softened / replaced, how the world better supports characters, confirmation of no map expansion, confirmation that running jobs stayed alive.

Method used: worktree agents per area → adversarial review → fix → re-verify → the lead merges (cherry-pick) only what passes, fixing any remaining blocker itself; the lead works the waterfall / water / Veil lane directly. Agent brief: `M20_AGENT_BRIEF.md`.

## Merged (branch tip `099c6b6` at the time of writing)
- **Water (lead):** `water.js` skyWater — Fresnel mirror of the live atmosphere dome, calm / rough patches, ridge-skyline band, BLUE clamp r ≤ 0.85 g, sea shore shallows; canals, sea, Veil basin, ripple window. Sea slate `#2b4760`; the ripple window wears the body's skyWater uniforms (it showed a dark 48 m square round the player at sea). Veil lake lighter (it read as a black hole from above).
- **Veil Falls (lead):** film down the rock to the sea (ridge triangles, 3 cm proud); three LEVEL-lipped strands from the notches 107 / 110 / 112 (the lip used to follow the crest 80 → 147 → 86 m, a triangle of water on a slope); the curtain spans the bays in the chord frame instead of lining knife-thin fins (hairpins removed, sharpest lower-curtain turn 52°); horsetail clumps, paler opaque body; flush plunge line (all tiers); spray wall from 3.6 m (HIGH / MED); hem dissolves into the spray. `099c6b6`: the strands' lip whitening (a world-height band) had blown the whole flume out to white at FK — confined to the falling water. Tests `gameplay_world_m20_water` 11, `gameplay_world_veil_district` draw budget 19.
- **Small falls (lead, `c25fb59`):** the TITAN fall hung in the air in front of its ledge and landed on the dry shore strip — it now leaves the ledge deck's south lip on a free-fall arc into the lake's open water, fed by a flush deck flume, with plunge foam. The NORTH sheet (46 m of water standing in the open floor of the north pass, no rock at its lip height) is RETIRED; its spring pool and stream stay. The builder no longer clobbers the M14 64° Sun halo (the JSON carried 64 since M14).
- **Veil highland (lead):** room-card glass on villas / civic hall; hidden lawn vertices sink under the paving; lawn neutral; residents (visual-only, beyond reach, `gameplay_world_m20_residents` 7); soft Veil crystals; `a7f1fd4` the lens canopies built (mid-grey soffit, graphite fascia rim, clerestory drum, thicker columns — eye level a clear gain, from the air modest).
- **Wave 1:** cleanup + soft crystals; light / post / materials.
- **Wave 2:** sky (storm-light grey-violet day, deep-blue night, pearl sun, altostratus veil; lead review fixes: veil wrap pop, zenith streak bands, zenith `#63678b`); mountains round 1 (massif normals, fracture planes, spray-wet Veil rock, rock islands) + lead host-safety fix (ISLE_SW keeps M9 heights inside the reach square, `gameplay_world_m19_mountains` check 11).
- **Wave 3:** architecture / MAH MATCH / entrances (goalpost portal frames removed, built canopies + fascia names + downlights, stone base, per-portal uniforms, MAH MATCH screens + mezzanine hall); vegetation (district tree crown shading, metal root flare, no hanging diamonds; Veil blooms / hedges; zoned grass) + lead fix (no white caps on TITAN apexes at mid-range).
- **Mountains round 2 (`7cb6553` `f112927` + lead `4bb2760`):** crest caps / ledges / nose ribs, close-range rock detail, island relief; lead: crags clear the FIELD flight ceiling (the FIELD room flies to 100 m → solid art in the reach square clears 105.6 m; m19 check 15 reads dev_tuning).
- **Wave 4:** magic ecology (`91b45cc` + lead `a330208`: motes / pollen / night moths in one Points draw, the dotted rings round crown gems removed — the clear visible part; `gameplay_world_m20_ambient` 4); HALO dome / deck / interiors (`22c214e` `69e4ae3`: a built stone plaza instead of painted rings and a yellow dashed lane, raked gardens, flush furniture, lit soffit, material interiors with fewer draws; LOW no heavier).
- Full suite at `25653a6`: 69 files, 632 checks passed, 34 files failing — identical to the bridge-blocked baseline (`f15b_clean`); agents' runs since report the same 34.

## Running when these notes were written
- Wave 5 (`wf_6d79d964-dd9`): ground / roads / grass surface polish (terrain.js, surfaceDetail.js ground families, meadow.js, roadNetwork.js, hardscapeInlays.js) + remaining primitive plaza furniture (the big white faceted light pylons; cityScene.js outside the HALO, fixtures.js).

## Still weak / open
- The Veil rock itself: knife-thin collision / keep-circle fins at stations 109 / 111 and pale planar faces; FP (camera at the fin foot) still shows large pale sheets.
- In-reach ridge faces (V05, V16) read as giant flat slabs (the face is the collision plane: shading only).
- Sky: overhead a little flat; the world greyer under the storm light (owner to judge).
- District trees: crown silhouettes are the GLB's (tree lock forbids mesh edits); mid-range change is small.
- HALO deck: large, neutral, empty; V31 sun sheen; benches read as pale seats over black plinths.
- Veil villas from the air: the round lens plan still reads as a disc.

## Checkpoint still to do
Whole-world before (`c51ac67` frames) / after renders (day, night, phone MED), evidence sheets into `evidence/`, the M20 ledger section + index row, CONTINUE_HERE, full suite, one owner report with the seven requested items.
