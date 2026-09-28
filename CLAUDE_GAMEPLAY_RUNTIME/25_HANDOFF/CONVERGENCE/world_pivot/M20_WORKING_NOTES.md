# M20 working notes — quality pivot (in progress; the ledger section is written at the checkpoint)

M20 starts at `c51ac67`. Owner directive 2026-09-27: stop expanding; refine / remove / replace / re-light / reshape / polish. Reinforcement (same day), priority queue: 1 waterfall + water transition, 2 rock smoothing, 3 sky / atmosphere, 4 trees / crystal vegetation / grass, 5 buildings / entrances, 6 HALO dome / interiors, 7 magic ecology, 8 surface polish, 9 life / NPC, 10 remaining ugly areas. Lens: "does this look like a real premium game world where our characters naturally belong?" Evidence standard: fixed-camera before / after; "If the improvement is not obvious: do not call it a win."

Owner ENHANCEMENT DIRECTIVE 2026-09-28 ("hard enhancement mode", no map expansion): 1 clarity / elegance / realism, 2 waterfall + rock + water contact, 3 sky / moon ("calm before the storm, violet-gray"; the moon whole), 4 buildings / entrances / dome, 5 vegetation / crystal flora smoothing, 6 class-colour distribution, 7 subtle magical micro-elements (rhombuses, cubes, soft aura forms; not pickups), 8 fitness / combat identity cues (not gym spam). Owner CLARIFICATION for the identity pass: balanced visual IMPORTANCE, not equal pixel shares; neutrals stay the foundation; correct BLUE dominance; GOLD / CRIMSON / PINK memorable through landmarks, architecture, crystal ecology, lighting, hardscape; PURPLE stays VISIONARY's. Report owed: what improved, what was removed because weak, what remains weak, what needs owner approval; bridge-blocked items separate.

Method: worktree agents per area → adversarial review → fix → re-verify → the lead merges (cherry-pick) only what passes, fixing any remaining blocker itself; the lead works the waterfall / water / Veil / moon / ambient lane directly. Agent brief: `M20_AGENT_BRIEF.md`.

## Merged (branch tip `02f3cc2` at the time of writing)
- **Water (lead):** `water.js` skyWater — Fresnel mirror of the live atmosphere dome, calm / rough patches, ridge-skyline band, sea shore shallows; slate sea `#2b4760`; Veil lake lighter.
- **Veil Falls (lead):** film down the rock to the sea; three level-lipped strands (107 / 110 / 112); curtain in the chord frame; spray wall; flush plunge line; `099c6b6` flume blow-out fixed; `a8d2090` the base: flow-mapped lace foam instead of concentric rings, the curtain / small falls fade edge-on and dissolve near the eye, softer spray.
- **Small falls (lead, `c25fb59`):** TITAN fall leaves its ledge lip on a free-fall arc into open water, flush feed flume, plunge foam; the NORTH sheet (no rock at its lip) retired.
- **Moon (lead, `186d664`):** the traced L0 GLB shell is torn (3 038 open edges); a same-material core closes it and the GLB's own crystal map is sampled triplanar — whole, lineage kept (m5_moon_cloud check 17).
- **Veil highland (lead):** room-card glass, residents (visual-only, beyond reach), soft crystals, `a7f1fd4` villa lens canopies built.
- **Waves 1–4:** cleanup + soft crystals; light / post / materials; storm-light sky r1; mountains r1 + r2 (crest caps, crags clear the FIELD flight ceiling 105.6 m); architecture / MAH MATCH / entrances; vegetation; magic ecology (motes / pollen / moths); HALO dome / deck / interiors.
- **Wave 5a plaza furniture (`3615b3b` `c08c25b`):** the white faceted pylons became slim light masts.
- **Wave 6 (`92c4e17` `3f3becf` `3857cdb`):** sky — code-set storm-calm violet-grey day grade, contained Sun, weighted clouds; mountains — per-pixel rounded folds on the in-reach collision faces, rounded fin noses beyond reach, far massifs off the icy pyramids (no draw / triangle added); buildings — modern halo luminaires with night pools that read, stone base storeys, HALO serve court with reticle targets + graphite return portal, bench bases, honed dais.
- **Aura fragments (lead, `02f3cc2`):** small crystalline rhombus / cube / soft-ring shapes drifting in loose clusters over the groves (own class light), the NEXUS plaza (gold / crimson / pink-led, never purple) and the Veil lanes; a faint class body (premultiplied blend) so they read on the bright day sky. Subtle by design (street / grove range). The two north groves (gold N_E, red N_W) carry no ambient life at all — they sit against the ridge collision face (host law).
- Full suite at `02f3cc2`: 71 files, 655 checks passed, 34 files failing — the bridge-blocked set (`fail_w2`) exactly.

## Running when these notes were written
- Wave 5 SURFACES fix round (road stone, humanized plaza paving, grove planted beds — held back only by the LOW-tier cost rule).
- Sky round 2 (sun disc, cloud rim sawtooth).
- Wave 7 IDENTITY (per the owner clarification: blue de-dominated in shared spaces, one memorable gold / crimson / pink moment each, purple VISIONARY-only, at most two restrained fitness / combat cues). Research: scratchpad `m20/identity_map.md`.
- Next: wave 7 FLORA smoothing (forest.js, meadow.js, crystal clusters) once the surfaces round merges (meadow.js overlap).

## Still weak / open
- Inside the Veil fall (WB) the curtain still shows bands; the Veil fins at stations 109 / 111.
- In-reach ridge faces (V05, V16): the face is the collision plane — shading only (wave 6 rounded folds help at HIGH).
- Sun: still a large pale disc (sky r2); cloud rim sawtooth.
- District trees: crown silhouettes are the GLB's (tree lock forbids mesh edits).
- HALO deck: large and neutral; Veil villas from the air read as discs.
- The ambient life (motes / pollen / moths / fragments) is subtle at 960×540 and absent from the two north groves.

## Checkpoint still to do
Whole-world before (`c51ac67` frames) / after renders (day, night, phone MED), evidence sheets into `evidence/`, the M20 ledger section + index row, CONTINUE_HERE, full suite, one owner report.
