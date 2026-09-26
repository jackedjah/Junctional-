# MAHWORLD — MASTER WORLD PIVOT LEDGER

Owner directive 2026-09-25: **FULL AAA WORLD PIVOT / PREMIUM WORLD PASS** — AAA *perceived* quality with smart real-time scalability; bright
fantasy DAYLIGHT is the hero presentation; the five-colour law (ATHLETE gold · TITAN blue · LEAN red/crimson · VISIONARY purple/violet ·
BAGE pink; neutral platinum/silver/graphite/steel/black/glass/stone/white light as support). Owner review is the final visual gate: nothing
here claims subjective approval, physical-phone performance or authenticated hosted gameplay.

Branch `backup/mahworld-m6-20260924T190351Z`; pivot starts from `b94e611` (DAY-first default). Production and every protected preview are
untouched; no deploy is part of this ledger.

## Owner review index (nothing below is marked approved)

| look at | what changed | where |
|---|---|---|
| sky / Sun / Moon / clouds | lit billowing cloud bodies, lavender Moon by day, white-gold Sun | `evidence/pass1_before_after_day.jpg` |
| whole world, day | ground, mountains (rock grain, snow), coast, civic façades, HALO, fog reach | `evidence/cp2_before_after_day.jpg`, `cp4_vs_cp2_day.jpg`, `cp6_vs_cp4_day.jpg` |
| night | far massifs no longer glow; caps dimmed | `evidence/cp4_vs_cp2_night.jpg`, `cp6_vs_cp4_night.jpg` |
| HALO | deck pattern, glass sky-walk, iridescent dome, rim colonnade, celestial rings | `evidence/cp3_vs_cp2_day.jpg` (V08 V09 V12 V14) |
| class houses | VISIONARY overlook, LEAN spire house | `evidence/before/desktop_day/V16_DAY.jpg`, `V17_DAY.jpg` → `evidence/cp6_after/desktop_day/` |
| map | five-territory map, phone + desktop | `evidence/cp4_after/desktop_day/MAP_phone.png`, `MAP_desktop.png` |
| phone-sized frames (desktop emulation, NOT a phone test) | MED tier 393×852 | `evidence/cp4_after/phone_med_day/` |
| M8C rock / construction / water | stratified jointed rock with ledges, crystal facets, natural forest ground, shallows at the banks, civic piers / fascias / service bay / entrance transom | `evidence/m8c_rock.jpg`, `m8c_world.jpg`, `m8c_construction.jpg`, `m8c_night.jpg` |
| M8D clouds + Scenario pilot | noise-eroded cloud shapes, body lighting, flat shaded bases, towering horizon cumulus, lavender Moon kept clear; the rock texture pilot (isolated) | `evidence/m8d_clouds_day.jpg`, `m8d_clouds_halo.jpg`, `m8d_clouds_night.jpg`, `m8d_clouds_phone.jpg`, `evidence/scenario_pilot/` + `SCENARIO_PILOT.md` |
| M8E lived-in buildings | real windows per floor with rooms behind the glass, lit / dark rooms at night, storefront entrances, balcony, service bays, parapets + roof access; one synchronised class-colour light show (plaza, sanctuaries, HALO rim); LEAN spire house windows + door | `evidence/m8e_facades_day.jpg`, `m8e_facades_night.jpg`, `m8e_plaza_day.jpg`, `m8e_show_steps.jpg`, `m8e_houses_halo.jpg`, `m8e_phone_med.jpg` |
| M9 world refinement round 1 | mountains as rock mass, far massifs, clouds without pancakes, meadow only on natural ground, coast beach (flip fix) + islands, tree-elevator grounding, mid-distance bridges / towers, HALO garden terraces + promenade + lit lattice nodes, night light pools, terrace risers, MAH MATCH cladding | `evidence/m9_mountains.jpg`, `m9_clouds.jpg`, `m9_ground_coast.jpg`, `m9_structures.jpg`, `m9_halo.jpg`, `m9_night.jpg`, `m9_phone_med.jpg` |
| M10 world cohesion + runtime bridge | the ten-file runtime bridge (one owner command); ridges sculpted beyond reach, far massifs with shoulders and broad summits; cumulus cells in depth; HALO rim garden, shell transoms, class garden light; entrance aprons + slot drains, canal-bank coping | `RUNTIME_BRIDGE_MANIFEST.md`; sheets `evidence/m10_mountains.jpg`, `m10_clouds.jpg`, `m10_halo.jpg`, `m10_public.jpg`, `m10_night.jpg`, `m10_phone_med.jpg` |
| M11 unblocked world realization | HALO: radial deck with eight ring zones, seams, drains and steps; an engineered shell (girder ribs, ring beams, collars, shoes, frit); promenade lamps and handrail light; the trunk built in lifts. World: road bends fixed (39 open outer corners); the dark sea square around the player fixed; far seams stop aliasing; civic furniture built; bollard lights; arena structure; cable-stayed bridges; eroded cloud rims and fibrous cirrus | sheets `evidence/m11_halo_day.jpg`, `m11_halo_shell.jpg`, `m11_halo_night.jpg`, `m11_structures.jpg`, `m11_public.jpg`, `m11_sky_water.jpg`, `m11_night.jpg`, `m11_phone_med.jpg`, `m11_phone_low.jpg`, `m11_cirrus_postpin.jpg` |
| M12 hard pivot: magical scenic world (latest) | the Veil Falls (~150 m down the west cove into the sea) and the hanging Veil highland beyond reach (villas, crystal groves, source lake, belvedere, landing pad, 72 m spire; entering it waits on the bridge); one spectral aura field (class crowns, hero landmarks, HALO beacons, the plaza emblem, a Sun halo / Moon corona, the class crystals, the older falls); MAH MATCH neo-Tokyo facade (class-coloured light packets, crown ticker, signage blade); the older falls pour the Veil water; HALO class beacon masts | sheets `evidence/m12_falls_day.jpg`, `m12_falls_night.jpg`, `m12_highland.jpg`, `m12_aura.jpg`, `m12_matchhall.jpg`, `m12_phone_med.jpg`, `m12_phone_low.jpg`, `m12_postpin_crystals_falls.jpg`, `m12_postpin_veil_day.jpg`, `m12_halo_masts.jpg` |

## How evidence is produced

- `26_LOCAL_AUTHORITY/deploy/world_preview/` renders the REAL client world (`lab/fieldScene.js` + the registry world layer, HALO included)
  WITHOUT the gameplay host, from the same generated collider authority, at FIXED viewpoints (`capture.mjs` → `VIEWS`; twelve at the start, V13–V17 added later and captured BEFORE from the same pinned commit). Headless
  Chromium with software WebGL (SwiftShader): stills are faithful, frame times are NOT performance evidence.
- `contact_sheet.py` pairs BEFORE | AFTER per viewpoint. Evidence lives under `world_pivot/evidence/` (JPEG q84, 1280×720 desktop HIGH and
  393×852 phone-sized MED).
- Every capture runs from a git worktree PINNED to the commit it documents (never the live tree, which may be mid-edit).
- Renderer counters (draw calls, triangles, programs, textures) come from `renderer.info` at each viewpoint and are recorded per pass as the
  relative performance effect.

## Fixed viewpoints

| id | viewpoint |
|---|---|
| V01 | plaza hub toward the temple causeway |
| V02 | world overview from the south |
| V03 | ATHLETE gold temple forecourt |
| V04 | TITAN blue tower and gate |
| V05 | LEAN crimson canyon corridor |
| V06 | VISIONARY purple highland overlook |
| V07 | BAGE pink market and basins |
| V08 | HALO deck arrival court |
| V09 | HALO dome from the ground |
| V10 | sky toward the Sun |
| V11 | south coast horizon |
| V12 | view back over MAHWORLD from the HALO rim |
| V13 | plaza street level toward the tree elevator |
| V14 | HALO glass sky-walk looking down |
| V15 | civic façade close (Mentor Spire) |
| V16 | LEAN spire house on the north-west terrace |
| V17 | VISIONARY overlook close |

V01 note: its camera sits just behind the Arena Dome, so the chrome roof fills the lower half of the frame; it is kept unchanged for
like-for-like comparison and V13 was added for the true street-level plaza read.

## BEFORE audit (b94e611, DAY, desktop HIGH)

Evidence: `evidence/before/desktop_day/`, `desktop_night/`, `phone_med_day/`.

- Sky: flat mid-blue dome; low/mid clouds are horizontal cards with a dark slate texture that read as grey smudges/streaks from the ground;
  the Sun is an orange textured ball; the Moon is night-only.
- Light: hemisphere fill 1.15 + exposure 1.35 flatten lit and shaded faces toward the same pale grey-white.
- Terrain: the playable mainland reads as a rectangular plate floating in a gridded sea (V02); the plaza is a flat white slab (V01);
  mountains are pale flat-shaded triangles.
- HALO: an enormous empty white deck with one small court (V08); from the ground it reads as a glass mushroom (V09).
- Architecture: civic buildings are plain cylinders with cyan bands; imported temple/tower/market are the most detailed structures.
- Colour law: 45 off-law literals (41 teal/cyan, 4 green) in 16 files — see PASS C.

## PASS 0 — cloud runtime closure

| field | value |
|---|---|
| files | `deploy/bridge/trace_runtime_bridge.mjs` (new) |
| goal | find the MINIMUM public-safe files the public branch lacks, without uploading whole folders |
| evidence | self-test on this clone: 3 programs + static build traced, repository byte-identical afterwards (a test that writes inside the tree was redirected to the shadow), the 10 known missing files reported exactly |
| perf | n/a |
| tests | tracer self-test only |
| unresolved | owner runs ONE command against the archive folder and uploads `files/` |
| next | after upload: all 58 programs, static build, release gate (no deploy) |

## PASS 1 — sky / atmosphere / celestial (checkpoint 1)

| field | value |
|---|---|
| files | `lab/world/cloudBodies.js` (new), `lab/world/sky.js`, `lab/world/celestial.js`, `lab/world/atmosphere.js`, `lab/fieldScene.js` (DAY light rig), `lab/play.js` (exposure), `deploy/jobb/build_registry.mjs` → `world_registry_v1.json` (atmosphere palette, Moon/Sun), `play/rules1723/world_v1_colliders.json` (registry hash only), `16_TESTS/gameplay_m5_moon_cloud.test.mjs` |
| visual goal | bright fantasy DAYLIGHT hero; long layered billowing clouds with warm tops / cool undersides / luminous edges; a very large lavender Moon visible by day; a Sun that reads as the light source; stronger light-to-shadow separation |
| before | `evidence/before/desktop_day/` (sheet: `evidence/pass1_before_after_day.jpg`, left) |
| after | `evidence/pass1_after/desktop_day/` (same sheet, right); night + phone frames follow from the committed tree |
| perf (renderer.info, 12 desktop views) | draw calls 2249 → 2345 (+8 per view: the daylight Moon, its limb glow and effects), triangles 13.53 M → 13.65 M (+0.9 %), programs max 143 → 138, textures max 76 → 79. Cloud bodies: 1 instanced draw per layer, ~250–400 puffs, CPU back-to-front sort every 0.25 s; tiers scale puffs HIGH 1 · MED 0.7 · LOW 0.45. Fill-rate is NOT measured (software GL). |
| tests | all runnable programs unchanged vs baseline; Moon/cloud 19/19 (checks 5, 10, 10b rewritten to the new owner contract, 10c added: deterministic flat-base + billowing-crown cluster) |
| what changed | low/mid clouds are lit puff-cluster bodies (shade by height inside the whole cloud, wrap light from the active key, silver lining, aerial perspective, upright near the horizon and camera-facing when viewed steeply); high cirrus is a bright wispy veil; atmosphere gains a luminous horizon (`haze_k`), a wide warm Sun glow and a lavender anti-solar band; the Moon is 11° (was 6.2°), lavender-tinted with a uniform glow + fresnel limb, visible by day and night but still the key light only at night; the Sun disc is over-bright/untonemapped with its derivative texture lifted toward white-gold and a wider halo; DAY key 2.35 → 3.0 warm, hemisphere 1.15 → 0.8 with a warm ground bounce, exposure 1.35 → 1.15 |
| unresolved | clouds seen from directly below still show some overlapping puff outlines; far mountains / ground still pale and flat (PASS 2); owner visual review |
| next | PASS 2 terrain / ground / mountains / coast |

## PASS C — colour law (checkpoint 1)

| field | value |
|---|---|
| files | `lab/world/{creatures,entityStatus,fixtures,gear,guides,macro,matchHall,signage,water,wildlife,worldB}.js`, `lab/{fieldScene,cityScene,interiorScene}.js`, `lab/assets/botany/tree_spec.js`, `deploy/jobb/build_registry.mjs`; new `deploy/world_preview/colour_law_audit.mjs` + `16_TESTS/gameplay_world_colour_law.test.mjs` |
| goal | ONLY gold / blue / red / purple / pink as expressive colours; neutral support elsewhere |
| before | 45 off-law literals (41 teal/cyan, 4 green) in 16 files |
| after | 0. Civic accents (trims, fixtures, signage, architecture lines, MAH MATCH, interiors, guide/fairy glow) → neutral white light; Dogkie aura, fish tint and status plates → TITAN blue; pools → natural water blue; plaza botanicals → platinum leaves with NEXUS gold energy; the VERDANT green family is retired (ISLE_E / ISLE_FAR_E → blue, ISLET_VERDANT → red); MAH MATCH is black / graphite + white light (was canon cyan — the owner law supersedes it) |
| tests | new colour-law program 4/4: classifier, zero literals across 35 world-art files + registry, crystal families exactly the five + platinum, every referenced colour family in the registry is lawful |
| unresolved | literal scan only: colours computed at runtime (HSL maths) and GLB-embedded textures are not scanned; status-plate semantics (hostile blue / friendly white / low red) await owner review |

## PASS 2 — terrain / ground / mountains / coast (checkpoint 2, host-safe scope)

Walkable elevation inside the field walls is shared with the host (worldLayout.groundYAt + generated colliders) and its tests cannot run
until the runtime bridge lands, so this checkpoint changes ONLY what the host never reads: materials, the ridges and massifs beyond the
walls, and the coastline beyond the walls.

