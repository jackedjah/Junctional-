# MAHWORLD — visual learning record

Project-local implementation memory, per MASTER WORLD CLOSURE §2 and R2 PERPETUAL WORLD CRAFTSMAN
§16. This is the ONE canonical record — director locks, proven recipes and reusable lessons live
here and nowhere else. Not a log. Each entry is a rule that cost something to learn.

Format: **failure → root owner → correction → proof view → regression to avoid.**

---

## DIRECTOR LOCKS — R2 PERPETUAL WORLD CRAFTSMAN DOCTRINE

FACT, not hypothesis. These are standing constraints, not goals to be traded away.

**Quality bar.** The physical credibility, authored specificity, environmental depth, animation
polish and cleanliness of a top-tier modern open-world production — as a BAR ONLY. Never copy
another property's map, assets, characters, vehicles, brands or architecture.

**§2/§3 A world of cities.** Multiple physically separated, flyable city-biomes legible from world
scale as real destinations with travel distance and atmospheric separation. Every city inherits the
SAME genome — platinum/chromium, dark crystal, square-diamond logic, MAHGIC, FOBLOCKs, canonical
MAHBEINGS, FOB-derived transport, physical FOBEAM endpoints, music square-diamonds, authored
interiors. **Biomes alter ecology, topography and spatial organisation — never the palette.**

**§5 LAKE CITY.** Organised BY water: a large reflective lake, connected basins, canals, falls,
water terraces. Platinum bridges, FOBLOCK docks, water-adjacent diamond nodes, mist, shoreline
ecology, reflective civic platforms, distant vertical landmarks. Water shapes the topology; flight
corridors are preserved. Ordinary boats are prohibited unless redesigned from the FOB genome.
Reserved corridor already exists: `terrain.js` `BASIN` (bearing 62, r 330, rx 210, rz 130).

**§6 RAINFOREST CITY.** **DO NOT RECOLOUR TO GENERIC GREEN.** A living city of giant plant-like
ground organisms, roots, trunks, canopy structures and organic terraces — built as MAHWORLD
organisms: square-diamond nodes, platinum growth bands, dark crystalline tissues, embedded FOB
interfaces, MAHGIC veins, localised FOBEAM emitters, subtle breathing/orienting/pulsing. Nature and
technology **co-evolved**, never pasted together. Director addition: **rain is not rain** — very
thin, detailed shards of diamond droplets with a sparkling aura. Populate with MAHNIMALS / small
square-diamond fauna, on land and in the water, consistent with the genome.

**§10/§11 UNIVERSAL MUSIC-LINE LAW.** EVERY FOBEAM family carries a refined miniature VERTICAL
music-line/bar motif at or near its physical emitter, receiver or travelling packet. Canonical world
motif. Built ONCE as reusable infrastructure with states IDLE / ACTIVE_AUDIO / QUIET / TRANSITION /
DISTANT_LOD. Idle motion subtle and DETERMINISTIC. Architected now to accept normalized Apple
Music/audio features later **without changing its geometry contract**. Forbidden: giant equalizer
UI, strobing, noisy random motion, hundreds of unique loops.

**§12 FOBEAMs are infrastructure, not decorative neon.** Real nodes at both ends, respect occlusion,
near shows packets + music response, mid simplifies, far becomes sparse network lines.

**§13 Realness through cause.** Supports hold weight; platforms have thickness; transit docks
somewhere; windows imply interiors; water occupies terrain; organisms root into surfaces;
reflections correspond to nearby objects; lights have fixtures; beams have endpoints; residents have
destinations; roads connect districts; backsides are authored. Causality, not texture noise.

**§14 Cleanness bar.** No z-fighting, shimmering distance geometry, placeholder primitives, dead
black rectangles, duplicated props, unsupported roads, clipping, floating signage, arbitrary spikes,
broken reflections, procedural repetition or unfinished backsides. **Remove before adding.**

