<!-- M20 AGENT BRIEF — the rules and orientation handed to every M20 worktree / review agent. Load it in full when briefing an agent. Paths under /tmp/claude-0/.../scratchpad are session scratch (they may not exist in a later session: re-render baselines instead). Kept intact as written during the session; later 'STATE AFTER WAVE n' sections supersede earlier ones. -->
# MAHWORLD M20 — AAA REALIZATION / WORLD CLARITY — brief for area agents (read fully before editing)

You are one of several agents polishing the EXISTING MAHWORLD open world (Three.js r185 WebGL2, browser game). Each agent owns a SEPARATE
set of files, works in its OWN git worktree, commits there (never pushes), and hands back a report. The lead merges.

## The owner's M20 law (2026-09-27, verbatim essentials)
- "STOP EXPANDING THE MAP. NO NEW DISTRICTS. NO NEW LARGE LANDMASSES. NO NEW MAJOR SYSTEMS. NO NEW RANDOM LANDMARKS. THE WORLD IS BIG
  ENOUGH." The macro layout is FROZEN. The job: REFINE, REMOVE, REPLACE, RETEXTURE, RE-LIGHT, RE-SHAPE, POLISH existing content.
- "Perform a brutal visual audit. For every visible object ask: 'Does this increase the perceived quality of the world?' If NO: simplify
  it, replace its material, reshape it, move it, remove it." Remove: awkward repeated crystals, ugly procedural clutter, visually noisy
  effects, cheap-looking props, redundant aura, billboard-like clouds, weak repeated geometry, floating / poorly grounded props,
  "anything that screams prototype". "The final world can have FEWER elements and still look far richer."
- Quality standard: GTA VI / modern PS5 open-world PRESENTATION (material realism, believable light, depth, human scale, surface
  definition, density, architectural detail, foliage, atmospheric clarity) — "PS5-LIKE PERCEIVED QUALITY, NOT PS5 RAW COST". Do not
  claim identical technology; achieve the look intelligently in WebGL (instancing, shared materials, trim / detail / normal maps,
  LOD, impostors, culling, shader detail instead of geometry; spend geometry only where it changes a silhouette).
- Materials: every major surface needs a believable material identity (platinum, black structural metal, brushed metal, glass, stone,
  paving, roads, rock, grass / soil, wet ground, shoreline, water, crystal): roughness variation, normal / detail information, macro +
  micro breakup, reflection control, edge response, seam depth, contact darkening, wetness, subtle imperfection — "maintained and
  premium", NOT grimy; no longer "one shader on a primitive".
- SOFTENED PRECISION: "Remove obvious razor-thin primitive edges … Not MUSHY. Not RAZOR-SHARP." Bevels, radiused corners, curved
  junctions, support thickness, object-to-ground contact. CRYSTALS / DIAMONDS: "Try to remove sharp objects and edges, even with the
  diamonds. There should be more of a transition into the magic power look." — crystals stay important but each must feel intentional:
  refraction illusion, facet differentiation, edge highlights, embedded light, grounding, scale variety, softened edges that dissolve
  into energy / glow rather than hard razor octahedra; remove repetitive crystal clutter.
- Lighting: day — better sun direction, bounce illusion, contact shadows, controlled highlights, less blown-out white, stronger depth;
  night — practical lighting, believable pools, interior windows, restrained class accents, readable darks, NO universal blue / purple
  wash. Local contrast without crushed blacks. Post: evaluate subtle tone-mapping / exposure / restrained bloom / AO / contact AO / AA /
  sharpening / grading — avoid heavy bloom, blurry TAA, giant screen-space effects, washed highlights, crushed blacks.
- "Do NOT hide ugly geometry with fog." "Do not solve weak architecture with neon." "Do NOT carpet the world with glowing lines."
- Everything added must have a reason ("Why is this here?"). Before adding anything ask: "Does the existing world genuinely need this?"