| field | value |
|---|---|
| files | `lab/fieldScene.js` (daytime floor stone palette), `lab/farWorld.js` (FAR massifs), `lab/world/macro.js` (ridge faceting + inward rock displacement), `lab/world/coast.js` (organic coastline), `deploy/jobb/build_registry.mjs` (ground policy, ridge colours, `coast.outline.organic_m`) |
| visual goal | remove the white-mirror floor and the flat-paper mountains; replace the machined rounded-rectangle coast with headlands and bays |
| what changed | DAY ground policy metalness 0.9 → 0.25, roughness 0.42 → 0.58 (satin stone that answers the Sun) with a warm mid-grey stone base under the existing seams / inlays; macro ridges shade by true facet orientation with rock pushed INTO the mountain body (never over the playable side) and neutral slate → warm stone → white crystal-cap colours; FAR massifs are noise-displaced rocky peaks with baked warm-lit / cool-shadow facets from the Sun direction, pale caps and aerial perspective toward the daylight haze; the coast breathes outward 0–16 m (sea hole, foam and seaTest share the same offset; host sea schools stay ≥ 50 m out) |
| evidence | `evidence/cp2_after/{desktop_day (15 views + MAP_phone / MAP_desktop), desktop_night (V02 V08 V10 V12 V14), phone_med_day (V01 V03 V08 V10 + maps)}`, captured from a worktree pinned at `a46bed0`; sheets `evidence/cp2_before_after_day.jpg`, `cp2_before_after_night.jpg` |
| perf (renderer.info, V01–V12 desktop, checkpoint 2 = PASSES 2–5 together) | draw calls 2345 → 2322, triangles 13.65 M → 13.98 M (+2.4 %: rocky FAR massifs, HALO lattice / sky-walk frame), programs max 138 → 140, textures max 79 → 81 |
| tests | runnable programs unchanged vs baseline (22 green, 418 checks) |
| unresolved | terrain folds / berms / valleys INSIDE the walls wait for host verification; roads and region-tint transitions; water material |

## PASS 3 — civic architecture (checkpoint 2)

| field | value |
|---|---|
| files | `lab/cityScene.js` |
| goal | premium, believable civic buildings: structure first, light second, collision parity kept |
| what changed | satin anodised platinum panels (metalness 0.9 → 0.62), smoked neutral curtain-wall glass (was the civic cyan band), warm-white doorway light; per building a graphite plinth, thin floor cornices every 3.6 m above head height, a cantilevered entrance canopy with a white-light underside and a merged roof-plant cluster (condensers, tank, mast + beacon, tilted solar array) — +2 draws per building, everything inside the collider footprint or above 3.4 m |
| unresolved | the five sanctuaries' landmark buildings (imported temple / tower / market and the procedural LEAN / VISIONARY houses) are audited but not yet re-dressed; texture-level material families wait on the Scenario decision |

## PASS 4 — HALO hero realm (checkpoint 2)

| field | value |
|---|---|
| files | `lab/cityScene.js` (treeElevator) |
| goal | a signature landmark — premium circular construction, luminous rings, views back over MAHWORLD — while the host contract (240 m deck, 144.8 m playable radius, elevator-only access, court, flight) is untouched |
| what changed | the deck is one opaque plan-drawn top to 128 m (satin platinum stone, paving bands and seams, luminous white inlay rings at 24/48/72/96/120 m, five class spokes and sectors, a segmented light-ring medallion at the elevator arrival; texture follows the tier cap); a GLASS SKY-WALK annulus 128–153 m (16.8 m walkable) with a merged platinum mullion grid and a glass balustrade + rail at the playable edge lets the rim look straight down 240 m over MAHWORLD (the underside disc stops at 126.8 m); iridescent fresnel dome glass (clear face-on, lavender / blue / rose at grazing angles); a fine merged lattice (24 meridians + 6 parallels + crown ring, one draw) replaces 16 heavy ribs + 4 rings; low / mid cloud bodies are capped below the deck so no cloud crosses the upper-realm floor |
| host contract | HALO_DECK_SINGLE_TOP, `full_area_opaque_owners: 1`, `transparent_full_area_overlays: 0` and the open side skirt are kept: the glass is a separate annulus owner, never an overlay |
| unresolved | the HALO still needs social / activity dressing beyond the court (only floor-level or rim-zone detail is host-safe); owner review of the glass sky-walk |

## PASS 5 — world map (checkpoint 2)

| field | value |
|---|---|
| files | `lab/worldMap.js` (new), `lab/gameMenu.js` (MAP tab routes through it when the world registry is present; the district-only drawing stays the fallback) |
| goal | the five class territories readable at a glance; territory ↔ sanctuary ↔ landmarks ↔ roads ↔ water ↔ HALO ↔ player relationships; phone-readable technical overlay |
| what changed | a cached territory field rasterised from the registry regions (soft union, nearest class wins, glowing class borders, faint hatching), water, the causeway / regional / trail hierarchy, MAHGIC patches, landmark glyphs in their territory colour, the HALO access ring with its height, the player heading arrow, a five-class legend; no `ctx.filter` (iPhone Safari) |
| evidence | `MAP_phone.png` / `MAP_desktop.png` rendered by the world preview from the live registry |

## CHECKPOINT 3 — HALO rim colonnade, celestial rings, azure sea (`e3e223f`)

| field | value |
|---|---|
| files | `lab/cityScene.js` (treeElevator), `lab/fieldScene.js` (ring spin in tick, cache reset on clear), `lab/world/coast.js` |
| goal | human-scale rhythm at the HALO rim; luminous rings in the dome (reference: elegant circular platform); a daylight sea that reads azure and not as a tiled grid |
| what changed | 40 slender platinum columns just beyond the playable radius (144.8 m → 146.2 m, under the shell) with inner white-light strips, capitals and a chrome cornice ring — 3 merged draws; three counter-rotating celestial rings (26 / 34 / 42 m, white light with a lavender core) 95 m above the deck, decorative only; DAY sea `#16406c` → `#1f5fb0`, roughness 0.34 → 0.2, env 0.38 → 0.85; the drifting normal map is sampled at 1× and 0.37× (offset) and blended — chained AFTER the ripple system's own shader patch and guarded on the three.js chunk text |
| before / after | `evidence/cp2_after/desktop_day` / `evidence/cp3_after/desktop_day` (V08 V09 V11 V12 V14, pinned at `e3e223f`); sheet `evidence/cp3_vs_cp2_day.jpg` |
| perf (same five views) | draw calls 922 → 928, triangles 3.92 M → 3.96 M (+1.0 %), programs unchanged (140) |
| tests | runnable programs unchanged (22 green, 418 checks) |
| edge case | if the ripple system re-installs its sea patch at runtime after this chain (toggle), the dual-scale normal drops back to the single map — visual only |
| unresolved | the rings sit above the V08 frame (visible from the deck looking up and through the dome from the ground); owner review of the colonnade density |

## PASS 2b — value, contrast and air (checkpoint 4)

Audit of the checkpoint 2 evidence: from altitude (V02, V12, V14) the world washed to white — the linear day fog ran 150 → 640 m, so the
far half of a 350 m field sat at 40–90 % haze over a pale stone ground; the HALO deck read near-white under the 3.0 key; cloud bodies
showed individual puff outlines (V09); ridge faces were large flat slabs; at night the pale peak caps glowed like lit paper.

| field | value |
|---|---|
| files | `lab/fieldScene.js` (day fog far, ground stone value), `deploy/jobb/build_registry.mjs` → registry (day fog near / colour), `lab/cityScene.js` (HALO deck value), `lab/world/cloudBodies.js`, `lab/world/macro.js` (rock shader, night dimming), `lab/farWorld.js` (night caps), `lab/world/coast.js` (sea relief distance fade) |
| what changed | day fog 150 → 640 m becomes 190 → 1050 m (colour `#b4cbe9`, a touch deeper): aerial perspective stays, geometry is no longer hidden; district / plaza stone one value step darker; HALO deck base `#c8ccd4…#a6adb9` → `#aab0ba…#858d9a` with stronger stone bands and class sectors; cloud puffs: the per-puff volume term fades out toward the puff edge (overlaps meet on the shared cloud shading), the silver lining only where the camera faces the light and only on the upper cloud, wider alpha feather; ridges: world-space value-noise grain + sedimentary strata on steep faces and a noisy snow/crystal cover on shallow faces above 60 % of the ridge height (neutral white; LOW tier keeps plain facets); night: ridge albedo ×0.58, far-massif caps and lit rock one step darker; sea: the ripple relief calms between 90 and 650 m so the far sea reads as reflected sky |
| rule kept | "do not hide bad world geometry behind fog": the fog now starts beyond the playable field's crisp zone and the geometry itself was improved |
| before / after | `evidence/cp2_after/desktop_day` → `evidence/cp4_after/desktop_day` (all 17 views, pinned at `aefbebb`); night `cp4_after/desktop_night`, phone `cp4_after/phone_med_day`; sheets `evidence/cp4_vs_cp2_day.jpg`, `cp4_vs_cp2_night.jpg` |
| perf (V01–V12 desktop, checkpoint 4 = PASS 2b + PASS 3 class houses together) | draw calls 2322 → 2353 (+31: the architecture stone bucket and the lower fog letting more far chunks through), triangles 13.98 M → 14.09 M (+0.8 %), programs max 140 → 144 (ridge rock shader, stone), textures max unchanged (81) |
| tests | runnable programs unchanged (22 green, 418 checks); colour law 0 |

## PASS 3 (continued) — class houses and plaza metals (checkpoint 4)

| field | value |
|---|---|
| files | `lab/world/architecture.js` (`premiumHouse`, `fascia`, satin platinum, graphite stone bucket), `lab/fieldScene.js` (plaza proxy metals by day) |
| goal | the procedural class houses read as designed buildings, not kit primitives (V16 / V17 BEFORE: three bare cylinders under a slab; a canopy on four posts) |
| what changed | VISIONARY overlook: support collars at 3.6 m, capitals flaring into the soffit, a halo ring tying the four supports at 14 m with a violet light line, graphite fascia + white light line around the platform, a square-diamond light inlay on the soffit, a suspended amethyst core with four satellite shards (lowest point 3.65 m above the terrace); LEAN spire house: platinum collars alternating with crimson light rings every 4 m, needle tips, struts from the 22 m platform to the lower spires, fascia; architecture platinum is satin anodised (`0xc4cbd5`, metalness 0.7) instead of a near-white mirror; plaza pillars / barriers / planters by day are satin platinum and brushed chrome (env 0.62–0.7) on graphite plinths |
| host safety | every free-standing piece is ≥ 3.4 m above its ground or inside an existing footprint; no collider changes — pinned by `16_TESTS/gameplay_world_pivot_host_safety.test.mjs` check 4 |
| before / after | `evidence/before/desktop_day/V16_DAY.jpg`, `V17_DAY.jpg` (pinned `b94e611`) → `evidence/cp4_after/desktop_day/` |

## CHECKPOINT 5 — ridge visible/collision parity restored (`32aac74`)

| field | value |
|---|---|
| defect found | checkpoint 2's rock displacement also moved the ridge INNER face rows into the mountain body. That face is the owner OP10 shared visible/collision surface (`VISIBLE_RIDGE_INNER_FACE` proxies from `ridgeLayout`), so from `a46bed0` to `aefbebb` the visible rock sat up to ~0.14 × ridge height behind its collision — invisible walls in front of the rock for a flying player. The existing ridge test reconstructs the triangles from `ridgeLayout`, not from the mesh, so it could not see it. Found while profiling the world colliders for PASS 6. |
| fix | inner rows are exact again (linear between the inner base and the crest); only the unreachable OUTER rows are displaced, into the body; the inner face keeps its rock read from the shader-only grain / strata / snow |
| guard | new `16_TESTS/gameplay_world_pivot_host_safety.test.mjs` (4 checks: ridge inner rows never displaced, HALO colonnade beyond the playable radius and inside the shell with the rings ≥ 60 m above the deck, low / mid cloud layers capped under the deck, class-house suspended pieces above head height). Verified to FAIL on `aefbebb` and PASS on `32aac74`. |
| tests | 23 runnable programs green, 422 checks (was 22 / 418) |
| assumption to verify with the host | the celestial rings (95 m above the deck) are above any player flight ceiling found in the data (7–13 m); `capabilities.getFlightCeiling` lives in the missing runtime modules |

## PASS 6 (grounding) + night far world — checkpoint 6 (`929770d`)

| field | value |
|---|---|
| files | `lab/world/contactAO.js` (new), `lab/world/worldB.js` (mount after architecture), `lab/farWorld.js` (both palettes baked, live swap), `lab/fieldScene.js` (setNight calls it), `16_TESTS/gameplay_world_pivot_host_safety.test.mjs` (check 5) |
| goal | objects sit IN the world (the key shadow reaches only 24 m on HIGH and is off on MED / LOW, so trees, landmarks and plaza pieces looked pasted onto a bright floor); no daylight far massifs glowing in a night sky |
| what changed | CONTACT AO: one InstancedMesh of flat decals whose falloff is a rounded-box signed distance computed in metres — every forest tree (broad soft canopy occlusion), the plaza civic shapes (tight contact bands), the landmark envelopes (inset, wide base darkening), class-house supports / spires / gate pillars and the match hall; 5.5 cm above the local ground, distance fade 110 → 300 m, night 70 %, no collider, 1 draw call. NIGHT: the in-game time toggle never rebuilds the field, so the unlit, fog-free far massifs / mid walkways / haze plain kept their build-time daylight colours — the cp2 / cp4 night evidence shows white caps glowing; farWorld now bakes BOTH palettes and swaps the colour attribute live (Node smoke: a day-built world toggled to night equals a night build exactly, and back) |
| before / after | `evidence/cp4_after/…` → `evidence/cp6_after/{desktop_day (V02 V03 V04 V05 V12 V13 V16 V17), desktop_night (V02 V12 V17), phone_med_day (V03 V13)}`, pinned at `929770d`; sheets `evidence/cp6_vs_cp4_day.jpg`, `cp6_vs_cp4_night.jpg`. The day frames also show checkpoint 5: the ridge inner faces are planar again (collision parity) and keep the shader rock grain |
| perf (same 8 day views) | draw calls 1483 → 1488 (the decals), triangles +0.02 %, programs unchanged (144) |
| tests | 23 runnable programs green, 423 checks; host safety 5 / 5; colour law 0 |
| unresolved | the plaza floor still reads near-white at street level (V13); other build-time day/night choices (floor canvases, HALO deck texture) also do not swap on a live toggle — they are lit, so they darken with the night rig, but a live-swap pass for them is a candidate follow-up; owner visual review |

## CHECKPOINT 7 — one light rig, honed ground (`3186200`)

