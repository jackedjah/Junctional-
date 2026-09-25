# MAHWORLD — MASTER WORLD PIVOT LEDGER

Owner directive 2026-09-25: **FULL AAA WORLD PIVOT / PREMIUM WORLD PASS** — AAA *perceived* quality with smart real-time scalability; bright
fantasy DAYLIGHT is the hero presentation; the five-colour law (ATHLETE gold · TITAN blue · LEAN red/crimson · VISIONARY purple/violet ·
BAGE pink; neutral platinum/silver/graphite/steel/black/glass/stone/white light as support). Owner review is the final visual gate: nothing
here claims subjective approval, physical-phone performance or authenticated hosted gameplay.

Branch `backup/mahworld-m6-20260924T190351Z`; pivot starts from `b94e611` (DAY-first default). Production and every protected preview are
untouched; no deploy is part of this ledger.

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
