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
| M8E lived-in buildings (latest) | real windows per floor with rooms behind the glass, lit / dark rooms at night, storefront entrances, balcony, service bays, parapets + roof access; one synchronised class-colour light show (plaza, sanctuaries, HALO rim); LEAN spire house windows + door | `evidence/m8e_facades_day.jpg`, `m8e_facades_night.jpg`, `m8e_plaza_day.jpg`, `m8e_show_steps.jpg`, `m8e_houses_halo.jpg`, `m8e_phone_med.jpg` |

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