| field | value |
|---|---|
| defect found | investigating why the plaza read near-white, the scene was found carrying TWO daylight rigs: a legacy inline rig written as `if (false) { NIGHT } else { DAY }` always ran its DAY branch right after `buildLights()` — key 2.35 + hemisphere 1.15 + rim + fill on top of the owner rig, and it re-pointed `sun` (the shadow caster) — until the first time-state prewarm / toggle rebuilt the lights. Present since the M6 backup; live in the game during load and whenever `?warm=0`. The preview harness always prewarms, so no evidence frame was affected. |
| fix | the dead block and its always-running `else` are removed; `buildLights()` alone owns background, fog, shadows and the rig. Guard: host-safety check 6 (every directional / hemisphere light is built inside `buildLights()`; it fails on the previous head with 8 outside) |
| ground | the day ground policy is honed stone (roughness 0.7, metalness 0.12, env 0.32; was 0.58 / 0.25 / 0.5) to trim grazing-angle sky glare. Measured V13 floor pixels are a mid-light grey-blue (~150 / 160 / 180): the plaza's "white" read is the high-key platinum palette around it, not a clipped floor |
| evidence | `evidence/cp7_after/desktop_day/` (V01 V02 V13, pinned at `3186200`) |
| perf (V01 V02 V13) | live shader programs 141–144 → **94** (−34 %): the stacked rig's larger light count compiled a second full set of shader variants at load, which the prewarm then orphaned; time-state prewarm 8.8 s → 4.3 s (software GL — relative only, not a device timing); draw calls / triangles unchanged. Fewer compiles means less load-time hitching, which matters most on phones (to be confirmed by the owner's device test) |
| tests | 23 runnable programs green, 424 checks; host safety 6 / 6 |

## M8 — MATERIAL REALISM / STRUCTURAL SURFACE PASS, first pass (`e7b12a9`; harness `cd381e1`)

Diagnosis (live material audit of the rendered world, `WP.scene` traversal): every hard surface was ONE flat value — no normal /
roughness / detail maps on civic platinum, HALO chrome (metalness 0.98), plaza proxies, poles and water edges (a near-white `#dfe6ee`
mirror at roughness 0.2–0.34 with full environment reflection), the plaza + district ground (a smooth canvas) and the causeway cores (a
sky mirror at grazing angles); white trims glowed at 0.9–0.95 emissive by day across 19+ merged meshes. Result: smooth white-plastic
shells, blown-out street level, no scale cues.

| field | value |
|---|---|
| files | `lab/world/surfaceDetail.js` (new), `lab/fieldScene.js`, `lab/cityScene.js`, `lab/world/worldB.js`, `lab/world/architecture.js`, `lab/world/terrain.js`, `deploy/world_preview/capture.mjs` (V18–V20, screenshot timeout), `16_TESTS/gameplay_world_material_realism.test.mjs` (new) |
| technique | a WORLD-SPACE procedural layer patched onto the existing MeshStandardMaterials (no textures; survives the static merge and instancing): HARDSCAPE (staggered slabs, recessed matte grout, per-slab tone / roughness, aggregate grain, wear breakup), PANELS (box-projected panel grid, inset seams with a chamfer normal, storey trim bands), BRUSHED (streak roughness), seamless poured option. Seams are fwidth-antialiased and fade with distance; the LOW tier keeps tone / roughness only. It scales value / roughness / metalness only — never hue (five-class colour law untouched; colour audit 0) |
| surfaces changed first | plaza floor (PLAZA 2.4 × 1.2 m running bond) · district ground (DISTRICT 3.2 × 1.6 m) · plaza pillars / barriers / ramps (STRUCTURE, BRUSHED) and graphite plinths (STONE) · civic facades incl. the Mentor Spire (FACADE 1.8 × 1.2 m panels + a band per 3.6 m storey) · civic chrome (BRUSHED, roughness 0.24 → 0.32 by day) / graphite / stone · HALO deck (DECK 3 m slabs, honed 0.36 → 0.5) · HALO trunk (TOWER 3.2 × 7.2 m panels, storey band) · shared world platinum (`#dfe6ee` → `#c2c9d2`, satin) / chrome (roughness 0.3) / graphite / black — poles, rails, water edges, match hall · class-house structure + stone · road kerbs (KERB 1 m) · causeway cores (PAVER 4 × 2 m, roughness 0.42 → 0.58, metalness 0.48 → 0.3) |
| daylight value | civic trims 0.95 → 0.45 emissive, plaza trims 0.9 → 0.4, warm trims 0.54 → 0.3 (light lines read by contrast, not a white glow) |
| before / after | pinned `2ef4c87` → pinned `e7b12a9` / `cd381e1` (identical world code): `evidence/m8_before/…` → `evidence/m8_after/{desktop_day (V01 V03 V04 V08 V09 V13 V15 V16 V18 V19 V20), desktop_night (V13 V18 V19), phone_med_day (V18 V19)}`; sheets `evidence/m8_close_day.jpg`, `m8_wide_day.jpg`, `m8_night.jpg`, `m8_phone_med.jpg` |
| perf (11 day views, same frames) | draw calls 2378 → 2378, triangles 14.36 M → 14.36 M, textures 77 → 77 (no texture memory), shader programs 95 → 111 (+16: the surface families); phone-sized MED: calls unchanged, programs 95 → 108. Frame cost is a handful of hash / value-noise lookups per lit fragment — to be confirmed on the owner's device |
| tests (focused) | material realism 5 / 5 (patch lands on every anchor of the vendored three.js standard shader, LOW tier drops chamfer / grain, chaining after existing patches, the application map, the daylight value policy + no hue change), host safety 6 / 6, colour law 4 / 4, Moon / cloud 19 / 19, ridge collision 8 / 8, night route 13 / 13 |
| unresolved / next | see "M8 next" below; owner visual review |

### M8 next — the most important open material issue after this pass

1. **Ridge mountains / cliffs at street level** — they fill 30–50 % of every street-level frame (V03 V04 V05 V16) and still read as large
   flat grey slab faces: the rock grain / strata shader is too subtle at that distance and the faces carry no macro structure (ledges,
   fracture lines, value zoning between lit rock and shadowed clefts). Must stay on the collision plane (owner OP10) — shader-side only.
2. Civic curtain-wall glass bands still read as uniform smoked strips (mullion rhythm, spandrel panels).
3. Crystal ecology / tree materials (GLB-textured) were not touched; water-facing edges took the shared platinum change only.

## M8B — SKY REALISM + SURFACE LANGUAGE + TRANSITIONS (`8aa33fe`)

Diagnosis (pinned `fc68cd3` frames): the day sky was one flat saturated "screen blue" from the zenith to ~10° above the horizon (the dome
blend only moved in the last few degrees), with no brighter Sun side or deeper opposite side; the Sun wore a doodled corona (a lobed
cloud-veil card + 18 hard cartoon rays); clouds were all mid-size puffs at two altitudes over the playable world — nothing gave scale at
the horizon; the day Moon was an opaque lilac sticker and the night Moon a flat disc in a flat navy-purple sky. The ground spoke one
paving language everywhere, and district / surface changes were hard stops (floor → shore, plaza → districts, landmark → ground).

| field | value |
|---|---|
| files | `lab/world/atmosphere.js`, `lab/world/sky.js`, `lab/world/cloudBodies.js`, `lab/world/celestial.js`, `lab/world/surfaceDetail.js` (zoned paving, GLAZING, SAND), `lab/fieldScene.js`, `lab/cityScene.js`, `lab/world/worldB.js` (shore transition), `lab/world/contactAO.js`, `deploy/jobb/build_registry.mjs` → registry (+ collider hash), `deploy/world_preview/capture.mjs` (V21–V25), `16_TESTS/gameplay_world_material_realism.test.mjs` (checks 6–7) |
| sky (changed first) | dome: long zenith → horizon falloff (deep blue high, milky over ~30°), Sun-side multiple-scattering brightening and a deeper opposite side, a wide haze skirt under the horizon line, a tight aureole, dither against banding; palettes: day zenith `#1a52bd` / horizon `#cfe1f6` / whiter Sun glow, night indigo zenith / purple-blue horizon / lavender lunar aureole (mie 0.22 → 0.55); a ring of 22 large, flatter HORIZON cloud banks at 820–1100 m behind the far massifs (lit bodies; the registry layer stays non-occluding and is excluded from the Sun / Moon optics — the two occluding layers and every pinned sky marker are unchanged); the Sun's lobed veil → a soft diffuse veil, rays 0.15 → 0.05; the day Moon is seen through the lit atmosphere (74 % opacity, paler albedo, softer limb) and the night Moon is opaque with a stronger limb glow (emissive 0.72 → 0.9); clouds get a stronger silver lining by day |
| floor language | one zoned paving shader for the plaza + district ground, family per registry zone: civic running bond · plaza hub RINGS (concentric courses, radial joints) · fine rings around the HALO trunk base · TITAN hexagons · ATHLETE diamonds · VISIONARY triangles · LEAN planks (+ the coast boardwalk) · MATCH squares · BAGE mosaic |
| transitions | 0.7 m THRESHOLD courses wherever two families meet (plaza rim, HALO base, every sanctuary edge); SOFT ECOLOGY PATCHES — seams fade and value drops under world noise in forest / garden zones (feathered 10 m) and ecology-leaning districts, so tiling gives way to weathered ground; the SHORE gradient becomes a material transition (glossy wet band / grained dry sand, derived from the gradient colour itself); contact bands under every street light and sanctuary monolith |
| structure | curtain-wall GLAZING: mullions every 1.5 m, transoms every 1.2 m, a dark spandrel per 3.6 m storey, per-pane reflection variation (value / roughness only) |
| before / after | pinned `fc68cd3` → pinned `8aa33fe`: `evidence/m8b_before/…` → `evidence/m8b_after/{desktop_day, desktop_night, phone_med_day}`; sheets `evidence/m8b_sky_day.jpg`, `m8b_sky_night.jpg`, `m8b_floors.jpg` |
| perf (12 matched day views) | draw calls 2690 → 2713 (≈ +2 per view: the horizon-bank layer), triangles 13.89 M → 14.01 M (+0.9 %: bank puffs), shader programs 111 → 113, textures 73 → 73; phone-sized MED V21 / V23: calls 149 / 175 → 151 / 177, programs 108 → 113 (desktop emulation, not a device test) |
| evidence notes | V24 / V25 were re-aimed onto open district paving and their BEFORE frames recaptured from the same pinned `fc68cd3`; V24 has a close rail in the foreground and V25 still frames much of a causeway (the ATHLETE diamonds show on its right) — kept as-is rather than re-aimed a third time; V15's BEFORE is `evidence/m8_after` (identical world code) |
| tests (focused) | material realism 7 / 7 (new 6: nine paving families in one shader, threshold courses, soft patches, LOW keeps pattern + tone, zones bound live from the registry; new 7: sky falloff + dither, lunar aureole, horizon banks outside the optics with two occluding layers kept, soft Sun veil), host safety 6 / 6, colour law 4 / 4 (one new night haze nudged from hue 245.6° into the purple window), Moon / cloud 19 / 19, ridge collision 8 / 8, night route 13 / 13 |
| host safety | presentation only: no collider or walkable change; the horizon banks sit far outside every host limit and below the HALO deck cap (max_top 236 m) |

### M8B next — the highest-value remaining realism issue

1. **Ridge mountains at street level** (carried from M8, still first): they fill 30–50 % of every street-level frame as large flat grey
   faces; macro structure (ledges, fracture lines, value zoning between lit rock and shadowed clefts) must come from the shader because
   the visible inner face IS the collision surface (owner OP10).
2. Crystal ecology / trees (GLB-textured) keep their original materials; ground-level meadow shards could use a contact tint.
3. The sky is still an analytic dome: a volumetric-looking cloud deck near the Sun (god-ray shafts through gaps) would be the next sky step.

## M8C — FULL MATERIAL REALIZATION / PHYSICAL WORLD PASS (`67bc9b0`)

M8B was accepted as a foundation checkpoint, not a visual approval. Diagnosis (pinned `7eb0f5e` frames): the ridge mountains filled 30–50 %
of every street-level frame as large flat grey facets with only a faint grain — no strata, fractures, ledges or shadowed recesses; the far
massifs and coast islands were single-value silhouettes; floors were tiled everywhere, including under the forests; the canals ended as a
flat blue sheet at a hard line; civic buildings read as smooth shells, and their facade fins continued into the rounded corners, floating
up to 0.7 m off the curved wall (a real construction defect).