**§15 Method.** Three largest visible failures → owner → smallest correct fix → cheapest falsifying
proof → keep/revert → one regression view → one reusable lesson. **If two attempts yield weak
improvement, CHANGE METHOD** — never add glow, subdivisions or clutter instead.

**§17 Credit discipline.** One lead writer by default. Parallelise only independent systems with
explicit ownership. Reuse cameras, materials and diagnostics. Targeted crops over full captures.
Spend capacity on implementation and proof, not repeated audits or long prose.

**§18 Acceptance gates — closure is FORBIDDEN while:** ordinary humans or cars remain; city
silhouettes are generic; biome identity relies on palette swaps; FOBEAMs lack physical endpoints or
music-line accompaniment; rear views are empty; water/nature corridors are blocked; rainforest
organisms read as ordinary plants with tech stickers; far cities are indistinguishable; inter-city
flight lacks spatial logic.

**§20 BUILD ORDER (authoritative).** civic-city defects → monument/transport/sky roads → giant
authority hologram → global audio-reactive FOBEAM mini-line system → far-zoom world composition →
Lake City → Rainforest City → inter-city flight/streaming → authored detail → population → 360
closure → iPhone proof → performance → repeat.

**§22 Limit handoff.** Save the strongest verified state; write only current verified state, the
exact next three actions, the highest-risk unresolved visual defect, files owned, and the proof
renders needed to reopen. **Do not push unless authorized.**

---

## L01 — A metal takes no diffuse light, so orientation decides grade
**Failure.** Large surfaces render black for no apparent reason.
**Root owner.** Any material at `metalness >= ~0.9`. It is lit ONLY by `scene.environment`, whose
horizon is bright and whose zenith is near-black. A vertical face reflects the lit horizon and reads;
an **up- or down-facing** face reflects the near-black zenith and renders **black**.
**Correction.** Every horizontal face takes a LOW-metalness partner: `platinumLit` (0.38),
`platinumMidLit`, `platinumMid`. Split geometry into role buckets **by measured triangle normal**,
not by guessing from a loop index (`foblock.js` does this; measured split is clean with a gap —
shell |ny| 0.000–0.616, cap 0.831–1.000).
**Proof.** Traverse the built scene, transform every triangle to world space, sum area of faces
within ~10° of horizontal, grouped by metalness. Report m².
**Regression.** SHIPPED FIVE TIMES. Most recent: a crown cap band routed into a bucket merging into
`M.trim`, and `materials.js` sets `m.trim = m.chromeMirror` (metalness 1.0) → +36.23 m² of new
up-facing mirror, while the pass's own report claimed in capitals that it had created none.
**Corollary.** "But we'd lose the bright mirror highlight" is the misconception itself — an up-facing
mirror face has no highlight to lose. A low-metalness partner reads *brighter* there, not dimmer.

## L02 — `mix()` is the wrong operator for a black mirror
**Failure.** "The reflective floor is not black" — and no material change could make it darker.
**Root owner.** The planar-mirror shader patch in `mahplaza.js`. `mix(surface, reflection, w)`
REPLACES the surface, so a floor reflecting a sky at lum 90 *is* a floor at lum 90.
**Correction.** Crush the surface term, then **ADD** the reflection:
`outgoingLight *= 0.11; outgoingLight += mrefl * strength * coh * fresnel;`
Dark reflected content then adds nothing and the stone stays black; a lit window adds a streak.
**Proof.** `vprobe.cjs <view> <x,y pairs>` — raycast + pixel sample. Establishing camera measured
lum 6/7/20 on non-reflecting deck, 59/86 in the city streaks.
**Regression.** Three passes at the *material* moved the pixel by ≤2 counts before the operator was
identified as the cause. If a value will not move, stop tuning and find what owns it.