## OWNER REINFORCEMENT (2026-09-27, later the same day — verbatim essentials; this is now the lens for every wave)
- "This is not a 'nice to have' pass. This is a decisive quality pivot." "The standard is: does this look like a real premium game world
  where our characters naturally belong?" If a surface, object, edge, plant, tree, cliff, building, path, dome area, water sheet,
  waterfall or sky layer still reads as too sharp / too geometric / too raw / too placeholder / too retro / too flat / too rigid / too
  gamey / too low-resolution in feeling / too obviously synthetic in a bad way, it is NOT finished.
- Bias TOWARD: softer believable edge transitions, better silhouettes, natural breakup, convincing material response, environmental
  layering, depth, premium lighting, practical entrances and thresholds, realistic material transitions, world coherence, "people
  actually exist here", visual fit with the characters. Bias AWAY from: chunky forms, exposed primitive geometry, old-game-looking trees /
  plants, overuse of hard planar cliff logic, weak water transitions, bland or overbright sky states, empty or too-clean civic space,
  clutter that does not support realism or gameplay.
- Still NO map expansion (no districts, biomes, major landmarks). Add only what directly supports realism, atmosphere, practicality,
  readability, character compatibility, architectural credibility, polish. Gameplay (traversal, readability, combat, duels, character
  visibility, motion clarity, orientation) must not be damaged.