| field | value |
|---|---|
| new views | V26 canal bank and water edge close · V27 ridge face close from the TITAN ledge · V28 civic roofline, piers and service bay (Mentor Spire rear) |
| files | `lab/world/surfaceDetail.js` (`applyGeology`, `applyCrystal`, natural ground in `zonedPaving`), `lab/world/macro.js`, `lab/farWorld.js`, `lab/world/coast.js`, `lab/world/water.js`, `lab/cityScene.js`, `lab/world/architecture.js`, `deploy/world_preview/capture.mjs` (V26–V28), `16_TESTS/gameplay_world_material_realism.test.mjs` (check 8), `16_TESTS/gameplay_world_pivot_host_safety.test.mjs` (check 7) |
| geology (changed first) | ONE reusable GEOLOGY pipeline, shader only (the ridge inner face is the owner OP10 collision plane, so no geometry moved): MAJOR BEDS (≈ 8 m on the ridges) give value zoning, and a share of their boundaries become LEDGES — a lit rounded lip above, a shadowed undercut below; MINOR BEDS draw the bedding lines; JOINTS stop at the bedding planes and step bed to bed (blocky jointing); sparse long near-vertical MASTER FRACTURES; CLEFTS (30–60 m gullies) as shadowed recesses; macro + grain; snow above the snow line. Only smooth fields (ledges, clefts, grain) drive the derivative-bump normal; thin lines are value / roughness with footprint AA (a line thinner than a pixel fades instead of aliasing). Applied to the ridges (lit + bump), the far massifs (unlit value, 35 m beds) and the coast islands. Iterated three times against the frames: v1 read as a crazed-glaze web with speckled strata → footprint AA; v2 replaced the isotropic Voronoi web with beds / joints / master fractures; v2b removed dotted sparkle where the ledge height stepped |
| material families | see the family table below; new: GEOLOGY (rock) and CRYSTAL (roof diamonds + class crystals: per-facet value from the facet's orientation, face-on depth, bright grazing rim, sparse inclusion planes; the class hue stays the vertex colour) |
| natural ground | inside the soft ecology zones (forests, gardens) the paving dissolves slab by slab into grown ground — no seams, darker matte value, grit, a low-amplitude bump, near-zero metalness, a darker gap where a slab is missing; the dissolution follows world noise at the zone edge. Plain hardscape never loses slabs (an iteration-2 defect where the noise reached every district was caught in V02 and gated) |
| water / land | shallow-water cue on the canals and ponds: from the waterline the water is lighter, more transparent (α × 0.42) and less mirror-like (metalness × 0.4), deepening to full colour ~6.5 m out, so the submerged bank shows. Applied to the far surface AND the ripple near window (the near window is a clone taken before the patch — iteration 3 showed no change until it was patched too). Subtle at eye level, as it physically should be |
| construction | fins stand on the straight wall runs only; graphite structural PIERS close every run (ground tier: standing on the first-floor cornice at 3.6 m — base / shaft / crown; upper tiers: on the tier ledge); a deep EAVE FASCIA under each tier's light reveal (the roofline has thickness); a louvred SERVICE BAY on the top storey's rear face (away from the entrance); a glazed TRANSOM with mullions over the entrance canopy and two TENSION RODS carrying the canopy back to the wall. Merged per material (+2 draws per building) |
| human livability | ridge corridors: shading only — the walkable floor and collision are unchanged, and the ledges are painted relief (< 1 m), not false climbable shelves. Civic buildings: nothing new below 3.4 m, so the pedestrian zone is unchanged; the entrance reads as a sheltered, daylit threshold (canopy visibly supported, transom light); plant air exhausts on the rear face, not over the door. Forests: natural ground under the trees while the paths / causeways stay constructed. Canal banks: the bank stays walkable hardscape; no railings added (host-owned). No benches, props or NPC clutter added |
| before / after | pinned `7eb0f5e` → pinned `67bc9b0`: `evidence/m8c_before/…` → `evidence/m8c_after/{desktop_day, desktop_night}`; sheets `evidence/m8c_rock.jpg` (V27 V16 V05 V07), `m8c_world.jpg` (V02 V03 V04 V06 V11 V26), `m8c_construction.jpg` (V15 V18 V28), `m8c_night.jpg` (V05 V16 V26); V28's BEFORE is rendered from the same pinned `7eb0f5e` tree with the V28 view added to its harness only |
| perf | 12 matched day views: draw calls 1964 → 1990 — of the +26, +21 is V26, where the crystal meadow's camera-ticked chunk visibility happened to show 21 blade chunks in the AFTER run (harness timing; no M8C change touches the meadow); without V26 1855 → 1860, i.e. the +2 merged draws per civic building where one is in frame. Triangles 12.48 M → 12.62 M (+1.1 %, mostly those V26 blades; the construction pieces are a few hundred triangles per building). Shader programs 115 → 117 (the geology and crystal variants), textures 83 → 84; NO texture maps added (all detail is procedural, world space). Night (3 views): calls 365 → 365, programs 114 → 119. Shader cost: the geology adds one 3 × 3 Voronoi (9 cells) plus a few value noises per rock pixel, on the ridges / far massifs / islands only; LOW keeps beds, ledges and tone and drops joints / fractures / clefts / grain / bump. Software WebGL: counters are relative evidence, not phone performance |
| tests (focused) | material realism 8 / 8 (new 8: geology on ridges / far / islands with beds, ledges, joints, master fractures, clefts, footprint AA and only smooth fields in the bump; crystal family; natural ground gated to soft zones; the shallow-water cue), host safety 7 / 7 (new 7: every construction piece ≥ 3.4 m, checked against the authored buildings; fins on the straight runs), colour law 4 / 4, Moon / cloud 19 / 19, ridge collision 8 / 8, night route 13 / 13; colour-law audit 0 violations; colliders `--check` nothing to do; full runnable set 24 files green (433 checks); `gameplay_mahgic_tree` keeps its one pre-existing failure (the static build it checks is blocked on the bridge upload) and 36 programs stay blocked on the missing sibling roots |
| host safety | presentation only: no collider, walkable or registry change; construction pieces ≥ 3.4 m or on the wall face; ridge art stays shader-only on the collision plane |
| Scenario | re-checked (free calls only, nothing generated, 0 CU): PATINA Material / Image-to-Maps / retexture need Pro; Scenario Texture runs on the free plan (33 CU per 1024² high with seam erase, 12 CU at medium, colour only); scenario-3d meshes are not the right tool for this pass. Grouped request + integration plan: `SCENARIO_GATE.md` — waiting on the owner |
| evidence notes | the crystal meadow's chunk visibility is ticked from the camera, so blade counts differ between runs whose view ORDER differs (iteration frames show more gold / red blades); the pinned BEFORE / AFTER runs use the same order. The blue slab across the top of V27 is the HALO underside seen from the ledge — present before and after |

### M8C material families (value / roughness / metalness only — hue stays owned by the colour law)

| family | where | base roughness · metalness | detail / normal | seams / edges | wet / dry, contact |
|---|---|---|---|---|---|
| rock (GEOLOGY) | ridges, far massifs, coast islands | 0.82 · 0.08 (ridges), per-bed ± 10 %, joints / fractures + 12 %, lips − 8 %, clamped 0.3–1.0 | beds, ledges, joints, master fractures, clefts, grain; bump from ledges / clefts / grain | ledge lip (lit) / undercut (shadow) | dry; snow 0.55 above the snow line |
| architectural platinum (FACADE / STRUCTURE) | civic facades, class-house structure, world platinum | 0.42 · 0.62 | panel grid, storey band, macro + grain | inset seams (matte, metalness × 0.5), chamfer normal | contact AO at the footprint |
| brushed chrome (BRUSHED) | fins, rails, trims, domes | 0.32 · 0.92 by day | directional streak roughness | — | — |
| structural dark metal (STRUCTURE on graphite) | piers, insets, louvre frames | 0.5 · 0.75 | 1.2 × 2.4 m plates | inset seams | — |
| glass (GLAZING) | curtain walls, bands, transoms | 0.06 · 0.55, α 0.78 | per-pane reflection variation | mullions 1.5 m, transoms 1.2 m, spandrel per storey | — |
| stone / hardscape (PLAZA / DISTRICT / zoned) | plaza + districts | floor 0.5 · 0.88 by day | nine paving families, grain, macro | recessed grout, bevel, 0.7 m threshold courses | contact AO under fixtures, monoliths, civic shapes |
| road (PAVER / KERB) | causeways, regional roads, trails | cores 0.58 · 0.3, kerbs 0.52 · 0.78 | 4 × 2 m staggered pavers, grain | segmented kerb stones | — |
| natural ground (zoned NATURAL) | soft ecology zones | roughness × 1.35, metalness → 0.02 | grit, low bump | slabs dissolve, darker gaps | matte, dry |
| shoreline / wet (SAND + shore gradient) | beaches, canal banks | dry 0.88 · 0.12 → wet band 0.16 · 0.32 | drift grain | the gradient itself is the transition | glossy wet band at the waterline |
| water-adjacent (shallow cue) | canal / pond surfaces | 0.55 metalness → × 0.4 at the bank, α × 0.42 | ripple normals (unchanged) | foam line (unchanged) | lighter, clearer shallows |
| MAHWORLD crystal (CRYSTAL) | roof / entrance diamonds, class crystals | roughness × 0.55–1.45, clamped 0.03–0.45 | per-facet value ± 17 %, inclusion planes | grazing rim + 40 %, face-on depth − 30 % | — |

### M8C next — open issues (nothing here is approved)

1. **Clouds (active, carried):** still reads as cotton / blob puffs; needs scale, depth, density variation inside the body, better
   integration with the horizon banks and illumination (a darker, denser base; brighter, thinner rims). The sky remains open in every view.
2. **Ridge faceting:** the flat-shaded ridge facets are geometry, and they are still the dominant low-poly read at street level; the shader
   now carries the rock, but a smoothed-normal field (or a finer OUTER-row mesh, never the inner collision rows) is the next step.
3. **Scenario detail maps:** owner decision on the grouped request (6 × 33 CU) or a Pro upgrade for PATINA — would add photographic micro
   detail at 0–15 m, where procedural grain is weakest.
4. Construction language beyond the three civic buildings: class-house platforms (thickness, soffits), HALO supports, bridges, the imported
   landmark facades (texture-level, Scenario-dependent).
5. Coast islands meet the sea without a wet band or shore shaping; the canal banks carry the transition, the islands do not yet.

## M8D — CLOUD REALISM + SCENARIO PILOT (owner option E, 2026-09-26)

### Scenario pilot (isolated, not canonical) — full report `SCENARIO_PILOT.md`

Owner approved two high-quality textures (rock, platinum), ≤ 66 CU. Rock ran (33 CU, one job, no re-roll); platinum was refused before any job
existed by the free plan's 50 CU custom-generation allowance (`429 PlanLimitReachedError`, 0 CU). The rock map is seamless and neutral and
converts cleanly to a luminance detail map; three integrations were compared in a scratch worktree only (patches + matched renders under
`evidence/scenario_pilot/`). Verdict: as 36 m meso detail (variant C) it materially improves the ridge rock at 30–300 m; as close micro
detail it does not (A aliases into speckle, B is invisible). Cost: +1 texture (5.6 MB at 1024), +1 fetch per ridge fragment, no draw calls.
Nothing from the pilot is in the runtime; adoption and any further credits wait on the owner.

### Clouds

Diagnosis (pinned `bf80c74` frames): every cloud was a cluster of near-identical round, crisp-edged lobes 70–210 m wide, just above the
rooftops — cotton balls; shading was mostly by height (no sunlit side against a shadowed side, no self-shadowing); near and far clouds had the
same contrast; the horizon was empty (V11) because the M8B horizon banks were painted in the horizon's own haze colours.

| field | value |
|---|---|
| files | `lab/world/cloudBodies.js` (atlas, shader, `towerCluster`), `lab/world/sky.js` (tiered taps, Sun / Moon avoidance, camera-relative ring, draw order, per-layer looks), `deploy/jobb/build_registry.mjs` → registry (+ collider hash only), `16_TESTS/gameplay_world_material_realism.test.mjs` (check 9), `16_TESTS/gameplay_world_pivot_host_safety.test.mjs` (check 8), `16_TESTS/gameplay_world_jobb.test.mjs` (check 26 fixed, see below) |
| silhouettes | one shared procedural ATLAS (2 × 2) of noise-eroded shapes — cauliflower cumulus · soft billow · flat base · wisp: a smooth gaussian sum of lobes (they merge into one mass instead of reading as separate balls), domain-warped, fBm-eroded, billow noise raising cauliflower bumps on the upper rim; alpha = coverage with a soft rim, red = thickness with internal relief. Built once and reference-counted across layers |
| light | the whole BODY is lit from the key's side (Sun by day, Moon by night); each puff self-shadows by marching its thickness toward the light (2 taps HIGH · 1 MED · 0 LOW); flat, darker bases; a silver lining on thin edges that strengthens toward the light; seen from below, every puff shares one underside tone (lighter where thin) — iterations 2–4 showed stacked puffs outlining each other as plates when looked up at |
| depth | aerial perspective by distance (per layer) and a horizon fade by view elevation, so distant bases dissolve into the horizon haze; far layers draw before near ones (towers → banks / high veil → near bodies) so a far body never paints over a nearer one |
| scale | skewed size distributions (STRATUS pow 1.4, CUMULUS pow 1.8: many small, a few large) + a new camera-relative ring of TOWERING cumulus (`CUMULUS_TOWERS`: 12 congestus 280–540 m wide, 170–400 m tall, based at 262 m, 1060–1200 m out) rising behind the far massifs; the M8B horizon banks were painted in the horizon's own haze and are now tuned visible |
| Moon / Sun | the towers keep 26° clear of the Sun and Moon azimuths — the large lavender Moon stays unobstructed; towers and banks are outside the celestial optics (the Sun / Moon transmission is unchanged: two occluding layers kept); nearer bodies still veil the Moon as they drift, as before |
| host safety | presentation only; the towers are based above the HALO deck height and, from any camera position inside the field walls (+120 m), their nearest possible body stays ≥ 345 m from the HALO centre, whose shell radius is 148 m (host safety check 8) |
| latent test fix | `gameplay_world_jobb` check 26 asserted exactly 4 sky layers; M8B's horizon bank had already made it 5 — invisible because that program is blocked on the missing runtime roots. It now counts the four base sheets (bank layers are extra scenery) |
| before / after | pinned `bf80c74` → pinned `fd9cc4d`: `evidence/m8d_before/…` → `evidence/m8d_after/{desktop_day, desktop_night, phone_med_day}`; sheets `evidence/m8d_clouds_day.jpg`, `m8d_clouds_halo.jpg`, `m8d_clouds_night.jpg`, `m8d_clouds_phone.jpg` |
| perf | 8 matched day views: draw calls 1884 → 1892 (+1 per view: the tower ring), triangles 10.809 M → 10.812 M (≈ +340 per view: the visible tower puffs), shader programs 115 → 115, textures 70 → 68 (one shared atlas replaces three per-layer puff canvases). Per cloud fragment: 3 texture reads on HIGH (was 1), 2 on MED, 1 on LOW, plus a few dozen ALU; puff counts stay tiered (HIGH 1 · MED 0.7 · LOW 0.45; tower count × 0.75 MED, × 0.5 LOW). Cloud overdraw is the phone risk to watch — software WebGL here, so these are relative counters, not phone performance |
| tests (focused) | material realism 9 / 9, host safety 8 / 8, colour law 4 / 4, Moon / cloud 19 / 19, ridge collision 8 / 8, night route 13 / 13; colour-law audit 0 violations; colliders `--check` nothing to do; full runnable set 24 files green (435 checks), `gameplay_mahgic_tree` keeps its one pre-existing failure (the static build), 36 programs blocked on the missing sibling roots |
| side effect | the per-puff shape pick draws from the shared sky random stream, so the clouds sit in different places than before (a new composition, not a fixed one); the Sun / Moon transmission is analytic and unaffected |
| residual | looked at from directly below at steep angles (V09 under the HALO) some stacked-plate layering remains in the flat stratus; cloud bodies are still billboard impostors, not volumetric |


### M8D next — open issues (nothing here is approved)

1. **Owner review** of the Scenario pilot (`SCENARIO_PILOT.md`: adopt the rock as meso detail — variant C plus a two-axis blend, 512 on MED,
   off on LOW — or not; how to obtain the platinum texture) and of the clouds. No credits until then.
2. **Ridge facet read**: the flat-shaded ridge facets are geometry and remain the dominant low-poly read at street level; next is a
   smoothed-normal field on the OUTER rows only (the inner rows are the collision plane).
3. **Clouds, residual**: flat stratus seen straight up (V09) still layers a little; the bodies are billboard impostors — the next step would
   be a few larger hero puffs per body or a raymarched deck on HIGH only.
4. Construction language beyond the three civic buildings (class-house platforms, HALO supports, bridges); coast islands still meet the sea
   without a wet band.

## M8E — ARCHITECTURAL REALISM / LIVED-IN BUILDINGS (`080a8b0` · `621f972` · `6330726` · `ac3b8a2` · `585f1ad`)

Owner brief 2026-09-26: every major building must read CONSTRUCTED, OCCUPIED and FUNCTIONAL — upgrade, don't rebuild; class colours only in
restrained expressive light; neutral white for practical light; no neon coat; performance through instancing and shared shaders.

Audit (pinned `ec649b6`, V13 V15 V28 V29 V30 day + night): the three plaza buildings were smooth rounded shells — a continuous glass band per
tier, a light ring at every tier base, identical chrome fins, dark inset strips, portholes, a flat grey door slab (a sculpture pretending to be a
building), and at night every window band equally dark.

| field | value |
|---|---|
| files | new `lab/world/facadeKit.js`; `lab/cityScene.js` (kit per civic building, wall families, HALO rim show material, the old glass bands / rings / fins / portholes / cornice rings removed); `lab/fieldScene.js` (city `setNight` / `tick` live); `lab/world/architecture.js` (spire house, sanctuary show beat); `lab/world/surfaceDetail.js` (FACADE_PLAIN / COMPOSITE / CLADDING); `deploy/world_preview/capture.mjs` (V29, V30, `--show`); tests `gameplay_world_pivot_host_safety` (check 7), `gameplay_world_material_realism` (check 10) |
| window system | real openings PER FLOOR (floor-to-floor from the tier height, ≈ 3.6 m) in BAYS of varied width between piers of varied width; kinds: civic glazing with mullions + transoms, utility windows, double-height vertical slot pairs (tower crown), clerestories (hall), storefronts (exchange ground floor), corner glazing wrapping the rounded tower corners, opaque service bays (louvre grilles, flush service doors with a light). Frames recessed / projecting, sills, heads, jambs |
| glass | one instanced pane shader: coated-glass Fresnel (F0 0.16) sky reflection with per-pane tilt and tone, roughness 0.04–0.16 per pane; INTERIOR MAPPING: a ray into a box room (back wall + furniture line, side walls, floor, ceiling with a light fitting), blinds at seeded heights, a reveal shadow. Night: a seeded share of rooms lit (tower 62 %, exchange 52 %, hall 40 %), each at its own brightness and white temperature; lobbies lit day and night |
| construction | bay piers, slab edges interrupted at every pier, a stone-clad base, platinum body, composite crown (towers) / composite + platinum (hall) / composite (exchange); a cantilevered balcony (slab, glass balustrade, rail, posts, brackets, door, downlight) on the tower; storefront entrances (lit lobby, transom, centre stile, push bars, portal jambs + head, flush threshold, neutral downlight) replace the door slab |
| roofline | per straight run: a parapet with a metal coping and heavier end caps (stopped short of the rounded corners); on the service side a roof-access stair housing (door + practical light) and a guard rail over the parapet; the M8C roof plant (condensers, tank, mast, solar) stays |
| light | thin integrated strips (pier-face verticals on the crown, the eave / setback line, slab-edge downlight, doorway and service lights) — neutral white practical light. THE SHOW: one clock (`showLevel` / `showPhase`) for the whole world — at night, 24 s every 150 s, the plaza facades run the five classes IN TURN (gold · blue · red · purple · pink, 4.8 s each, dimming between steps so hues never mix) under a travelling wave: all facades show the same class at once, never a rainbow on one building; the sanctuary energy seams pulse in their OWN colour on the same beat; the HALO rim lights join the plaza sequence with the wave running round the rim. Outside the show everything is calm. `?show=1` forces it (evidence) |
| class identity | the civic buildings stay the shared civilization (platinum, graphite, glass); class colour lives in the sanctuaries' own seams / crystal and in the show only. The show runs on the registry `.color` values (the pale `.glow` values tone-map to white on a thin strip) — both are asserted equal to the registry by material-realism check 10 |
| propagation | Training Hall (hall profile: clerestories, solid lower walls, utility windows), Mahgic Exchange (storefront ground floor), Arena dome (a ring of 16 framed clerestory windows replaces the glass band; storefront entrance), Mentor Spire (reference: tower profile, corner glazing, balcony, vertical slots); LEAN spire house: framed slot windows on the prism faces (a pair per level turning with height, some lit at night) and a flush door + practical light on the approach face. The walkable class-house platforms (LEAN 22 m, VISIONARY, TITAN ledge) deliberately get NO railings: a railing without a collider would break visual / collision parity for flying players |
| host safety | the kit mounts on the VISIBLE wall (the rounded tiers are extruded with an 8 cm bevel); `audit()` proves from the placed instances that nothing below 3.4 m stands more than 5 cm beyond it (1 042 civic pieces, 95 spire-house pieces, measured from the house's own terrace floor); host-safety check 7 builds exactly what the city and the architecture build and runs the audit |
| fixes on the way | the `--show` frame showed white strips (the pale glow hues tone-mapped to white) → the show runs on `.color`; lit windows showed per-pixel static (a sine hash amplified varying-interpolation error) → integer pane seed; the HALO rim caps bleached to white in the show → emission capped and the lit base tinted (`ac3b8a2`); every show capture landed in the gold step because software WebGL advances the preview clock ≤ 0.1 s per frame → `WP.clock` / `capture --clock` pin it (harness only); the kit meshes were drawn off-screen → frustum-culled (`585f1ad`) |
| Scenario | NOT used. The 12 CU medium platinum texture would not materially improve this system: the three wall families already carry per-panel tone, roughness, macro, grain, seams and bevels; a 1024 px panel map is micro detail (2–3 mm/px on a 2 m panel) that mips away at the 5–40 m the facades are seen from — the rock pilot showed micro detail (variants A / B) gives no material gain. The gain here came from geometry and light. 0 CU spent; 17 CU of the free allowance remain |
| before / after | pinned `ec649b6` → pinned `621f972` (the before tree carries only the harness change that adds V29 / V30): `evidence/m8e_before/…` → `evidence/m8e_after/…`; sheets `evidence/m8e_facades_day.jpg`, `m8e_facades_night.jpg`, `m8e_plaza_day.jpg`, `m8e_houses_halo.jpg`, `m8e_phone_med.jpg`, `m8e_show_night.jpg` (after only: the show did not exist before); the five show steps with a pinned clock (`--clock`, `6330726` world): `m8e_show_steps.jpg` / `m8e_after/show_steps/`; the HALO rim caps in the show after the hue fix (`ac3b8a2`, 1920 × 1080, gold then red): `m8e_halo_rim_show.jpg` |
| perf | 8 matched day views: draw calls 2040 → 1975 (−65: the kit's 4 instanced draws replace the per-building bands, rings, fins and portholes), triangles 11.392 M → 11.154 M; 4 matched night views: 899 → 880 calls, 5.227 M → 5.118 M triangles; LEAN house views: +7 calls per view at `621f972` (house kit 3 + the civic kit drawn off-screen) → +3 after `585f1ad` (the kit meshes are now frustum-culled); shader programs +9 to +15 per view (pane, strip, frame, show light and the three new wall-family variants), textures unchanged. The whole civic facade system is 4 draws / ≈ 11.3 k triangles for 132 windows, 8 corner panes, 861 frame bars and 49 light strips; the spire house adds 3 draws. Per pane fragment: one box-room ray (no texture reads). Phone-sized MED frames (desktop emulation): 358 → 355 calls. Software WebGL — relative counters, not phone performance |
| tests (focused) | material realism 10 / 10, host safety 8 / 8, colour law 4 / 4; colliders `--check` nothing to do; full suite (run at `080a8b0`) 61 files / 436 checks passing, the same 37 files failing as before this pass; focused suites re-run green at every later commit (all blocked on the missing sibling runtime roots, plus `gameplay_mahgic_tree`'s pre-existing static-build check) |
| residual | windows are instanced quads with shader interiors (no parallax occlusion by frames at grazing angles); the kit's strips are ~1–2 px at plaza distance by design (restraint), so the show reads best from inside the plaza; the landmark GLBs (temple, tower, market) are untouched — they take part only through their seams; the LEAN spire's slots are small at the V16 distance |

### M8E next — open issues (nothing here is approved)

1. **Owner review** of the lived-in facades (day, night occupancy, the show cadence — 24 s every 150 s — and its brightness).
2. Human-scale ground details on the landmark GLBs (steps, doors) need owner direction: their meshes are shipped derivatives.
3. Carried over from M8D: the Scenario pilot decision (rock as meso detail), ridge facet smoothing on the outer rows, stratus layering seen
   straight up, coast islands without a wet band.

## M9 — CONTINUOUS WORLD REFINEMENT, round 1 (`e1b413c` … `20ab52c`)

Owner directive 2026-09-26 ("refine the entire existing world"): raise the weakest visual, structural, material and environmental areas
continuously, preserving every accepted system; no random features; no prop spam; owner-test candidate when substantial.

**Audit** (pinned `126f3fe`, all 30 fixed views by day, 14 by night, 6 phone-sized): ranked by screen share and severity —
(1) mountains everywhere read as low-poly grey facets and the far ring as translucent glass pyramids; (2) clouds stacked into towers of
grey pancakes seen from below; (3) crystal blades scattered like confetti over paved squares; (4) the mainland coast read as a dark moat
from above; (5) plain structures — white pipe bridges, plain obelisks, the flat black MAH MATCH box, grey terrace risers; (6) the tree
elevator meeting the plaza as a plain cylinder; (7) the HALO deck an empty plate. Raycast forensics resolved three apparent bugs as
viewpoint drift: V01 now sits on the arena roof, V22 inside the exchange, V27 0.7 m from a crystal monolith (corrected companions added).

| field | value |
|---|---|
| mountains (`e1b413c`) | geology MACRO RELIEF (fall-line gullies and buttress ribs 10–40 m, ridged, in POLAR coordinates so it is continuous across faces; the ±π wrap sits due south over the open sea) on the ridges; less sky ambient. An A/B showed smoothed normals wash the rock out pale, so the faces stay flat-shaded and the relief breaks up the facet planes. Far massifs: denser cones (22 × 11; LOW 12 × 6) with ridged noise and arêtes, a firmer lit / shadow split, a cool blue-grey aerial-perspective palette clearly darker than the horizon sky, calmer strata. Shading only on the ridges: the inner face stays the OP10 collision plane (ridge collision 8 / 8) |
| clouds (`19d6d20`) | diagnosis by isolation render: a body is a row of flattened base puffs; seen end-on from 15–60° below it projected into a tower of ellipses, and every puff drew its own rim / lining / self-shadow. Now ONE horizontal soft BASE PLATE per body (yaw-aligned, the body's footprint) fades in as the body goes overhead while the base puffs fade out — one flat, darker underside; SHELL shading — core puffs merge softly, only silhouette puffs keep the crisp cauliflower edge, self-shadow and silver lining. +1 instance per body, no draws, no texture reads |
| ecology (`1020d1f`) | crystal meadow blades grow only on NATURAL ground (inside the forest / garden zones, noise-feathered edge), ×1.5 density there; none on paving |
| tree elevator (`15d329e`) | twelve structural RIBS up the trunk into the twelve boughs, tapered branching ROOT inlays flush in the fine-ring paving, flush UPLIGHTS and a night light-wash on the lower trunk (live day / night). Host-safe: ribs ≤ 5 cm beyond the r 6.2 m collider below 3.4 m, roots 12 mm inlays, the dock side clear |
| mid layer (`15d329e`) | the 230–330 m walkway arcs become bridges (deck, girder, parapets, piers with caps, a neutral deck-edge light line at night); the obelisks become three stepped tiers with setbacks, glazing bands lit at night, cap rings |
| HALO (`f93f3a7`) | deck zones drawn flush into its plan texture (nothing may stand on the walkable deck without a collider): a PROMENADE of darker honed slabs with curbs inside the glass sky-walk, five class GARDEN TERRACES (arc beds between the 72 m and 96 m rings, stepping paths, class-colour crystal glints that glow faintly at night, platinum curbs). Read from above / in flight (V35); flush art compresses at eye level (V31) |
| coast (`38df9e5`) | FIX (pre-existing): the shared shore gradient ran upside down (CanvasTexture flipY — uv v = 0, the dry end, sampled the deep tone), so the beach read as a dark moat from above and the canal banks were inverted too. Profile remap (wide pale dry sand, damp, a narrow wet band). Islands: 9-ring plateau with a sandy shelf into a rocky crown, headlands / coves and a cliff side, macro relief; the octahedron "trees" become rounded crowns tinted in the island's class family |
| night + MAH MATCH (`3dfd161`) | street-light pools 9 m, night alpha 0.7 (registry → colliders hash only, `--check` clean); MAH MATCH's black body takes a MONOLITH cladding family (large panels on the light-line rhythm), owner brief kept |
| HALO nodes (`d4a72b6`, after the pinned set) | a cast joint at every dome-lattice crossing and on its crown ring (156, one instanced draw): structure by day, a quiet node light at night, the class sequence in the show; on the shell, outside the playable volume |
| terrain (`7d6cd8d`) | crown-terrace slabs take CLADDING (stone courses on the risers); monoliths take the shared cut-crystal treatment |
| harness | `--qs` dev switches (A/B), `--clock` (M8E), new fixed views V31 HALO arrival · V32 / V33 corrected plaza views · V34 MAH MATCH · V35 HALO from high in the dome |
| before / after | pinned `126f3fe` → pinned `7d6cd8d`: `evidence/m9_before/…` → `evidence/m9_after/…`; sheets `evidence/m9_*.jpg` |
| perf | 35 matched day views (pinned `126f3fe` → `7d6cd8d`): draw calls 6909 → 6795 (−1.7 %: the meadow builds fewer chunks), triangles 39.98 M → 43.16 M (+8 %: almost all the denser far massifs, ≈ 97 k per view), shader programs 129 → 132, textures 89 → 91; 19 night views: calls −0.9 %, triangles +7.6 %; phone-sized MED frames: calls −0.2 %, triangles +9 % — after the evidence MED builds the massifs at 16 × 8 (`20ab52c`, about half of HIGH). New per-fragment cost: the ridge / island relief (2 fBm evaluations), the cloud shell term (a few ALU); the HALO zones are texture-only. Software WebGL: relative counters, not phone performance |
| tests | material realism 10 / 10, host safety 8 / 8, colour law 4 / 4, Moon / cloud 19 / 19, ridge collision 8 / 8 at every commit; colliders `--check` clean after the registry change; full suite 61 files / 436 checks passing, the same 37 files failing as before this round (all blocked on the missing sibling runtime roots, plus `gameplay_mahgic_tree`'s pre-existing static-build check). One commit (`15d329e`) went out with check 10's live-hook regex failing (it matched the old one-statement city setNight exactly); fixed in `e34deac` |
| not done — blocked | **creatures** (fish / horse / Phoenix) are host-driven (`p.wildlife`, play/world/WildlifeManager.js): the host-free preview cannot show or judge them — waits on the runtime bridge. **HALO activity zones / seating / pavilions** and any standing prop on walkable ground need NEW COLLIDERS, which the host-safe rule forbids while the runtime is blocked (anything visual without a collider would be walked or flown through). **Gameplay presentation** (movement, camera, landing, flight, elevator ride, combat feedback) needs the running game — blocked on the bridge |
| residual | ridge / massif silhouettes are still the authored low-poly geometry (the relief is shading); cloud bodies are billboard impostors (the pancake read is gone, the per-puff read at close range remains); the HALO at eye level is still a very large flat deck; the Moon is the owner's stylised lavender body (unchanged); MAH MATCH stays deliberately black |

### M9 next — open issues (nothing here is approved)

1. **Owner review** of round 1 (sheets above); the tree grounding and the HALO zones are the most subjective.
2. Blocked on the runtime bridge: creature presentation, HALO activity zones / seating (need colliders), gameplay presentation.
3. Next refinement candidates: ridge / massif silhouettes (geometry is still the authored low-poly ring), cloud bodies at close range,
   HALO eye-level composition, the plaza ramp / furniture material pass, night value hierarchy (the moonlit ground is still bright).

## M10 — WORLD COHESION + RUNTIME BRIDGE CLOSURE (`c15f1c4` … `d6e1e7d`)

Owner directive 2026-09-26 ("M10 WORLD COHESION + RUNTIME BRIDGE CLOSURE"):
- Close the runtime bridge with ONE minimal, classified copy.
- Keep refining the unblocked visuals: mountain silhouettes, close-range clouds, HALO eye level, public space, night, shoreline and
  transitions.
- Keep collision authority intact; add no walk-through solids.
- Performance: AAA perceived quality at a sane cost, with HIGH / MED / LOW tracked.

### Runtime bridge (`c15f1c4`)

| field | value |
|---|---|
| manifest | `RUNTIME_BRIDGE_MANIFEST.md`. The static build traces 56 host files (`build_static_demo.mjs` HOST_MODULES / HOST_JSON); 46 are already on the branch and **exactly ten are missing**: 4 JS modules and 6 JSON configs from `CLAUDE_RUNTIME_FOUNDATION` / `CLAUDE_DUAL_LOCOMOTION` / `CLAUDE_GAMEPLAY_FOUNDATION`. Every file is classified A (public-safe required runtime: the ten) · B (private character source, never uploaded: `RAW_*` masters, `.blend` / 8K texture work, building intake sources) · C (not needed: docs, canon markdown, reports, `node_modules`, the archive's older runtime copy) · D (secrets, never). |
| owner command | from a clone root, after `git pull`: `node CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/deploy/bridge/apply_minimal_bridge.mjs --from "<folder containing CLAUDE_RUNTIME_FOUNDATION>" --push`. It copies only the ten files, then commits and pushes them. Checks per file: present, ≤ 1 MB, text, JSON parses, no secret values (key / token / password assignments, private keys, GitHub / AWS / OpenAI tokens, JWTs), no private absolute paths. Any relative import outside the ten files stops the run and is named. `--dry-run` runs the checks only. Verified end to end against a mock archive and a local bare remote: exactly 10 files in one commit; a planted secret, private path and unknown import each stop it; comment words like "secret" or "password" do not. |
| tests freed | `gameplay_rig_limits`, `gameplay_rig_pose_fk`, `gameplay_emote_endpoints` resolved their own path with a Windows-only `pathname.replace(/^\//, '')`; now `fileURLToPath`. Path resolution only; the test logic, `lab/RigAnimator.js` and the Character assets are untouched. They pass 64 / 0, 33 / 0 and 22 / 0 on Linux. |
| blocked until the push | 32 test files stop at `jsonSource.js`; the static build and release gate need the same ten files; `gameplay_mahgic_tree` fails only its static-build check; `gameplay_legs_faithful` needs the raw character master (category B), so it stays blocked by design |

### World cohesion

| field | value |
|---|---|
| mountains (`59c8109`) | **ridge sculpt** (`lab/world/ridgeSculpt.js`, pure):<br>• The NEAR / MID ribbon is subdivided and warped only where the rock lies beyond the FIELD reach square (±300 m).<br>• The sawtooth fins ease into a continuous crest, with secondary summits and saddles.<br>• Rock shelves step the faces, and fall-line gullies notch the crest; gully floors and cliff bands are a step darker.<br>• Reach safety: weight is zero inside 312 m, a guard keeps every warped vertex outside 304 m, and waterfall lips and passes are held still. Triangles wholly inside 312 m pass through **bit-identical**, so the collision face and its proxies are exactly as authored (ridge collision 8 / 8; host-safety check 9 samples the real ribbon and 150 k points).<br>• Subdivision level 4 HIGH / 3 MED / 1 LOW.<br>• The outer-face rock displacement now uses each station's own radial, so neighbouring segments share rows (no slivers).<br><br>**far massifs** were cones, whose outline is a triangle whatever the noise. They now have a spreading foot, full shoulders and a broad crown, with stepped shelves in the outline and one or two broad, uneven summits. Snow sits only on the high, flatter faces. `?ridgeSculpt=0` gives an A/B. |
| clouds (`a66a604`) | **Cumulus bodies:** each is a base shelf (now in depth) with one dominant and one to three lower CONVECTIVE CELLS: mounds of billows that shrink as they climb, plus ragged fringe puffs. Lobe sizes vary 3–4× inside a body, so the chain-of-equal-balls read is gone.<br>**Crown puffs** turn up to ±26° in their own plane, and the self-shadow march turns with them.<br>**Lobe rims:** a lobe's thin rim takes the body's mean tone, so a shaded lobe in front of a lit one no longer draws a crisp disc.<br>**Accepted composition preserved exactly:** the cell layout draws from a private positional stream, while the shared sky stream advances as the M9 layout drew from it. Verified: every body's position, yaw, drift and size, and the final stream state, are identical at all three tiers (material-realism check 9 pins it).<br>**Cost:** fewer puffs than before (mid 616 vs 685, horizon 610 vs 810 on HIGH), one draw per layer. |
| HALO eye level (`2d5281d`, `f665ccc`) | The audit used ad-hoc eye-level cameras (`capture --cam`) and one straight down. At eye level the rim read as a thin fence against sky, with 23 m of bare glass above the deck, and the deck glared white.<br>• **RIM GARDEN:** in the band between the host's reach (144.8 m + 0.45 m body) and the shell. It is a honed-stone plinth with coping, a planter bed with crystal planting in each sector's class colour (restrained toward silver, faint at night), and a neutral light cove under the coping.<br>• **Two shell TRANSOMS** at 4.6 m and 9.8 m.<br>• **GARDEN LIGHT:** a soft additive column over each of the five class garden terraces from a flush emitter ring, with a flush light pool. Light, not solids. It is placed on the bed centres, verified from above.<br>• **Deck:** honed and less metallic by day.<br>• Every piece follows live day / night. Host safety 2b: the rim starts beyond reach and ends inside the shell; the emitters are flush; the beams and pools are additive. |
| public space (`d6e1e7d`) | • Every glazed civic entrance gets a darker honed-stone APRON with a SLOT DRAIN just outside the threshold (brushed-metal edges, grating), all flush ≤ 2 cm and merged city-wide (3 draws).<br>• Canals and ponds get a flush cut-stone COPING band where the paving meets each beach bank (1.2 cm, 1 draw); the owner's beach-bank profile is unchanged.<br>• Host safety check 10 pins the flush heights. |
| night balance | Measured on 8 night views; mean luma is 35–86 on a 0–255 scale.<br>• Near-black pixels are 4–12 % of each frame, except MAH MATCH at 47 % (the owner's deliberately black brief).<br>• Clipped pixels are ≤ 0.4 %.<br>• The landmarks, lit windows and light pools carry the hierarchy.<br>No night change was made beyond the new practical lights (rim cove, garden light, entrance aprons). |
| tried and dropped | Honed-stone coping on the canal KERB colliders: the current registry has no rim kerbs, so the change was a no-op and it was reverted. |
| harness | `capture --cam "ID=x,y,z:lx,ly,lz;…"` adds ad-hoc audit cameras. The M10 evidence adds H1 / H3 / H6 (HALO eye level), T (HALO from straight above) and W1 (canal bank). |
| before / after | Pinned `c15f1c4` (bridge only; the same visuals as the end of M9) → pinned `d6e1e7d`: `evidence/m10_before/…` → `evidence/m10_after/…` (`desktop_day` 35 · `desktop_night` 19 · `audit_cams` H1 / H3 / H6 / T / W1 by day and night · `phone_med_day` 4 · `phone_low_day` 5). Sheets: `m10_mountains.jpg`, `m10_clouds.jpg`, `m10_halo.jpg`, `m10_public.jpg`, `m10_night.jpg`, `m10_phone_med.jpg`. |
| perf | pinned `c15f1c4` → `d6e1e7d`, HIGH, software WebGL (relative counters, not phone performance).<br>• **35 day views:** draw calls 6823 → 6976 (+153, ≈ +4 per view), triangles 43.20 M → 45.18 M (+4.6 %).<br>• **19 night views:** calls 3759 → 3853 (+94), triangles 24.12 M → 25.31 M (+4.9 %).<br>• **10 HALO / canal audit cameras:** calls +76, triangles +7.9 %.<br>• **Shader programs:** max 133 → 136. **Textures:** max 90 → 92 (the garden-light beam and pool gradients).<br>• **Phone-sized MED frames** (393 × 852, 4 views): calls 583 → 592, triangles 3.71 M → 3.84 M (+3.5 %).<br>• **LOW** (393 × 852, 5 views): calls 1122 → 1157, triangles 6.02 M → 6.11 M (+1.5 %). The triangle cost scales down with the tier, but the new draws do not: +7 in HALO views and +12 in the overview (HALO rim / garden light, aprons, coping). Gated after the pinned set: on LOW the HALO keeps plinth, bed, cove and beams (no shrubs, emitter rings or pools), and entrances keep the apron and drain slot (no metal edges or grating). LOW is now V02 338 → 346, V35 259 → 265, V13 197 → 200 draws against M9.<br>• **Where the cost goes:** the ridge sculpt ≈ +35 k triangles per view on HIGH (level 3 on MED, 1 on LOW) and 0 draws; clouds −0.5 k triangles with fewer puffs; HALO rim / garden light +7 draws and ≈ +43 k triangles (planting tiered 1 / 0.6 / 0.35); entrance aprons +3 draws; bank coping +1. |
| tests | host safety 11 / 11 (new: 9 ridge sculpt beyond reach, 2b HALO rim garden / garden light, 10 flush edge logic), material realism 10 / 10 (clouds keep the sky stream), colour law 4 / 4, Moon / cloud 19 / 19, ridge collision 8 / 8. Full suite on `d6e1e7d`: 61 files, **558 checks passing, 34 files failing** (M9: 436 / 37). The three path-fixed rig / emote tests now run; all 34 failures are bridge-blocked — 32 stop at the missing `jsonSource.js`, `gameplay_legs_faithful` needs the raw character master (category B), `gameplay_mahgic_tree` fails only its static-build check (29 / 1) |
| not done — blocked | **creatures** (fish / horse / Phoenix / Dogkie motion) are host-driven. **HALO seating / pavilions / activity zones** need colliders. **Gameplay presentation** (movement, camera, flight, elevator ride, combat) needs the running host. All three wait on the ten-file bridge push. |
| residual | • **HALO:** by day at eye level it is still mostly an open deck. Its real fix is collider-backed seating and pavilions (queued behind the bridge). The rim planting reads only within ~40 m of the edge.<br>• **Ridges:** the NEAR segments inside reach keep their authored fins, as collision authority requires. The sculpt shows beyond the square and on the MID ridge.<br>• **Clouds:** still billboard impostors; at close range the lobes are rounder than real cumulus.<br>• **Plaza:** the floor value is still pale by day (the honed ground policy). |

### M10 next — open issues (nothing here is approved)

1. **Owner action — the bridge:** run the one command above. After the push, Claude will rerun:
   - all 61 test files;
   - the static build and release gate;
   - the wildlife host and creature runtime;
   - movement / camera / flight / elevator / combat;
   - HALO collider validation.

   Then collider-backed HALO seating and pavilions, and creature presentation (fish, horse motion, Phoenix high flight, Dogkie).
2. **Owner review** of M10 (sheets above). Most subjective: the far-massif crowns, the garden light columns, and the cloud cells.
3. **Next refinement candidates:**
   - the plaza floor value by day and the plaza ramp / furniture materials. **Checked at the 09:12 check-in and not changed.** Checkpoint 7 measured the floor at mid-light grey (~150 / 160 / 180, not clipped); its high-key read is the owner's daylight palette, so changing it is a design decision. The white plaza pieces seen in V13 / V32 are anonymous field-merge chunks from several earlier accepted passes, and V32's camera sits 2 m from one. **Owner direction needed** before re-materialising them;
   - the MID ridge seen from the plaza (more sculpt amplitude beyond 360 m);
   - the far-massif spires;
   - HALO deck inlays at eye level.

## M11 — UNBLOCKED WORLD REALIZATION (`c1298d7` … `b75d0a9`)

Owner directive 2026-09-26 ("M11 UNBLOCKED WORLD REALIZATION"):
- The runtime bridge is deferred while the owner is away from the PC. Claude does not poll for it, stop for it, or ask for it again.
- Top priority is the HALO at eye level: it read "too empty, flat, pale and prototype-like".
  - Floor: radial planning, surface families, seams and drains.
  - Shell: it should feel ENGINEERED, not like thin lines.
  - Also the perimeter and promenade, and architectural light in the five class colours only.
- Also asked for: material realism, architectural depth for anything still reading as a plain cylinder / slab / box, the sky and clouds,
  transitions ("nothing dropped onto a flat plane"), and livability without furniture spam.
- Performance stays scalable across HIGH / MED / LOW.

No collider, walkable surface or host limit changed. Every new solid is inside a collider footprint, ≤ 5 cm proud below 3.4 m, above
3.4 m, or beyond the host's reach, and the host-safety test pins each case (16 checks, up from 11).

### HALO

| field | value |
|---|---|
| deck (`c1298d7`, `8575124`) | The deck shader now plans the floor radially (`applyRadialDeck`):<br>• **Eight ring zones**, each with its own panel size, stagger, value, roughness and metalness:<br>&nbsp;&nbsp;– a polished dark dais at the crown;<br>&nbsp;&nbsp;– large honed slabs in the arrival court;<br>&nbsp;&nbsp;– staggered mid bands;<br>&nbsp;&nbsp;– small setts in the garden ring;<br>&nbsp;&nbsp;– long lead-in bands;<br>&nbsp;&nbsp;– a dark granite promenade;<br>&nbsp;&nbsp;– a metal curb band at the glass.<br>• Every fourth ring is a darker accent course.<br>• **Ring seams:** inlaid metal rings, slot drains with grating bars, and fake steps (a lit arris over a shadow line).<br>• **Chamfer normals** on every joint (not on LOW).<br>• Value and roughness only, so the colour law holds.<br><br>`8575124` fixed aliasing at grazing view: from eye level, the far deck (60–140 m) glittered into white and dark streaks. Each joint, arris, inlay and grating now fades to its pixel coverage instead. With that false noise gone, the zone values step harder (court 0.95, bands 0.82, setts 0.72, promenade 0.64), so the rings read as layered platforms. |
| shell (`c1298d7`, `0eb6332`) | The old thin lattice is now an engineered structure, all inside the shell depth limit (host-safety 2c):<br>• **Main ribs** as 2.4 m box girders with split flanges and a recessed light channel; secondary ribs.<br>• **Six ring beams**, two transoms, a crown ring, and a compression ring on the rim plinth, kept below eye height so the view out stays open.<br>• **Rib base shoes**, cast collars at the nodes, and secondary mullions (not on LOW).<br>• **Materials:** graphite girders, platinum collars and flanges, chrome rings and mullions.<br>• **Glazing:** a ceramic dot frit above the second transom and a light crown frit, so the shell reads as glass; the eye-level band stays clear. |
| perimeter / light (`79f34f1`) | • **Promenade lamps** are recessed floor lights every 5 m along both promenade curbs: neutral white, and class-coloured where a class spoke crosses. They cast light pools at night.<br>• A **handrail light line** runs along the viewing edge.<br>• Slow **garden motes** rise over the five class garden terraces (not on LOW; one tick). |
| trunk (`45b1fc0`) | The tree-elevator trunk reads as built in lifts: collars every 20 m, and service rings with light bands every 60 m. All are clamped inside the 6.2 m trunk collider (host-safety 12). |

### World

| field | value |
|---|---|
| road corners (`7c64424`) | **A real bug.** The crossing pass relabelled each road's own consecutive segments as a JOIN, so every interior BEND node was dropped. At all 39 real bends (causeways, regional roads and trails), both legs ended square at the vertex, leaving the outer corner open to bare district ground with no kerb, and the inner seams crossed over the other leg.<br>Now each single-road bend gets a corner disc exactly the road's width: the kerb and core run tangent into it, the outer seam follows an arc, and the inner seams stop at their mitre point. Junctions are unchanged. Host-safety 13 pins it (it fails on the old graph). |
| ripple window (`26bdcb7`) | **A real bug.** The 48 m NEAR ripple window follows the player, and the far surface discards beneath it. Over the sea, the window still wore the canal material, so a player at or over the coast saw a hard-edged dark square of sea around them by day. The window now takes the look of the body it floats on, every tick. Canals are unchanged. |
| seams everywhere (`5182bb3`) | Paving, kerb, facade and glazing seams and bevels fade to their pixel coverage, as the geology shaders already did, so far causeways and forecourts stop aliasing. Near seams are unchanged. |
| plaza (`b3bec75`, `7299184`) | • **Collider furniture is built, not extruded.** Light columns get a stone drum, a shaft, reveals, a lantern and a capital (the lantern band stays ≥ 3.6 m). Barriers and planters get a stone body with platinum coping and a shadow reveal. Ramps are stone. All sit inside the collider envelopes (host-safety 11).<br>• **Bollards:** the pathway pylons read as bar stools and are now civic bollard lights in a smaller footprint (0.12 m, was a 0.26 m ring), with flush night pools (host-safety 14). |
| structures (`7c6aafc`, `8afefe1`, `e905c10`, `44a4bab`) | • **The arena:** a plinth band, pilasters, a cornice with gutter, 16 dome ribs and an oculus.<br>• **Mid-layer towers:** glazing every 4.2 m, edge fins, and a crown mast with a beacon.<br>• **VISIONARY overlook:** stone drums (≤ 5 cm) and reveals on its supports.<br>• **Mid-layer bridges are cable-stayed:** hammerheads, twin pylons with warning lights, and stay fans. A 150 m deck on two thin piers did not read as carried. |
| sky (`44347d0`, `b75d0a9` — after the pin) | • **Cloud lobe rims** erode into wisps (tiered procedural edge noise; LOW keeps the old edge).<br>• **High cirrus** is repainted as fibrous tufts with hooks. There are 17 extra veils over the plaza / HALO sky, drawn from a private random stream, so every accepted cloud position is unchanged (material-realism 9). Before this, looking up from the plaza or through the dome showed an empty sky. |
| harness | New audit cameras: C1 / C2 (a causeway bend from above and at eye level), K1 (a 95° regional bend), B1 (bollards), BR (the cable-stayed bridge and the sea window), S1 (the sea near the coast), and A1 (the arena). Probe scripts raycast past sky / mist / sea layers. **Camera artefacts, not world faults:** V24 sits 0.2 m below a terrace top, and V27 sits inside a crystal monolith. They are left as they are for continuity. |
| before / after | Pinned `214c48a` (the end of M10) → pinned `26bdcb7`: `evidence/m11_before/…` → `evidence/m11_after/…` (`desktop_day` 35 · `desktop_night` 19 · `audit_cams` H1 / H3 / H6 / H8 / T / A1 / W1 by day and night · `audit_cams_m11` C1 / C2 / K1 / B1 / BR / S1 by day · `phone_med_day` 4 · `phone_low_day` 5).<br>Sheets: `m11_halo_day.jpg`, `m11_halo_shell.jpg`, `m11_halo_night.jpg`, `m11_structures.jpg`, `m11_public.jpg`, `m11_sky_water.jpg`, `m11_night.jpg`, `m11_phone_med.jpg`, `m11_phone_low.jpg`.<br>**After the pin:** `b75d0a9` (cirrus) is shown in `m11_cirrus_postpin.jpg` (`26bdcb7` → `b75d0a9`, HALO and plaza look-up cameras U1 / U3 / U4). |
| perf | Pinned `214c48a` → `26bdcb7`, software WebGL. These are relative counters, not phone performance; no physical-phone claim is made.<br>• **35 day views (HIGH):** draw calls 6970 → 7299 (+329, ≈ +9 per view), triangles 45.18 M → 46.31 M (+2.5 %). The plaza views carry most of it (+22 to +31 calls each: the built civic furniture's stone / reveal / lantern materials, the bollards, the arena structure, the trunk collars). District and coast views are flat (−2 to +1).<br>• **19 night views:** calls 3852 → 4044 (+192), triangles 25.31 M → 26.02 M (+2.8 %).<br>• **HALO eye-level cameras H1 / H3 / H6 / H8:** +6 or +7 calls and +51 k triangles each, from the engineered shell, promenade lamps and handrail.<br>• **HALO from above (T):** +27 to +34 calls.<br>• **MED 393×852 (4 views):** calls 592 → 615, triangles +2.8 %.<br>• **LOW 393×852 (5 views):** calls 1145 → 1205, triangles +2.9 %. LOW skips the shell secondary mullions, garden motes, rim shrubs and chamfer normals, and uses half the shell ring segments.<br>• **Shader programs:** max 139 → 142 by day. **Textures:** max 92 → 94.<br>• **Cost-neutral fixes:** the anti-aliasing and value changes (deck, seams), the ripple window and the cirrus change no counter beyond +17 instances in the existing cirrus draw.<br>• **Road bends:** +3.8 k triangles, 0 calls. **Cable-stayed bridges:** +2.6 k triangles, 0 calls. |
| tests | Focused suites on HEAD:<br>• host safety **16 / 16**. New checks: 2c shell depth limit, 11 civic furniture envelope, 12 trunk collars, 13 road bend corners (verified failing on the old graph), 14 bollard envelope.<br>• material realism 10 / 10 (the radial deck multiplies stay value-only, and the sky stream is preserved).<br>• colour law 4 / 4.<br>• Moon / cloud 19 / 19.<br>• ridge collision 8 / 8.<br>Full suite on `26bdcb7`: 61 files, **563 checks passing, 34 files failing** (M10: 558 / 34). The failures are unchanged and all bridge-blocked:<br>• 32 stop at the missing `jsonSource.js`;<br>• `gameplay_legs_faithful` needs the private raw character master (category B, by design);<br>• `gameplay_mahgic_tree` fails only its static-build check.<br>The bridge-blocked `gameplay_world_jobb` check 33 and the `m5_owner_corrections` G01 road-topology checks were evaluated standalone against the new road graph: they pass. |
| not done — blocked | Unchanged from M10:<br>• creature motion;<br>• collider-backed HALO seating, pavilions and activity zones;<br>• gameplay presentation.<br>All three wait on the ten-file bridge (`RUNTIME_BRIDGE_MANIFEST.md`). Claude is not polling for it. |
| residual | • **HALO by day at eye level:**<br>&nbsp;&nbsp;– The deck, shell and perimeter now read as built, but the deck is still open — no seating, pavilions or activity structures. Those need colliders and wait on the bridge.<br>&nbsp;&nbsp;– The sky through the glass still dominates the frame toward the Sun (H6); that is the daylight-first presentation, not changed.<br>• **HALO at night:** the polished deck mirrors the lit rib channels as bright vertical streaks (H6 / V31). This is subjective: it reads as a wet-stone reflection, and can be toned down if the owner prefers.<br>• **Cirrus:** restrained by design (registry opacity 0.27). It reads as faint streaks, not a bold layer.<br>• **Plaza draw calls:** +22 to +31 per plaza view. Consolidating the furniture stone materials would save about 2 per view and flatten the stone read, so it was not done.<br>• **Match Hall and the plaza floor value:** owner briefs, unchanged. |

### M11 next — open issues (nothing here is approved)

1. **Owner action — the bridge (deferred while the owner is away; Claude is not polling for it).** When the owner is back at the PC,
   run the one command in `RUNTIME_BRIDGE_MANIFEST.md`. After the push, Claude reruns the full suite, the static build and release gate,
   the wildlife host, movement / camera / flight / elevator / combat, and HALO collider validation.
   Then: collider-backed HALO seating, pavilions and activity zones, and creature presentation.
2. **Owner review of M11** (sheets above). Most subjective:
   - the shell's girder weight and the frit;
   - the deck zone values;
   - the night deck reflections;
   - the cable-stayed bridges;
   - the bollard design.
3. **Next refinement candidates:**
   - the TITAN ledge underside (only seen from V27, whose camera is inside a monolith);
   - the VISIONARY overlook canopy fascia and soffit;
   - HALO night reflection strength (if the owner wants it calmer);
   - a replacement camera for V24 / V27.

## M12 — HARD PIVOT: MAGICAL SCENIC WORLD (`6be6203` … `bb7f5d3`)

Owner directive 2026-09-26 ("HARD PIVOT AUTHORIZED. ULTRA CODE MODE"), in priority order:
1. **A waterfall and elevated land.** It should be grand, magical and scenic, and lead the eye up to higher terrain that feels like land
   you could enter: a serene, suburban-style magical plain / highland. Not random, not theme-park cheesy.
2. **An aura / spectral energy language.** Soft, majestic and prismatic, with violet / pink / cyan / gold blending, soft bloom and light
   interference. It goes around major buildings, energy architecture, magical landmarks, selected sky moments, and diamonds / crystals.
   "Beautiful and expensive, not gaudy", not rainbow spam, and it must support the class system, not replace it.
3. **The black building (MAH MATCH).** A neo-Tokyo animated treatment: linework, luminous accents, scrolling / pulsing light and premium
   signage. Restrained, not cheap cyberpunk, and aware of performance.
4. **Broader uplift** around those ideas.

Rules: keep the five class identities, the district logic, the class colours and the crystal / diamond identity; stay phone-aware for
LOW / MED; and never fake work that needs the runtime bridge. The owner's written brief referenced a waterfall screenshot, but no image
reached this session, so the work follows the written description.

**How the brief's "cyan" is handled.** The colour law allows no teal or cyan family. The brief's "cyan" is rendered as the ice end of the
BLUE class family (hue about 202–206°, inside the 200–245° BLUE window). The spectral ramp is violet `#b48cff` → ice `#7fd0ff` → white
`#f4f6ff` → gold `#ffd88a` → pink `#ff9ad2`. White sits between ice and gold, so no blend passes through green. Colour law: 4 / 4.

No collider, walkable surface or host limit changed. The host-safety test grows to 18 checks.

### Before the pivot

| field | value |
|---|---|
| HALO beacon masts (`6be6203`) | One mast stands at the end of each class spoke, on the structural deck ring outside the shell (r 150.8 m). The plinth's inner face sits at 149.2 m, which clears the 147.6 m shell and the 146.5 m flight reach.<br>Each mast has a graphite shaft on a shoe, platinum collars, a crossarm with guy stays, and a beacon in the spoke's class colour (brighter at night). The view out over the rim gets five built class markers.<br>Host safety 15 pins the envelope. Cost: +3 draws and about 2 k triangles on HALO views. |

### P1 — the Veil Falls and the Veil highland (`c69a6f8`)

| field | value |
|---|---|
| site | The recessed west cove of the NEAR ridge at station 110 (crest −350.7, 146.7, −145.3). The station 109 / 111 buttresses stand about 45 m forward and frame it like a stage.<br>• It is on the VISIONARY highland's sight line (V17, within about 5°), and seen from the overlook (V06) and the plaza (F3, V21).<br>• It clears both mid-layer towers.<br>Registry: `macro.waterfalls` entry `VEIL_FALLS` (style `VEIL`, `reachable: false`) and `macro.highland` `VEIL_HIGHLAND`. `macro.js` skips the VEIL style, and `lab/world/veilFalls.js` draws it. |
| the falls | • A horsetail ribbon about 150 m high that widens from a 24 m lip to a 58 m base (46 × 12 grid, following the real face lines of stations 109–111).<br>• A water shader with flowing aerated streaks, horsetail strands, lip aeration and a faint spectral sheen.<br>• A dark wet-rock band behind it, for contrast.<br>• At the plunge: a 3 cm foam decal on the sea, a rising mist plume (HIGH 370 points in two tiers, MED 210, none on LOW) and a mid-height spray tier.<br>• A registry `keep_line` holds the ridge sculpt still under the water, so the ribbon lies on the rock. |
| the highland | A hanging mesa at lip height behind the falls, beyond host reach:<br>• an elliptical meadow top on a stratified geology-rock skirt, with the field-facing flare tucked so it never hides the falls;<br>• a source lake and channel that feed the lip;<br>• violet / silver / ice crystal groves;<br>• five villas facing the view;<br>• a cantilevered belvedere at the lip;<br>• lantern paths and a flight landing pad;<br>• the 72 m Veil spire (violet crystal, three shards), which shows above the lower crests from the field.<br>Everything is merged by material: +10 to +14 draws on west-facing views, +1 to +2 elsewhere, about 6 k triangles. |
| aura field (`lab/world/aura.js`) | One instanced, camera-facing field draws every aura in the world in **one draw**. Each aura has:<br>• a soft class-tinted bloom;<br>• an optional pearl-soft prismatic ring that breaks into arcs, or shows only its upper arc (the mist-bow);<br>• faint drifting fringes along the spectral ramp;<br>• a per-item night factor.<br>It is additive and depth-tested (terrain and buildings occlude it), with no tone mapping. It is restrained by day (global 0.55) and fuller at night (1.0). LOW drops the fringe interference. |
| Veil auras | A violet glow hugging the sheet, the base mist bloom, a mist-bow arc in the spray, the mid spray, a gold lip glow, a purple spire column and a broken ice crown ring on the spire. |
| blocked — the bridge | **Entering the highland is not built.** It lies ≥ 328 m out (host reach ±300 m) and is marked `reachable: false`. Walking or flying onto it needs new colliders, a raised walkable surface and host validation, which all wait on the runtime bridge. Nothing here pretends otherwise. |
| host safety | Check 16:<br>• the ribbon stops 3.6 m above the sea;<br>• the foam is flush (+3 cm);<br>• the highland's nearest point is 328 m out (the rim noise and tucked skirt flare are modelled);<br>• both entries are unreachable;<br>• `worldLayout.js` knows nothing about them, so no collider exists.<br>Check 9: the ridge is still bit-identical inside reach. |

### P2 — the spectral aura language (`d216bc5`)

| field | value |
|---|---|
| crowns | Every class crown diamond (temple, tower, gym, market, class houses) carries a broken prismatic halo in its class glow, stronger at night. Platinum crowns get none. |
| landmarks | Hero landmarks get a faint class bloom with a thin spectral rim. It is depth-tested, so the building hides its own centre and the light reads round its silhouette. |
| HALO | The five beacon masts glint in their class colours. The MAHWORLD plaza emblem (the union of the five classes) carries the full prismatic halo. |
| sky moments | • **The Sun:** a 22° halo forms for about a minute every five minutes by day (75 s visible out of every 300 s, with 12 s ramps).<br>• **The Moon:** a pearly 7° corona hugs the lavender Moon at night.<br>Both ride camera-relative at 870 m, in front of the 900 m bodies, so they stay locked to the Sun / Moon. The Moon disc is untouched. |
| tried and dropped | A halo round the HALO trunk-to-canopy junction: an additive glow does not read against the bright deck underside. |
| cost | Everything stays in the two existing aura draws (world and HALO), plus one for the emblem. |

### P3 — MAH MATCH neo-Tokyo facade (`e0ce63a`)

| field | value |
|---|---|
| animated linework | The facade line material is the building's own clone; the court keeps its lines.<br>• **Vertical strips:** class-coloured light packets (a white head and a fading tail, two per strip) climb at seeded speeds.<br>• **Crown bands:** run a chase.<br>• **Portal and sign edges:** run a warm scan.<br>• **One slow sweep** circles the building.<br>The base line is a dim ice glow, so the black body stays black. Levels sit below the tone-map shoulder so the class colours survive (the first pass clipped every packet to flat white). |
| ticker | One continuous perimeter band under the crown scrolls: MAH MATCH · OFFICIAL · the five class names in their class colours · LIVE. |
| signage blade | A vertical blade off the door-side corner with MAHMATCH lettering, class bars, a graphite frame and lit edges. |
| cost | +1 ticker draw and +2 blade draws; the lines stay one draw. One uniform clock drives it all, and day / night follows the live switch. |
| fixes that came with it | • `veilFalls.js`: two reversed `smoothstep(hi, lo, x)` calls (undefined in GLSL; SwiftShader drops them) are now `1 − smoothstep(lo, hi, x)`, for the lip aeration and the foam edge.<br>• **A P1 regression:** the new registry entries changed the registry hash, so `world_v1_colliders.json` no longer matched and M3 night-route check 10 failed. It was regenerated with `build_world_colliders.mjs`. Only the hash changed: all 9 457 shapes, the host mapping, the interactables and the rooms are identical. |

### After the pin — broader uplift and fixes (`e11184c` … `bb7f5d3`)

| field | value |
|---|---|
| class crystals (`e11184c`) | The 18 class crystal monoliths carry the aura in their class glow: sanctuary gates, the TITAN moon-pass wall, the LEAN spires, and the ATHLETE / VISIONARY / BAGE markers.<br>• Each region's tallest crystal gets one broken ringed halo; the rest get a soft bloom.<br>• It is faint by day and the rings show at night.<br>• It rides the world aura draw: 0 new draws. |
| the older falls (`e11184c`, `b84e1fd`) | TITAN_FALL and NORTH_FALL now speak the Veil's language at their own scale.<br>• **Water:** the Veil water shader is exported as `veilWaterMaterial`, with a width scale and a V flip; the Veil itself uses the identity settings, so it renders as before. Both older sheets pour the same aerated, strand-broken water with soft edges.<br>• **Removed:** the additive streak texture and the flat tinted back plane. The plane drew a hard-edged grey rectangle, most visible on NORTH_FALL and at night. This saves one draw per fall.<br>• **Auras:** a violet glow on the sheet and a base mist bloom; NORTH_FALL also gets a mist-bow. |
| Veil mist fix (`fa2763e`) | **A P1 bug.** The mist's point size was fixed in pixels, tuned at a 720 px frame. At 960×540 the plume blew out to white (on `e0ce63a` too); on a DPR-3 phone buffer the points would shrink to specks. The size now follows the renderer's drawing-buffer height. |
| aura culling (`a768651`) | `createAuraField` takes `cull`: a fixed field gets one bounding sphere round every quad and is frustum-culled. The HALO beacon field and the plaza emblem field use it; the world field cannot, because its sky halo follows the camera.<br>Result: −1 to −2 draws on views that do not see them; frames are identical where they are in view. |
| the Veil by day (`bb7f5d3`) | The checkpoint sheets showed the Veil reading by day as a blown-out white plume (F3, V06, V17, F5) instead of water with mist. The 370 additive mist points (0.2 each) saturated where they overlap, and two white auras stacked on top.<br>• The day mist drops to 0.085 per point.<br>• The base mist bloom and mid spray drop 40 % and 50 % by day.<br>• Night levels are unchanged.<br>The ribbon's streaks, strands and mist-bow now read by day. |
| evidence | • `m12_postpin_crystals_falls.jpg` (`e0ce63a` → `fa2763e`: G1 TITAN gate, L1 LEAN spire, N2 NORTH_FALL, T2 TITAN_FALL, by night and day).<br>• `m12_postpin_veil_day.jpg` (`e0ce63a` → `bb7f5d3`). |

### Evidence, perf, tests

| field | value |
|---|---|
| before / after | Pinned `6be6203` (the HALO masts, just before the pivot) → pinned `e0ce63a` (P1–P3): `evidence/m12_before/…` → `evidence/m12_after/…`. Every frame uses a pinned clock of 40 s, inside the Sun-halo window.<br>• `desktop_day`: 35 views.<br>• `desktop_night`: 8 views (V02 V06 V10 V13 V17 V21 V33 V34).<br>• `audit_cams`: F1–F6 (falls and highland) and MM / MC (MAH MATCH), by day and night.<br>• `phone_med` / `phone_low`: 393×852, V03 V13 V17 V06 F3 MM, by day and night.<br>Sheets: `m12_falls_day.jpg`, `m12_falls_night.jpg`, `m12_highland.jpg`, `m12_aura.jpg`, `m12_matchhall.jpg`, `m12_phone_med.jpg`, `m12_phone_low.jpg`.<br>Masts: `m12_halo_masts.jpg` (the end of M11 → `6be6203`).<br>After the pin: `m12_postpin_crystals_falls.jpg`, `m12_postpin_veil_day.jpg`.<br>**Note:** the `e0ce63a` frames show the Veil too hot by day; `bb7f5d3` fixes that (see the post-pin sheet). |
| perf | Pinned `6be6203` → `e0ce63a`, software WebGL. These are relative counters, not phone performance; no physical-phone claim is made.<br>• **35 day views (HIGH):** draw calls 7467 → 7692 (+225, +6.4 per view), triangles 46.40 M → 46.45 M (+0.1 %).<br>&nbsp;&nbsp;– Views that see the Veil (V06 V08 V17 V21 V22 V29 V33): +16 each and +6.8 k triangles. That is 13 for the falls and highland (ribbon, wet rock, foam, mist, mesa ×2, lake, canopies, villas ×3, spire, lanterns) plus the three aura fields.<br>&nbsp;&nbsp;– Views that see MAH MATCH: +6 (ticker 1, blade 2, aura fields 3).<br>&nbsp;&nbsp;– Every other view: +3 (the three aura fields, never culled at the pin).<br>• **Audit cameras:** F1–F6 +13 to +16; MM / MC +6.<br>• **8 night views:** 1747 → 1839 (+92), triangles +0.3 %.<br>• **MED 393×852 (12 frames):** 1681 → 1778 (+8.1 per frame), triangles +0.3 %. F3 / V17 +16, the rest +3 to +6.<br>• **LOW 393×852 (12 frames):** 1638 → 1728 (+7.5 per frame). F3 / V17 +15 (LOW drops only the mist), the rest +3 to +5.<br>• **Shader programs:** max 143 → 157 by day (+14: the Veil water, wet rock, foam, mist, lake and meadow, the aura field, the facade, ticker and blade). **Textures:** max 94 → 95. The first-frame compile cost on a phone is unmeasured.<br>• **After the pin:** `a768651` culls the HALO and emblem fields (−1 to −2 where they are out of view); `b84e1fd` drops the two older-fall back planes (−1 each where visible). The crystal and older-fall auras add no draws. |
| tests | Focused suites on HEAD `bb7f5d3`:<br>• host safety **18 / 18** (new: 15 beacon masts, 16 Veil Falls and highland).<br>• material realism 10 / 10.<br>• colour law 4 / 4.<br>• Moon / cloud 19 / 19.<br>• ridge collision 8 / 8.<br>• M3 night route 13 / 13 (check 10 restored by the collider-hash regeneration in `e0ce63a`).<br>Full suite on `bb7f5d3`: 61 files, **565 checks passing, 34 files failing** (M11: 563 / 34; +2 from the two new host-safety checks). The 34 failing files are the same as in M11, all bridge-blocked:<br>• 32 stop at the missing `jsonSource.js`;<br>• `gameplay_legs_faithful` needs the private raw character master (category B, by design);<br>• `gameplay_mahgic_tree` fails only its static-build check. |
| not done — blocked | • **Entering the Veil highland** (colliders, a walkable top, flight landing): this is new.<br>• Unchanged from M11: creature motion, collider-backed HALO seating / pavilions / activity zones, and gameplay presentation.<br>All of these wait on the ten-file bridge (`RUNTIME_BRIDGE_MANIFEST.md`). Claude is not polling for it. |
| residual | • **The Veil by day:** after `bb7f5d3` it reads as water with mist, but it is still the brightest thing in its frame when the Sun is behind it (F5, V06). This is subjective.<br>• **The highland:** it is only seen from far away and from above. At that range the villas read as plain white blocks. Close-range architecture only matters once the highland can be entered, which waits on the bridge.<br>• **MAH MATCH:** the packets read clearly within about 40 m (MC, V34). From the plaza (MM) they are a faint shimmer, which is restrained on purpose. The ticker text is placeholder copy (MAH MATCH · OFFICIAL · the class names · LIVE).<br>• **NORTH_FALL:** it now reads as water, not a grey slab, but it is still a thin 9 m sheet at the back of a notch.<br>• **Crystal and crown auras:** faint by day by design; the rings carry at night.<br>• **No reference image:** the owner's waterfall screenshot never reached this session, so the look follows the written brief. |

### M12 next — open issues (nothing here is approved)

1. **Owner action — the bridge (deferred while the owner is away; Claude is not polling for it).** After it lands, run everything in
   the M11 list, plus the Veil highland:
   - colliders for the mesa top, paths and belvedere;
   - a walkable / flight-landing surface;
   - a way up (for example a flight corridor or a lift from the VISIONARY highland);
   - host validation of all of it.
2. **Owner review of M12** (sheets above). Most subjective:
   - the Veil's day brightness;
   - aura strength: crowns, landmarks, crystals, and the Sun-halo cadence (about a minute in every five);
   - MAH MATCH packet density and speed, and the ticker copy;
   - the highland villas and spire.
3. **Next refinement candidates:**
   - highland villa architecture (terraces, roof gardens, lit rooms at night), worth doing once the highland is reachable;
   - a grander NORTH_FALL (width is registry data) if the owner wants a second hero fall;
   - a physical-phone check of shader-program compile time (+14 programs).