## L03 — The thing you are looking at is often not the thing you think
**Failure.** Bright pale sheet across the plaza; assumed to be the black-platinum deck.
**Root owner.** Found by PEELING: hide each scene child in turn and re-measure one pixel.
`ground` only took it 159→139; `plaza-dressing` took it 159→**27**. The walking surface was
`platinumLitBrushed` (0xacbacc) — the palest material in the world was the thing every camera pointed at.
**Correction.** Added `M.paving`: same optics, near-black albedo, metalness deliberately LOW (L01).
**Proof.** `peel.cjs` (top-level children), `subpeel.cjs` (children of one group).
**Regression.** Do not infer an owner from a raycast alone — transparent/additive meshes sit in front
of what you are actually seeing. Peel, don't guess.

## L04 — A constructor literal is not the authority; a runtime hook may own the value
**Failure.** Light-pool opacity edited from 0.5 → 0.20; the render did not change at all.
**Root owner.** `ground.js` `setTime()` re-assigns `poolThemedMat.opacity = 0.5 * k` every clock tick.
The constructor literal was dead code.
**Correction.** Change the value at its runtime owner.
**Regression.** When an edit produces *zero* change, suspect a second writer before re-tuning.

## L05 — Aerial perspective: distance buys VALUE, not darkness
**Failure.** Distant objects render DARKER than nearer ones and than the sky, so depth inverts and
the world reads flat.
**Root owner.** Metal grades at distance (megatalls wore `glass` at metalness 0.55 past 520 m).
**Correction.** Distance ladders: `city.js` `glassFar`/`glassDeep`, `fobstations.js` `RECEDE` — drop
`envMapIntensity` and lerp base colour toward the horizon key with range.
**Regression.** SHIPPED THREE TIMES, most recently a 58 m landmark at 338 m out-valuing a mountain
range at 900 m. Anything newly placed far away must be checked for this before it is called done.

## L06 — A cone cannot have a round summit
**Failure.** Sawtooth horizons and spiky silhouettes.
**Root owner.** `ConeGeometry`, and `CylinderGeometry` tapering to radius 0 — a cone's tangent is
constant all the way to its point, so widening it only makes a wider cone.
**Correction.** Convex profile whose tangent turns horizontal at the summit (`terrain.js` `massif()`),
and blunt every taper onto a small flat FACET — a needle aliases into a hairline and catches no light.
**Regression.** Enforced by `tests/mahworld-crystalline-laws.test.js` (CRY-001/002/003/006).
**Caution.** The over-correction is equally forbidden: never subdivide toward a smooth ball (CRY-005).
"The silhouette is round, the surface is crystalline."

## L07 — A count is not a geometry
**Failure.** `stats.stations = 4` while four plinths stood on the deck with nothing on them.
**Root owner.** An edit dropped the one line filling the merge buckets; the counter still ran.
**Correction.** Verify by measuring the BUILT group — bounding boxes and triangle counts — never by
reading back a counter the same code incremented.
**Regression.** Applies to every worker report. A stats block is a claim, not evidence.

## L08 — Test the geometry, not elbow room
**Failure.** A placement test rejected all four valid station sites.
**Root owner.** A magic 2.6 m footprint against a real half-extent of 1.86 m.
**Correction.** DERIVE the footprint from the prototype's own bounding box, so it stays true when the
genome is retuned.
**Regression.** On a plaza, furniture legitimately stands close together. An intersection test and a
clearance test are different questions; say which one you are asking.

