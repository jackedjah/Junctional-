# M20 ledger notes (draft facts for the final ledger section; M20 starts at c51ac67)

## Owner directives
- M20 (2026-09-27): stop expanding; refine / remove / replace / retexture / re-light / reshape / polish; material realism; mountains, clouds,
  architecture; MAH MATCH; ground; water + waterfall ("the waterfall stays"); small NPC population where the host allows; lighting / post;
  SOFTENED PRECISION; crystals softened. Evidence: fixed-camera before/after; "If the improvement is not obvious: do not call it a win."
- Reinforcement (same day): decisive quality pivot; priority queue 1 waterfall / water transition, 2 rock smoothing, 3 sky / atmosphere,
  4 trees / crystal vegetation / grass, 5 buildings / entrances, 6 dome / interiors, 7 magic ecology, 8 surface polish, 9 life / NPC,
  10 remaining ugly areas.

## Lead: water (307214e dd71a47 6ef31ad)
- water.js skyWater(): dielectric Fresnel mirror of the atmosphere dome (live uniforms), calm / rough patches, ridge skyline band, BLUE clamp
  r <= 0.85 g, shore shallows (sea, mainland only). Canals, sea, Veil basin, WATER_NEAR. Night follows the dome (live getters).
- Flume rows on the channel frame (no fanned spikes).
- 3c111a5: ripple NEAR window wears the body's skyWater uniforms (no dark 48 m square round the player at sea); sea day #1f5fb0 -> #2b4760.

## Lead: the Veil Falls
- ca0877b / 94902b1: the FILM — the fall reaches the sea as the ridge's own triangles 3 cm proud below 3.8 m (host-safe), long vertical runs.
- fd96acc: the curtain read as tall folded glass fins. Causes: (1) the face is a zigzag of knife-thin buttress fins and ~45 m bays; the
  curtain rode 2 m off every facet with 180-degree hairpins; now rowPath (offset + hairpin clearance + smoothing, eased 70 % toward the
  field-side hull span as it falls); (2) the lip followed the crest 80 -> 147 -> 86 m (a triangle of water on a slope); now three LEVEL-lipped
  strands from the notches 107 / 110 / 112 (uStr mask), main 110 carries the flume; (3) water body paler, more opaque, horsetail clumps.
  Rock clearance probe: 20 / 4462 vs 65 / 2254 vertices inside / near rock.