- Priority queue: 1 waterfall + waterfall-to-water (lead) · 2 rock / mountain smoothing · 3 sky / cloud / atmosphere (DAY: "gray-violet,
  silver-lavender, calm-before-storm, moody but beautiful, soft but premium, magical but believable — not empty white, plain blue, cheap
  bright skybox") · 4 tree / crystal vegetation / grass · 5 building material / entrance / facade realism · 6 dome / visible interiors ·
  7 subtle magical ambient ecology ("magic dust / magical micro-fauna / ambient arcane geometry … NOT random VFX spam") · 8 surface /
  material polish · 9 life presence · 10 remaining ugly areas.
- Method: identify the ugliest remaining areas → prioritise by visual importance → fix → render → adversarially self-review → fix again if
  still weak → only then move on. "Do not pretend something is good enough if it still looks obviously prototype-level."

## STATE AFTER WAVE 1 (merged at the head your worktree is based on)
- Wave 1 merged: brutal cleanup + soft crystals (dust / shard / spike / underbrush clutter removed, sticker aura frames gone, 9 sky gems as
  slender class-tinted crystals, quartz-column monoliths on a contact apron; applyCrystal gained tipFade / rimFade / fadeNear / facetGlow /
  facetLight options) and light / post / materials (sun-led rig, neutral IBL, directional contact shadows, material family micro detail).
  NOTE: in r185 material.envMapIntensity does nothing under scene.environment — the renderer uses scene.environmentIntensity.
- The lead's M20 work (do NOT edit): lab/world/water.js skyWater() (canals / sea / Veil basin mirror the atmosphere dome through
  atmosphere.js uniforms() — keep that accessor), lab/world/veilFalls.js (flume on its own frame, the curtain's free-fall streaks, the FILM
  that carries the fall down the rock to the sea as the ridge's own triangles 3 cm proud, the district anchors()), lab/world/residents.js
  (visual-only Veil residents), lab/world/coast.js sea block.
- The fixed baseline frames under …/scratchpad/m20/base* predate wave 1 (lighting changed everywhere): render YOUR OWN before-frames from
  your worktree BEFORE editing, at your cameras, and compare against those.
- Extra tests that must stay green: gameplay_world_m20_water, gameplay_world_m20_residents.

## STATE AFTER WAVE 2 (merged at the head your wave-3 worktree is based on, 25653a6)
- SKY (merged): storm-light day palette (low-saturation grey-violet dome, pearl sun glow, altostratus veil), deep blue night, clouds that
  break when seen from above, the light rig COLOURS follow the sky (fieldScene hemisphere / fill / fog now lavender-grey), atmosphere.js
  writes the real scene fog. The world under it is greyer than before: judge your area UNDER THIS SKY (render your own before-frames).
  A warm colour under the lavender hemisphere drifts toward mauve (the Veil lawn did — it was re-balanced toward straw-grey).
- The lead's M20 waterfall (do NOT edit — veilFalls.js falls / water / strands / spray / plunge / film / wet rock / paving / villa glass /
  lawn palette / anchors are the lead's): the fall now pours from three LEVEL-lipped notches (uStr strand mask), the curtain spans the bays
  (rowPath), a spray wall stands off the landing line from 3.6 m up, a flush plunge line on the sea; the Veil villa glass has a room-card
  shader; the paving no longer lets the lawn through.
- MOUNTAINS (wave 2, still in review when wave 3 started): macro.js / farWorld.js / coast.js islands / surfaceDetail.applyGeology are in
  flight — do NOT edit them; they will be merged next to your work.
- Full-suite baseline for wave 3: see …/scratchpad/m20/fail_w2.txt (the failing-file list at 25653a6; same 34 bridge-blocked files as
  f15b_clean.txt unless the lead notes otherwise). gameplay_world_m20_water now has 9 checks; gameplay_world_veil_district counts 18 draws
  on HIGH (VEIL_FALLS_PLUNGE + VEIL_FALLS_SPRAY added).
- LOAD: the machine has 4 CPUs and other agents render too — run AT MOST ONE capture / preview process at a time.

## STATE AFTER WAVE 3 (merged at e8449fa — your wave-4 worktree base)
- MOUNTAINS round 1 merged (massif normals, fracture planes, spray-wet Veil rock, rock islands; ISLE_SW keeps M9 heights inside the reach
  square — m19 check 11). A mountains ROUND 2 agent (silhouettes) is STILL RUNNING on macro.js / farWorld.js / coast.js islands /
  applyGeology / a possible new ridgeCrags.js — do NOT edit those.
- WAVE 3 merged: architecture / MAH MATCH / entrances (architecture.js, facadeKit.js, fixtures.js, matchHall.js, cityScene.js plaza
  furniture + entrances: built canopies, fascia names, downlights, stone base, per-portal uniforms, MAH MATCH screens + mezzanine hall) and
  vegetation (forest.js crown shading, Veil blooms / hedges, zoned grass; lead fix: no white apex caps). SEA: slate #2b4760; the ripple
  window wears the body's skyWater uniforms. Veil lake lighter. Suite baseline unchanged (fail_w2.txt).
- Lessons from the reviews so far (avoid them): a shared customProgramCacheKey with per-object constants baked into GLSL text reuses the
  first program for every object — pass per-object values as uniforms; flat pale rectangles read as placeholder stickers; a neutral sheen
  / white rim at a surface that faces up mirrors the bright sky as a white cap; "near-invisible at mid-range" is not a win — check every
  camera the brief names, zoomed; host-safety regressions are always blocking; keep CRLF lines CRLF (read / write files as raw bytes).

## Where things are (paths relative to your worktree root; the repo root contains CLAUDE_GAMEPLAY_RUNTIME/)
- World modules: `CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/lab/world/*.js` (worldB.js builds them in order); civic plaza / buildings
  `lab/cityScene.js`; renderer + tone mapping `lab/play.js` (line ~61) and the evidence harness `deploy/world_preview/world_preview.js`
  (must mirror any renderer change); light rig `lab/fieldScene.js` (sun key, rim, hemisphere, room environment); tiers `lab/quality.js`;
  registry `lab/assets/world/world_registry_v1.json` (built by `deploy/jobb/build_registry.mjs`).
- Evidence tools (run from `CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY`):
  - `node deploy/world_preview/capture.mjs <outDir> --views V03,V05 --cam "ID=x,y,z:lx,ly,lz;ID2=..." --tod DAY|NIGHT|BOTH --clock 40
    --size 960x540 [--quality HIGH|MED|LOW] [--qs "physical=0"]` renders the REAL client world headless (software GL: ~40–90 s per frame;
    frames `<ID>_<TOD>_t40.jpg` + `capture_report.json` with per-view draw calls / triangles and `console_errors` — the only expected
    error is one pre-existing 404). A Bash call is capped at 10 minutes: render ≤ 6 frames per call, or run it in the background and poll.
  - `node deploy/world_preview/inspect.mjs "<js using WP>"` evaluates JS in the live preview (WP.scene, WP.THREE, WP.find(/regex/),
    WP.fieldScene.worldInfo().modules.<module> debug info) — use it to NAME the objects you see in a frame before changing them.
  - `python3 deploy/world_preview/five_colour_audit.py <captureDir> <outPrefix> [--w 320]` (five-class colour audit).
- Fixed M20 cameras: `/tmp/claude-0/-home-user-Junctional-/b7a5b257-4154-5b93-907d-17a5c195618b/scratchpad/m20/cams.sh`.
  BASELINE "before" frames of the CURRENT world (commit c51ac67 == world of 9cd2969), day + night, are in
  `…/scratchpad/m20/base/` (all V-views + TS1, F3, F4, MA, MX), `…/scratchpad/m20/base_x/` (highland HA HV HL1 HR, falls FW1 FK F2 FP,
  MAH MATCH close MM — wait for `…/m20/base_x.done`), `…/scratchpad/m20/base_phone/` (MED tier, 393×852: V03 V07 V13 V34 HL1 FW1 —
  wait for `…/m20/base_phone.done`). If a camera you need is missing, render your own before-frames from an unmodified checkout (e.g.
  `git worktree add <scratch dir> c51ac67` — mind disk space and remove it afterwards) BEFORE editing.
  Put YOUR renders / sheets under `…/scratchpad/m20/<your-area>/`.
- Tests: `node 16_TESTS/gameplay_world_<name>.test.mjs` (from CLAUDE_GAMEPLAY_RUNTIME). Must stay green: gameplay_world_colour_law,
  gameplay_world_pivot_host_safety, gameplay_world_combat_zones, gameplay_world_duel_roster, gameplay_world_hardscape_inlays,
  gameplay_world_material_realism, gameplay_world_veil_district, gameplay_world_warm_class_light, gameplay_world_m19_mountains,
  gameplay_m5_ridge_collision. Full suite baseline: "69 files, 631 checks passed, 34 files failing" (after wave 1); the 34 failing files are
  bridge-blocked and listed in `…/scratchpad/f15b_clean.txt` — your change must not add a failure. NOTE: `…/scratchpad/baseline/
  run_tests.mjs` HARD-CODES the main checkout (`const RT = '/home/user/Junctional-/CLAUDE_GAMEPLAY_RUNTIME'`): copy it into your area
  dir, point RT at YOUR worktree's CLAUDE_GAMEPLAY_RUNTIME, and run the copy (its logs dir is next to it). Delete
  `26_LOCAL_AUTHORITY/deploy/probe_out` afterwards. Never run the suite against the main checkout.

## HARD RULES (owner law — violating any of these makes your work unusable)
1. No production deploy. Do not touch Character, MAHFITT or S08 anything (the character preview GLBs under lab/assets/*_preview are
   Character lane: read-only reference at most). Do not spend Scenario credits (no model_run / paid generation; if you believe a generated
   texture would clearly beat a procedural one, write a concrete proposal — asset list, purpose, expected gain — into your report
   instead). Do not install or upgrade dependencies (Three.js r185 is pinned in `26_LOCAL_AUTHORITY/vendor/three`).
2. NO EXPANSION: no new districts, landmasses, major systems or landmarks. Replacing / refining existing elements is the job.
3. COLOUR LAW: the only expressive colours are the five classes — ATHLETE gold, TITAN blue, LEAN red/crimson, VISIONARY purple/violet,
   BAGE pink — over neutral support (platinum, silver, white, graphite, black, glass, stone, pale ice). No green, orange, teal or cyan
   as an expressive colour. Hue windows (HSL degrees): RED 345–360 and 0–12, GOLD 36–56, BLUE 200–245, PURPLE 246–292, PINK 293–344.
   Never average two class colours in RGB where hues sit far apart (gold+crimson → orange, blue+pink → fake purple): blend through an
   equal-channel neutral; ease toward an EQUAL-CHANNEL grey (pearl #f4f6ff is faintly blue); scale hot light by its brightest channel
   (gold clips to yellow); watch double linearisation (a hex converted to linear twice lands gold at amber). Purple belongs to VISIONARY.
4. HOST SAFETY: art may sit only on exact collision surfaces, inside collider footprints, ≥ 3.4 m above the ground, or beyond the host's
   reach (±300 m). Anything a player can reach below 3.4 m must be ≤ 5 cm proud of the surface. Never change a collider, a walkable
   surface or elevation, or `play/rules1723/world_v1_colliders.json` (except its hash when the registry changes through the builder).
   The ridge's in-reach inner face IS the collision plane (bit-identical, tested). `gameplay_world_pivot_host_safety` must stay green.
5. Never hide bad geometry behind fog. Phones are a real target: prefer instancing, merged geometry, shared materials, shader detail;
   every new draw call must be justified; report draw calls / triangles before vs after from capture_report.json; LOW must get cheaper
   or stay equal, never heavier. Removing clutter that costs draws / triangles is a win to report.
6. Files mix CRLF / LF line endings per line: preserve them. `git diff --stat` must equal `git diff --ignore-cr-at-eol --stat`.
7. Match the surrounding code: dense single-line JS in the existing idiom, block comments that state the owner rationale
   ("M20 (owner 2026-09-27): …"). Keep changes inside your owned files. Registry changes only through a NEW guarded
   `(function (R) { … })(reg.…);` line in build_registry.mjs + the same function applied to the JSON with a node round-trip
   (`JSON.stringify(reg, null, 1) + '\n'`), then `node deploy/jobb/build_world_colliders.mjs` (only its hash line may change).
8. Do not mark anything as owner-approved; describe what you did and what you saw, honestly.

## Traps we already hit (check for them)
- Mirrored local frames / helper quads wound inconsistently silently BACK-FACE CULL surfaces (the Veil meadow, the ridge ribbon, road
  seams). If a surface you touch "does not show", measure its face orientation before anything else.
- A material with polygonOffset can win the depth test over a transparent sheet lying just above it at grazing angles.
- The aura shader writes linear values straight to the screen (a registry hex shows at a different hue); ACES shifts saturated hues.
- Additive light on the moon-blue night floor turns pink / rose into violet.
- Software-GL frames are not performance evidence beyond draw calls / triangles; never claim a phone measurement.

## Evidence standard (mandatory)
For every meaningful visual batch: fixed-camera BEFORE / AFTER at the same cameras (day and night where relevant, at close range /
eye level / street / midrange / aerial as your area needs), Read the frames yourself and judge material clarity, silhouette, texture
density, lighting, human scale, atmosphere, visual noise, performance. "If the improvement is not obvious: do not call it a win" —
iterate or revert. Make one labelled before/after sheet (PIL, 640×360 cells) at `…/scratchpad/m20/<area>/sheet_<area>.jpg`, plus a
phone-MED pair for at least two cameras if your change affects tiers.

## Method (mandatory)
AUDIT (name every weak object you see in the baseline frames; decide remove / simplify / replace / retexture / reshape) → IMPLEMENT →
RENDER after-frames at the same cameras → look at them yourself and compare honestly → iterate → run the tests (area + colour law + host
safety + the full suite via your RT-pointed copy) → check perf in capture_report.json → COMMIT in your worktree with a clear message
ending with the two lines:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MRsQvWMaxbdqwsgrxwdgWq