## L09 — A law that cries wolf is worse than no law
**Failure.** Static laws failing correct code — `'wheel'` (a DOM event for camera dolly),
`Date.now()` in `world-clock.js` (the time authority's entire job), files that merely *mention*
vehicles, a legitimately blunt crown cap flagged as a needle.
**Correction.** Key laws on ROLE and on the real mechanism (a vehicle *geometry builder*, not the
word "vehicle"); exempt short capping segments from taper rules; allow the authority module its own
domain. Negative-test every law before trusting it.
**Regression.** Five separate false positives so far across three suites. A brittle law trains the
reader to ignore failures.

## L10 — Comments must survive their own line numbers
**Failure.** A law reported `sky-structures.js:144` for something on line 215.
**Root owner.** `stripComments` collapsing block comments to nothing.
**Correction.** Replace a block comment with the same COUNT of newlines it spanned.

## L11 — Agent text substitution corrupts hex literals
**Failure.** `0x2c3purpose`, `0x2a3purpose`, `0x7territory`, `0x5b7characters` — each made a module
unparseable.
**Correction.** After any bulk edit, grep for `0x` literals that are not exactly 6 hex digits.

## L12 — Species law: the concept art is not the authority
**Failure.** Concept renders show bipedal figures; the canonical species sheet does not.
**Root owner.** Precedence. Mr. Mah / Mrs. Mah are the primary species authorities (pack §0), and the
sheet states: SINGLE CONTINUOUS FORM / WIDEST MASS AT HIPS / INTEGRATED GLUTE-HAMSTRING / ELEGANT
TAPER TO A POINT.
**Correction.** **No legs.** Build every humanoid — residents AND public art — by calling
`residents.js`, which is the species authority in code. Species compliance then holds by construction.
**Regression.** Enforced by `tests/mahworld-pack-laws.test.js` PACK-001.

## L13 — Render at the camera the world is judged at
**Failure.** The deck measured acceptable from a 5.6 m eye and was pale from the canonical 1.7 m one.
**Root owner.** Grazing angle. At 1.7 m nearly the whole visible floor is grazing; at 5.6 m it is not.
**Correction.** Measure at the real view heights in `VIEWS`, not at a convenient probe height.

## L14 — Software GL frame times are not device numbers
Only draw calls, triangles, lights and shadow-casters are device-independent under SwiftShader.
Renders also compete with build agents for CPU — a slow capture is not evidence of a slow scene.
(One capture timeout was misdiagnosed as a too-expensive mirror pass; the mirror was fine.)

## L15 — A fix behind a disabled branch renders zero pixels
**Failure.** `sky.js`'s 20 cone→massif conversions satisfied the crystalline law but changed nothing
visible: they sit behind `if (ctx.cityPresent)`, and the city is always present in the shipped path.
**Correction.** Before claiming a visual result, confirm the code path actually executes.
**Regression.** A passing law proves the generator is correct, never that the world changed.

## L16 — A shadowed variable can delete a body part in silence
**Failure.** Every MAHBEING in MAHWORLD was missing BOTH upper arms and BOTH forearms. What
remained of each arm was the shoulder cap, the elbow bead and the hand — three disconnected beads
floating where an arm should be. It had shipped in every render this project has taken.
**Root owner.** `residents.js`, in the arm loop: `const P = new Poly(), r0 = m.upperR, r1 = ...,
L = m.upperLen;` shadows the enclosing `const L = LODS[spec.lod]`. `L.armSeg` on a number is
`undefined`, `Math.max(4, undefined - 2)` is `NaN`, and `lathe()` with `NaN` segments emits ZERO
triangles. Same shadow in the forearm block via `L = m.foreLen`.
**Correction.** Rename the locals (`UL`, `FL`). Never introduce a local named `L` inside that loop.
**Proof.** The figure triangle count moves 536 → 680 per figure; the arms appear.
**Why it took so long.** At 2 m, seen from 20 m, three beads in a row read as an arm. It only became
visible when monument.js asked residents.js for the same body at 27 m. **Scale is a diagnostic:**
if a module has a size parameter, render something at the top of its range once — defects that hide
inside a few pixels do not hide inside a few hundred.
**Regression.** A `NaN` segment count fails SILENTLY — no error, no warning, an empty buffer. Any
generator taking a segment/step count should treat a non-finite one as a bug, not as zero.

## L17 — Re-grading another module's output can destroy what makes it correct
**Failure.** monument.js pushed both statues through its own LAW 1 normal splitter. LAW 1 was
satisfied and the statues rendered as faceless black-and-white zigzag.
**Root owner.** The splitter copies positions and normals only. residents.js paints the dark facial
chamber, the eyes and the energy accents as PER-VERTEX COLOUR — so the faces went with them. The
`steep` grade was also `chromeMirror` (metalness 1.0, roughness ~0), which on a ~536-triangle body
gives every facet an uncorrelated environment sample.
**Correction.** Check whether the law applies before applying it. residents.js grades itself at
metalness 0.22 / 0.50 / 0.18 — all below the ~0.9 where LAW 1 bites — so there was nothing to fix
and the correct action was to leave the module's output alone. `stats.law1.figures` now measures
the material list and reports `lawOneApplies: false` rather than asserting compliance.
**Regression.** Before re-materialising geometry you did not build, enumerate what its own materials
carry — vertex colours, emissive, maps. A grade split preserves none of it.

## L18 — A world composed from a camera set is only finished where that set can stand
**Failure.** Every named view in `VIEWS` is at 1.7–14 m eye height. Put the camera at 235 m and the
world falls apart: the whole scene collapses into one blue value band (near towers near-black, mid
city barely brighter, mountains palest — the aerial ladder is the right way round but the range is
so compressed that nothing reads as FORM), the plaza deck reads as a hard-edged dark RECTANGLE
sitting on a lighter ground plane with a visible seam, and the ground beyond it is a featureless
flat sheet with no streets on it.
**Root owner.** Not one module. It is the acceptance method: composition was judged only where a
camera was placed, so everything outside that envelope was never judged at all. §42's rear-hemisphere
failure (L-none, task #96) was the same failure in the horizontal; this is its vertical twin.
**Correction.** Judge at the extremes of every axis the viewer can move on, not at the convenient
values. When a viewer gains a new degree of freedom, the acceptance set has to gain it too.
**Proof.** `skyroads.cjs` — cameras placed from the MEASURED world-space extents of the target
geometry (`srfind.cjs` traverses the graph and prints them) rather than from guessed bearings. The
first cut of that script aimed at nothing and produced two frames of empty mountain.
**Regression.** This is now load-bearing: free roam means the viewer chooses the camera. Anything
"finished" that was only ever seen from `VIEWS` should be assumed unfinished until seen from roam.

## L19 — Aim from measured extents, not from bearings you reasoned about
**Failure.** Two render passes aimed at the sky roads produced empty sky and a wall of mountain,
costing two full captures.
**Correction.** Traverse the built scene, take the world-space bounding box of the meshes whose name
matches the target, and place the camera from those numbers. Six lines, and it cannot miss.
`city-skyroad-deck-near` measured y 54.0–138.7, x −426.5–534.1, z −326.3–−55.8: the whole network
lives in the negative-z half, which no amount of reasoning about bearing conventions had produced.
**Regression.** Same family as L03 (peel, don't guess) and L07 (a count is not a geometry). The
scene graph will answer any question about itself; asking it is always cheaper than being wrong.

## L20 — When the viewer gains a degree of freedom, the harness must gain it too
**Failure.** Roam's first acceptance run reported the camera moving 0.11 m in 1.5 s of held W, and
flying reaching 22 m instead of 219 m. Nothing was wrong with roam.
**Root owner.** Two things compounding. Under SwiftShader this page runs near 1 fps, and roam clamps
a frame to 0.1 s so a backgrounded tab cannot teleport the viewer — so 1.5 s of wall-clock key hold
is about two frames, i.e. 0.2 s of simulated motion. And `advance()`, the deterministic step the
whole evidence harness is built on, stepped every resident, cloud and beam and then called
`placeCamera(0)` ONCE — so it stepped everything in the world except the thing the viewer drives.
**Correction.** `advance()` now steps roam inside its loop, at its own fixed dt. Acceptance drives
the real key and pointer events (the input path) but the fixed-dt integrator (the motion), so the
measurement is of the movement and not of the renderer.
**Regression.** L14 said software frame times are not device numbers. This is the sharper form: a
wall-clock measurement of anything integrated per frame measures the renderer.

## L21 — A test that passes without exercising the thing is worse than no test
**Failure.** "Walking into the monument does not enter its collider" passed. The walker had spent
eight seconds marching in the opposite direction — `yaw = Math.PI` faces +z and the monument is at
z −6.5. The assertion was true and meant nothing.
**Correction.** Every negative assertion needs a positive partner that proves the subject was
reached: the test now also requires the walker to END UP at the collider's near face (z 1.5–6),
so "did not pass through" can only be satisfied by having arrived. Same shape as the earlier
`stats.stations = 4` over four empty plinths (L07).
**Regression.** Three tests in this session asserted the right thing about the wrong situation
(R03 asserted deck height at a position outside the deck; R07 measured a bound while stopped
against a collider). Before trusting a green test, ask what would have to be true for it to fail.

## L22 — Cloning `material.color` throws away the species
**Failure.** The broadcast presenter rendered as a flat white cutout with no face, at every distance.
**Root owner.** `broadcast.js` rebuilt residents.js's materials as
`new MeshBasicMaterial({ color: mm.color.clone() })`. residents.js sets `color: 0xffffff` and paints
the dark facial chamber, the two eyes and the energy accents as **per-vertex colour** — so cloning
only `color` gives every part of the body the same white.
**Correction.** Carry `vertexColors: !!mm.vertexColors`. One flag. Under additive blending the dark
chamber then adds almost nothing and stays dark, which is what a projected face should do.
**Regression.** THIRD module to lose the species this way (monument.js's LAW 1 splitter carried
positions and normals only — L17; this one carried `color` only). **When re-materialising geometry
you did not build, enumerate every channel its own material carries** — `vertexColors`, `map`,
`emissive`, `flatShading` — before deciding which to drop. A body that renders as a silhouette is
the tell.

---

## Standing ownership map (reuse, do not rediscover)

| System | Owner |
|---|---|
| Palette, all grades, `fobMark`, `chamferBox`, `softMass`, `signTexture` | `materials.js` |
| Plaza deck, diamond cells, joints, studs, light pools (`ctx.lightPool`), monument plinth | `ground.js` |
| Paths, benches, lamps, planters, bollards, colliders | `plaza-dressing.js` |
| The three destinations + interiors | `buildings.js`, `match-interior.js` |
| District blocks, megatalls, shafts, ghosts, ring decks | `city.js` |
| Mountains, land ring, valleys, reserved BASIN | `terrain.js` |
| Renderer, camera, VIEWS, lights, fog, env map, planar mirror, `look360` | `mahplaza.js` |
| Canonical MAHBEING species (the authority) | `residents.js` |
| Ambient life, LOD tiers, events | `life.js` |
| FOBEAM routes + ascent lines | `fobeam.js` |
| FOBLOCK genome (parts only, builds nothing) | `foblock.js` |
| FOBLOCK placement, music diamonds | `fobstations.js` |
| Upper realm | `sky-layout.js` (contract), `skyrealm.js` (assembly), `sky-*.js` (builders) |
| Giant rear-city authority monitor (§8) | `broadcast.js` |
| Free movement: the viewer's own camera | `roam.js` (position, gears, collide-and-slide, input state); `mahplaza.js` owns the handover |

## Standing diagnostic harness (scratchpad)

| Tool | Purpose |
|---|---|
| `q.cjs` | cheap 640×360 render, named views or numeric bearings |
| `plaza.cjs` | 1280×720 detail render |
| `vprobe.cjs` | raycast + pixel sample at a named view |
| `whatis.cjs` | object identity + material + pixel value at a bearing |
| `peel.cjs` / `subpeel.cjs` | hide scene children one at a time to find the true owner |
| `crop.cjs` | crop and magnify a region of a render |
| `sweep.cjs` | find collision-free placements across bearings × radii |
| `srfind.cjs` | traverse the built graph for a named mesh family and print its world extents |
| `tests/mahworld-roam.test.js` | 18 roam acceptance checks driven through the real page |
| `roamtour.cjs` | the walkthrough capture — 13 stations a person would stop at |