- ce66618: VEIL_FALLS_PLUNGE (flush plunge line, 3 cm, strands' mask, all tiers); chord-frame blend (lower curtain sharpest turn 52 deg, was 180).
- 3e8f1b7: VEIL_FALLS_SPRAY (HIGH / MED): billowing spray wall from 3.6 m up, 3–12 m off the landing line, eye fade 6–30 m.
- 1cd4acc: hem dissolves raggedly into the spray; film fades in at its top.
- Tests: m20_water check 8 (film flush), check 9 (strands, lips under crests, no fold-back, plunge flush); veil_district draw budget 16 -> 18.
- Evidence: m20_falls_strands.jpg (dbf7d4d vs 1cd4acc, FW1 / F2 / PP / FA day + night), m20_falls_to_sea.jpg, m20_water_flume.jpg.
- Still weak: the rock itself (knife-thin fins at 109 / 111, pale planar faces — collision / keep-circle geometry); FP (camera at the fin foot)
  still shows large pale sheets; small TITAN / NORTH falls are flat sheets (inside reach).

## Lead: residents (c2f035f) — visual-only Veil population (HIGH 25 / MED 12 / LOW 0), beyond reach, roles + why, gait, night presence; test 7/7.

## Lead: Veil crystals (8ba9ebc f140a8b) — soft gems / rooted columns replace raw octahedra; slender pale spire.

## Lead: Veil highland (4552db1 25653a6)
- VEIL_VILLA_GLASS room-card shader: mullions by day, varied lit rooms at night (was a flat cream blank screen).
- Lawn poke-through: 119 meadow vertices up to 13.5 cm above paving (a hard dark patch on the HL1 path) -> hidden vertices sink under paving.
- Lawn palette re-balanced under the lavender sky (hue 336 mauve -> neutral, sat 0.02).

## Wave 1 (merged): cleanup + soft crystals (7edc28f 8fe902a); light / post / materials (86abcd5 dcaed60)
## Wave 2 (merged): sky (c516529 + lead ef6ec90); mountains (e2aae5b 3c0c673 + lead 3c111a5 ISLE_SW host-safety fix, check 11)
- sky: storm-light day (zenith #63678b after lead fix), deep blue night, pearl sun, altostratus veil, clouds break from above, rig colours
  follow the sky, fog written to the real scene. Review notes: overhead a bit flat; world greyer; terrace contours on near cumulus (jitter 0.2).
- mountains r1: massif normals, fracture planes, bent strata, spray-wet Veil rock, per-pixel far ring, rock islands, islet canopies; review:
  real but modest, silhouettes unchanged -> wave 2b.

## Suite: 69 files, 632 checks passed, 34 failing (= bridge-blocked f15b_clean) at 25653a6; +2 m19 checks at 3c111a5 (check 11 added by lead).

## Lead: mountains round 2 merge (7cb6553 f112927 + lead 4bb2760)
- crest caps / ledges / nose ribs + close-range rock detail map + island relief + MED trim (agent); lead: CRAG_FLY_Y 56 -> 105.6 (FIELD flies to
  100 m — dev_tuning local_authority.play.rooms.FIELD.flight_ceiling_m); m19 check 15 reads the FIELD ceiling. Evidence mtnfix/cmp_a.jpg,
  zoom_a.jpg: CL1 / V27 crowns now broken summits (no knife apex, no cut-end hole), close-range fracture detail; lower in-reach crowns = round 1.

## Lead: small falls (c25fb59)
- TITAN: hung in the air 3.4 m in front of the ledge deck, half past its corner, landing on the dry shore strip -> leaves the deck's south lip
  (159.6, 12, 122) on the free-fall parabola into open water (z 115.2), flush feed flume on the deck from the monolith inlay, churned foam
  (plungeFoamMaterial), VEIL_SPILL glassy tongue -> whitening -> ragged hem. Evidence smallfalls/m20_small_falls.jpg (TF TFc TFs TFq b0 vs a4).
- NORTH: 46 m sheet in the open floor of the north pass (no rock at the lip height) -> RETIRED (sheet / plunge / mist / aura); spring pool +
  stream stay; registry entry kept (ridge keep circle). Evidence smallfalls/cmp_n6.jpg (NC NG NH NW).
- builder fix: PASS-1 line no longer clobbers the M14 64-degree Sun halo (JSON was hand-patched since M14).

## Wave 4 (merged): magic ecology (91b45cc + lead a330208), HALO dome / deck / interiors (22c214e 69e4ae3)
- magic: ambientMagic.js motes / crystal pollen / night moths (1 Points draw; HIGH 464 / MED 193 / LOW 0 pts), aura.js: 18 dotted rings round
  crown gems + 5 small orbit rings removed (the clear visible win); lead fixes: moth footprint sqrt(2) r, one moth per Veil bench; test
  gameplay_world_m20_ambient (4). Reviewer: the ecology itself is near-invisible at 960x540 — not counted as a visible win.
- HALO: built stone plaza instead of painted rings + yellow dashed lane (V08), raked gardens, flush furniture, lit soffit (V09), material
  interiors (gym / shops: draws 71->45, 42->17, 52->30, 56->33); review fixes: LOW no heavier (texture cap), sky-walk dot frit removed, dome frit
  moire, medallion glare. Re-verify PASS (lead re-ran it after a container restart). Still: deck large / neutral / empty; V31 sun sheen;
  benches pale seats over black plinths (no colliders, pre-existing); serve targets read as three touching rings.
## Lead: Veil villas (a7f1fd4) — lens canopies built: mid-grey soffit (+1 draw VEIL_VILLA_SOFFITS), graphite fascia rim, white clerestory
  drum, thicker columns; black soffit (v1) and dark skylight hole (v2) rejected. Eye level a clear gain, from the air modest. villa3_sheet.
## Lead: flume regression fix (099c6b6) — strand lip whitening (a world-height band) had blown the whole flume out to white at FK since
  1cd4acc; confined to the falling water + last metres of the flume. fk1_sheet. m20_water check 11. Lesson: render every camera of an area.
## Lead self-review (rev1 = c25fb59 vs c51ac67; sheets rev1_part1, rev1_p2..p6, rev1n_sheet): see AGENT_BRIEF STATE AFTER WAVE 4.

## OWNER ENHANCEMENT DIRECTIVE (2026-09-28): hard enhancement mode, no expansion — priorities: clarity / elegance, waterfall + rock + water
   contact, sky / moon, buildings / entrances / dome, flora smoothing, class-colour distribution, magical micro-motes, fitness / combat cues.
## Lead: Moon whole (186d664) — traced L0 torn by the 8 k collapse (3 038 open edges, collapse-map UVs smear the atlas) -> same-material core
  closes the shell + the GLB's own crystal map sampled triplanar; clone() JSON-copied userData made the core NaN-black (found + fixed);
  lineage tests unchanged; m5_moon_cloud check 17. Evidence moon/t2_cmp.jpg (before | after | core only).
## Lead: falls base + close read (a8d2090) — concentric sine rings on the sea -> flow-mapped lace foam; curtain / front / small falls fade
  edge-on and dissolve near the eye (VEIL_FACING + normals); spray 0.75 -> 0.6, eye fade 10-45 m. wf/m20_falls_base.jpg. WA clear gain,
  FW1 modest; WB (inside the fall) still bands. Rejected: crease normals 68 -> 95 deg (invisible).
## Wave 5 plaza furniture merged (3615b3b c08c25b): white faceted pylons -> slim light masts, floating ramp bars -> nosings, contactAO
  follows the mast; open: classic near-black lantern heads read retro (wave 6 buildings_dome restyles), r 0.6 collider vs slim mast.
## Wave 6 running (wf_516681a6-78d): sky_atmosphere, mountain_smoothing, buildings_dome. Wave 5 surfaces in its fix round.
## OWNER CLARIFICATION (2026-09-28): identity pass = balanced visual IMPORTANCE, not equal coverage; neutrals stay the foundation; correct
   BLUE dominance; GOLD / CRIMSON / PINK memorable via landmarks, architecture, crystal ecology, lighting, hardscape; PURPLE = VISIONARY;
   priorities: recognizable identity, tasteful distribution, hierarchy, gameplay readability, restraint. Recorded in AGENT_BRIEF for wave 7.
## Wave 6 merged (wf_516681a6-78d): sky / atmosphere (92c4e17), mountain smoothing (3f3becf), buildings / entrances / dome (3857cdb)
- sky: code-set storm-calm day grade (zenith #5a5680 .. haze #d4cfe0, near-neutral violet-grey), contained Sun, cloud masses with weight.
  Open: the sun still a large pale disc; cloud rim sawtooth -> sky round 2 (wf_e10e2b2f-de8) running.
- mountains: per-pixel rounded folds on the in-reach collision faces (HIGH, no vertex moves), fin noses rounded beyond reach
  (ridgeSculpt 1b), crag crest caps without knife tips, far massifs capped / off the icy pyramids (lavender-grey). No draw / tri added.
- buildings: plaza masts -> modern halo luminaires (retro black lanterns gone), night pools that read (alpha, equal-channel), stone base
  storeys on the Training Hall / MAHGIC Exchange, HALO serve court (reticle targets, gold bullseye) + graphite return portal, bench bases,
  honed dais (V31 white sheet 2.95 % -> 1.64 %), signage off ramps. Tests 71 files / 654 checks; 34 bridge-blocked unchanged.
## Lead: aura fragments (02f3cc2) — owner item G. FRAGMENT kind in ambientMagic (rhombus / cube / soft ring, turning), loose clusters over the
   groves (own class light), NEXUS (gold / crimson / pink-led, pearl, one blue, never purple), Veil lanes; premultiplied blend so a faint class
   body reads on the bright day sky (pure additive light was invisible — a1/a2/a3 rejected); night glow in the class tint at full brightness
   (crimson + white read pink — fixed). Subtle: visible at street / grove range (FC1 / FC2), specks in wide views. North groves (gold N_E,
   red N_W) get no ambient at all — against the ridge collision face (host law). m20_ambient check 5. Suite 655 / 34 bridge-blocked.
## Wave 5 SURFACES merged (0057fd7 + 72d1626 = b50d8b4 + fix 55a2f20): road stone in road space (V25 blue slab -> laid stone, RV1 amber road ->
   gold-toned setts, V03 blue forecourt -> neutral stone), humanized plaza paving + sett band, grove planted beds. Review 1 blocked on LOW cost
   (+50 % road ALU, RGBA wear); fix: LOW at/below a330208 NIR counts (road core 1027 -> 1026, kerb 948 -> 926, zoned 1684 -> 1680), R8 LOW wear
   bit-identical; night bed / sett glints calmed. Re-verify PASS (own NIR dump, packing decode check, renders). MED zoned floors +33 % static ALU
   (justified by the visible MED gain; untimed — phone timing is the owner's). Suite 655 / 34 bridge-blocked.
## Sky round 2 merged (3b2adf1 + lead 0406e43): soft cloud rims (no sawtooth), storm-light weight (key extinction, shaded bellies), the Sun a
   white-hot core in a graded glow (near-white share V27 2.6 -> 1.1 %), far tower streak cards dropped (dotted band). Review PASS with one
   trade-off: front-lit bodies went dull grey (V21 crown p90 0.72 -> 0.55 vs sky 0.48). Lead: belly only where the key does not reach +
   day gain 1.25 -> 1.44, sigL 0.16 -> 0.112, hazeMax 0.4 -> 0.46 (tuned in-page, 4 variants) -> crowns p90 0.60 / 0.68 / 0.735 above the sky,
   bellies kept. Open: V27 whirl loops softened not gone; small bodies read as smooth capsules; residual stipple on MX lens / TS1 bank.
## Wave 7 IDENTITY merged (64e9066 + lead bbc0312): gold NEXUS emblem halo (gold / pearl prism, day + night), Gold Temple gilded (bronze ->
   gold by day, brass at night), plaza canvas / route lines / trims neutral, Gold Temple ring gold, four floating 0x9fd0ff spheres removed
   (below 3.4 m in reach), Arena cornice five-class band (the one combat-culture cue — reads as identity, flat stripe by day), LEAN /
   VISIONARY platform fascia in class light, colour-law fixes (TITAN lamp head cyan 197-200 deg -> 218-221, gym holo, duel palette pearl,
   floating-crystal default pearl). Causeway core -> neutral was already achieved by the surfaces merge. Review PASS; honest: modest step.
   LEAN still weak: LEAN_SPIRE_HOUSE is buried in MACRO_RIDGE_RIDGE_NEAR (raycasts) — only its 22 m platform + crown show -> OWNER DECISION
   (relocate / reshape = layout change). MAH GYM stays blue (owner M6). Lead tried + rejected a crimson LEAN sky beam (thin pinkish line by
   day, laser line at night — not a memorable moment). Lead: material_realism check 5 pins the trim emissive equal-channel (mutation-checked).
   Suite 655 / 34 bridge-blocked.
## Wave 7 FLORA merged (3461b8f + lead c2d9e48): calmer crowns (half atlas normal, crown-envelope normal, specular AA, fewer white-pink
   glints), satin trunks + root contact AO, TREE PITS on paving (69 of 121 trees; grid texture, no draw), arching meadow clumps (blade
   counts down), family-true resource bushes (gold / crimson instead of khaki / salmon; family night glow; soil bed instead of black disc),
   floating gem facets. Review PASS (modest, close-range). Lead: the terrace grove bed overlay REMOVED (a 90 x 33 m flat dark soil sheet on
   the north terraces, worse than the slab), dead bedOnly hook removed, pebbles zero-slope rim. Open: crown silhouettes (GLB, tree lock),
   terrace trees on bare slab, pebble / pit seam nits, Veil grass / trunks (lead's veilFalls: port the arching clump + 10-12 sided trunks).
## Lead self-review (ea8cd39) from the whole-world set at bbc0312: HALO soffit by day = grey coffered ceiling (bounce: its own coffer map
   at 0.4; the dayNight handler swapped whole glow — it had reset only intensity to 0.05), V09 soffit 65 -> 87, night unchanged; aura soft
   rings -> wide halos (V06 'O' icons). Suite 655 / 34 bridge-blocked.
