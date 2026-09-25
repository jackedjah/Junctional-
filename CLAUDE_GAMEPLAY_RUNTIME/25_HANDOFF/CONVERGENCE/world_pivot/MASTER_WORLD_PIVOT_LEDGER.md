# MAHWORLD — MASTER WORLD PIVOT LEDGER

Owner directive 2026-09-25: **FULL AAA WORLD PIVOT / PREMIUM WORLD PASS** — AAA *perceived* quality with smart real-time scalability; bright
fantasy DAYLIGHT is the hero presentation; the five-colour law (ATHLETE gold · TITAN blue · LEAN red/crimson · VISIONARY purple/violet ·
BAGE pink; neutral platinum/silver/graphite/steel/black/glass/stone/white light as support). Owner review is the final visual gate: nothing
here claims subjective approval, physical-phone performance or authenticated hosted gameplay.

Branch `backup/mahworld-m6-20260924T190351Z`; pivot starts from `b94e611` (DAY-first default). Production and every protected preview are
untouched; no deploy is part of this ledger.

## How evidence is produced

- `26_LOCAL_AUTHORITY/deploy/world_preview/` renders the REAL client world (`lab/fieldScene.js` + the registry world layer, HALO included)
  WITHOUT the gameplay host, from the same generated collider authority, at twelve FIXED viewpoints (`capture.mjs` → `VIEWS`). Headless
  Chromium with software WebGL (SwiftShader): stills are faithful, frame times are NOT performance evidence.
- `contact_sheet.py` pairs BEFORE | AFTER per viewpoint. Evidence lives under `world_pivot/evidence/` (JPEG q84, 1280×720 desktop HIGH and
  393×852 phone-sized MED).
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
