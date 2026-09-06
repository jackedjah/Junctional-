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

## L23 — "Miniature" is relative to what it sits on, not to a hand
**Failure.** The universal music-line motif was built at 1.35 m at a FOBEAM node and 0.9 m on a
launch pad, reasoning from the word "miniature" in the law. At 25 m the seven bars were a smudge; at
80 m from the plaza deck they were nothing at all.
**Correction.** Size from the VIEWING DISTANCE and from the host mass. 4.2 m at a node 30–130 m up
is still 3% of its tower and reads from the deck; 1.6 m on a pad is chest height to the walker
standing next to it, which is where the motif has to survive inspection.
**Regression.** Any element specified with a relative word — miniature, subtle, sparse, low — has to
be turned into a number against a measured distance before it is built, or the word does the sizing.

## L24 — Freeze the contract, not the implementation
**Reusable recipe, not a failure.** R2 §10 requires the music-line motif to accept real audio later
**without changing its geometry contract**. The way that was made true: the field is
`N_SITES × BARS` instanced quads whose footprint, base and maximum height are FIXED, and the only
thing that ever varies is one `Float32Array` of levels in [0,1]. Idle animation, audio, LOD and
state cross-fades are all just functions that fill that array, so `setLevels()` is the entire audio
surface and there is no second code path to write when Apple Music arrives. One `InstancedMesh` per
family — measured at 10 sites × 7 bars = 70 instances in **1 draw call, 140 triangles**.
**Proof that the surface is real, not asserted:** feeding `[0.95,0.2,0.85,0.35,...]` moved bar 3's
`scale.y` to 1.4700, which is exactly band 3 (0.35) × the site scale (4.2). The number confirms the
audio path drives geometry; a screenshot could not have.

## L25 — A mass occupies an ARC, not a bearing
**Failure.** Lake City had to stand in a mountain pass, so terrain.js was given a PASS wedge and every
peak whose BEARING fell inside it was pushed to the shoulder. The render did not change. Second
attempt, same lever, same result.
**Root owner.** A massif is 180–650 m wide. One pushed to bearing 45.5 at r 700 still spans to 59
degrees, so a 47–77 pass was half full of the mountain that had just been moved out of it. Moving a
centre out of a wedge does not move the body out of it.
**Correction.** Push by the massif's own ARC: `halfDeg = (w/2)/r × 180/π`, and clear the wedge by
that much plus a margin, so a wide peak is displaced further than a narrow one.
**Proof.** PEELING found it, not reasoning (L03): hiding `terrain-land` changed nothing; hiding the
three `terrain-range-*` meshes revealed the whole city, lake, terraces, docks and bridges intact
behind them. The city had been correct the entire time and was simply behind a mountain.
**Still unresolved, stated plainly.** Even by arc, the ring at bearing 62 partly occludes the city
from some altitudes. Two attempts at the same lever is the §15 threshold and the method should
change rather than the constant: either site the city where terrain genuinely has no ring (the only
true gaps are bearings 176–184 and 356–4), or give terrain.js a real cut rather than a push.

## L26 — Verify a placement by peeling BEFORE tuning what you placed
**Failure.** Two passes were spent on the lake's water material — base value, emissive, an additive
sheen, a shoreline rim — to make a lake "read", while the lake was not visible at all because a
mountain stood in front of it. The material work was not wrong, but none of it could have been
judged from those frames.
**Correction.** When a new object does not read, establish that it is UNOCCLUDED before touching its
material. One peel costs one render; a material iteration costs a render and a wrong belief.
**Regression.** Same family as L03 and L15: prove the pixels can reach the camera before reasoning
about what colour they are.

## L27 — The black floor is a WORLD law, not a plaza law
**Director lock, §07, restated because it was nearly lost.** The walking surface of MAHWORLD is
near-black and reflective EVERYWHERE, not only on the civic deck. When Lake City was built its
horizontal grades took `platinumMidLit` and `graphiteLight` — pale, correct for LAW 1, wrong for the
world. They now take `M.paving`, the grade L03 produced: near-black albedo with metalness kept
deliberately LOW at 0.40, so it is simultaneously the black floor AND the LAW 1 partner that keeps
an up-facing face taking diffuse light instead of returning the near-black zenith.
**The distance recede is the trap.** Aerial perspective lerps a colour toward the horizon key by
0.34 (L05), which is right for a mass and would deliver a black floor as mid blue. The floors take a
much smaller mix (0.10) and get their value from the REFLECTION instead — the vertical grades keep
the full recede, because those are the masses aerial perspective is actually about.
**Regression.** Any new surface a viewer stands on inherits §07 by default. Ask "is this a floor?"
before choosing its grade, not after rendering it pale.

## L28 — Measure the wedge, then measure it again
**Failure.** Clearing terrain's mountain pass by ARC (L25) was the right idea and still left the
pass full: measured on the built scene, 3.0–3.3 % of every range's vertices were inside it, the near
range reaching r 381 with 189 m of peak — enough to stand between the plaza and the lake.
**Root owner.** `massif()` does not build a cylinder of width `w`. It flares an apron, throws spurs
down its flanks, and is then yawed by a random angle, so its real footprint is materially wider than
`w/2`. The arc was computed from the nominal width.
**Correction.** A FOOT factor of 1.55 and a 5° pad, both taken from the overshoot the measurement
reported rather than guessed. Re-measured after: near 189 m → **19 m** in the pass, mid 249 → 51,
far 296 → 110, and the pass renders open.
**Regression.** A geometric clearance derived from a nominal parameter is a hypothesis. Measure the
built result, adjust from the measured overshoot, measure again — two cheap probes beat four
renders, and the second measurement is the one that makes it evidence.

## L29 — One LAW 1 bucket per orientation is not enough; roles carry the design
**Failure.** Rainforest City sent every up-facing face to the black paving grade. LAW 1 was satisfied
and the design was destroyed: the PLATINUM GROWTH BANDS — the part this world uses to make the whole
family read, from a MAHNIMAL's carapace to a FOBLOCK's belt to a tree's joint — are up-facing, so
they came out BLACK and every organism rendered as a dark post with dark belts.
**Correction.** Split by ROLE as well as orientation, exactly as monument.js and lakecity.js do:
`organism` up-faces take `platinumLit`, `floor` faces take `paving`. The floor is black because §07
says the floor is black; a band is not a floor.
**Regression.** Orientation answers "will this render black?". It does not answer "what is this?".
Any module with more than one kind of surface needs both axes.

## L30 — A slice from two index() calls can be EMPTY, and an empty needle replaces everywhere
**Failure.** `s.replace(s[s.index(a):s.index(b)], new)` inflated `rainforest.js` from 27 KB to
**48 MB**. When the anchors are in the wrong order the slice is `''`, and Python's `str.replace('')`
inserts the replacement between every character of the file.
**Recovery.** Exactly reversible, and worth knowing: the corrupted file is
`new.join(original_characters)`, so `corrupt.replace(new, '')` returns the original byte for byte.
27,797 bytes came back and parsed first try.
**Correction.** Never build a replacement target from two searched indices without asserting the
result: `assert len(old) > 200` and `assert marker in old`. Better, address by LINE RANGE and check
both ends. Best, commit a new file before restructuring it — this one was uncommitted, and only the
reversibility of the corruption saved a rewrite.

## L31 — A part authored for one body shape is a sliver on another
**Failure.** 30 MAHNIMAL swimmers rendered as nothing on the lake.
**Root owner.** The MAHGIC vein — the one bright part of an otherwise dark animal — was scaled
`F.h * 0.94` because it was authored on the DRIFTER, which is tall. A swimmer is FLAT (h 0.22) and
LONG (d 0.86), so its vein was a sliver, and on pitch-black water a dark animal with no bright part
is not there.
**Correction.** Scale the vein on the body's DOMINANT axis, whichever that is. The swimmer then gets
a bright line down its length, which is also the better read — a wake runs the way the animal goes.
**Regression.** Any shared part in a family of differently-proportioned bodies has to be defined
against a measured property of the body, never against whichever axis was longest on the first one.

## L32 — A black mirror cannot show what is under it
**Failure.** Swimmers were placed 1.6 m BELOW the waterline, beneath an opaque plane. Invisible.
**Correction.** They ride the line instead, backs just proud, with a shallow bob. A black mirror
shows what BREAKS it, not what is beneath it. Making the water translucent to reveal them was the
other option and it is the wrong one — §07 asks for pitch black, and a lake you can see into is not
a mirror.

## L33 — Playwright's actionability waits starve on a scene that never idles
**Failure.** The 18-check roam suite began timing out on `boundingBox()`, then on `click()`, then on
`screenshot()` — after the world grew to three cities and ~700k triangles.
**Root owner.** Not roam. The page's rAF loop never goes idle, and Playwright's actionability waits
need the page to settle.
**Correction.** Measure with `getBoundingClientRect` through `evaluate`, dispatch clicks with
`element.click()`, and give screenshots a long explicit timeout. All three still exercise the real
listeners — the input path is what the checks are about, not Playwright's waiting.
**Regression.** A test that starts failing when the SCENE grows is measuring the harness. Ask what
changed before believing the feature broke. (Suite back to 18/18.)

---

## L34 — The fog bank must sit beyond the last thing worth seeing
**Failure.** Every render sent for weeks came back value-compressed: the mountains, the mid city and
the far ring all resolved to one flat blue and no frame had depth in it. I had been treating this as
a lighting problem.
**Root owner.** `mahplaza.js`, one number. Linear fog reached 100% at 880 m. `terrain.js` authors
THREE deliberately-separated ranges — near (r 620), mid (r 1050, base `0x172440` / ridge `0x51648f`)
and far (r 1500, base `0x2b3f66` / ridge `0x7a8fb8`), each lighter than the one in front of it. That
ladder *is* the world's depth cue, painted into the vertex colours, and the bank was deleting two
thirds of it before it reached the frame. The camera frustum was also 2000 m, so from anywhere out
at a peer city the far ring was clipped as well.
**Correction.** Fog far 880 → 2350 (+700 by day); frustum 2000 → 2600.
**The measurement lesson, which cost more than the fix.** I built a five-band mean-luminance probe
and it reported the spread going 17.9 → 21.4 — a 20% move that would not have justified the change
on its own. The render showed a transformation. **A band mean is the wrong statistic for a value
ladder**: averaging a horizontal strip mixes sky, ridge and city, and a ladder is about which
SURFACES separate, not how bright a row of pixels is. When a number and an image disagree about a
composition, the image is the thing being judged.

---

## L35 — `MeshBasicMaterial` has no solids in it
**Failure.** The rainforest canopy — ~700 square-diamond nodes, the whole identity of the biome —
rendered as flat white squares of paper stapled to sticks.
**Root owner.** `rainforest.js`. The node material was `MeshBasicMaterial`, which is unlit by
definition: every node returned its flat `instanceColor` with no shading of any kind.
**Correction.** The same platinum the growth bands use, `flatShading` on, `vertexColors` false
(the geometry carries no colour attribute; `instanceColor` is a separate define and still applies).
LAW 1 then does the work for free — a faceted leaf turns four ways to the horizon and comes back
four values.
**Regression.** Reach for `MeshBasic` only for things that emit (veins, rain aura, sign faces).
Anything meant to read as a SOLID takes a standard material or it has no form.

---

## L36 — A canopy overhead is not a forest; a forest is what you cannot see through
**Failure.** Standing inside the rainforest, it read as a plantation: bare stems ~50 m apart with
open sky between them to the horizon.
**Root owner.** Nothing was wrong with the canopy. 26 organisms 118–168 m tall put every leaf 120 m
above a walker's head, and in plan their crowns overlap — so from the plaza at 700 m the ceiling was
correctly massed, and that is the only place it had ever been judged from. The 0–60 m band the
viewer actually occupies had nothing in it at all.
**Correction.** 58 shorter organisms of the same genome on an offset spiral, one low tier of arms
each, occupying 17–54 m.
**Regression.** Every biome authored as scenery has to be re-judged the moment roam lets someone
stand in it. The defect will not be in the part you designed; it will be in the band you never
framed.

---

## L37 — The angle you measure a mirror from decides what you see
**Failure.** The forest floor was a sheet of milk across the bottom third of every eye-level frame —
§07's black floor, inverted.
**Root owner.** `rainforest.js` inherited the plaza's polished paving (metalness 0.40, roughness
0.34). On the plaza that is right: a 90 m deck, broken into tiles with dark joints, with the
reflection group putting the city back into it. The forest floor is ONE unbroken 328 m disc, and
from a 1.70 m eye the far 250 m of it sit at grazing incidence where Fresnel goes to 1 and a smooth
surface returns the entire bright horizon.
**The measurement I got wrong first.** I probed it from 34 m LOOKING DOWN, measured 20/255, and
recorded it as black. It is black from there. **A floor must be measured from the height it is
walked at**, because a mirror's brightness is a function of the angle you meet it at, not a
property of the material.
**Correction.** Roughness 0.74 / metalness 0.26 on the forest grade only — scatter the grazing lobe.
The plaza keeps its polish; a forest floor was never meant to have any.

---

## L38 — Scatter density is per square metre, not per scene
**Failure.** A ground layer of 340 growths over a 308 m disc rendered and read as *nothing*.
**Root owner.** Arithmetic. 308 m radius is 298,000 m² — one object every 30 m — so a 30 m near
field contained THREE of them. The layer existed and was invisible.
**Correction.** 3000 growths + 3500 litter (one every ~10 m), sized 1–4 m so they still read at the
60–120 m where most of the visible floor actually is. 6500 instances, two draws, 52k triangles.
**Second failure inside the same fix.** At 1.5–3.0× height the growths rendered as a row of teeth
along the sight line — §06's cone failure arriving at a third scale, after floor shards (#101) and
flora tips (#105). Squatting them to 0.42–0.88× height fixed it.
**Regression.** Quote scatter density in objects per square metre before writing the count, and
check any new scattered family for the needle silhouette before rendering it — this world has now
grown spikes three times in three different modules.

---

## L39 — A face big enough to walk up to needs something on it
**Failure.** The nearest rainforest trunk filled a quarter of the eye-level frame with a single flat
quad returning a single value. Not dark, not wrong — blank.
**Root owner.** Economy that was correct at the distance it was authored for. From the plaza these
stems are 4 px wide and a smooth chamfered box is the right call; at 30 m one face is 17 × 20 m of
featureless plane, and 700 m of aerial perspective had been hiding it.
**Correction.** Eight proud vertical ribs per trunk segment, baked into the same merge — three
values per segment (face, rib flank, rib front) instead of one, and they read as growth along the
stem rather than as panelling. Zero extra draws.
**Regression.** Any surface a viewer can now walk up to needs detail sized for that distance. The
question to ask of every large flat face is not "is its value right" but "how many values does it
give me from two metres away".

---

## L40 — A fix to a shared module's CALLER has to be walked to every other caller
**Failure.** Lake City's swimmers shipped at scale 3.4, rendered as nothing on a 550 m lake, and I
raised them to 9.5 and wrote the lesson down. The rainforest's fauna stayed at 2.6 and 2.1 — a 1.4 m
grazer on a floor whose fallen litter is 5 m across, under trees 168 m tall. Invisible for the same
reason, in the same week, from the same shared module.
**Correction.** Drifters 7.5, grazers 7.0, and the canopy drifters dropped 44 m so something is
close enough to give them scale.
**Regression.** `mahnimals.js` was not wrong either time; both defects were in the SPEC a caller
passed. When a bug turns out to live in how a shared module is called, grep every other call site
the same day — the lesson is only half-learned until they all agree.

---

## L41 — A form that dissolves into the fog stops dissolving when the fog moves
**Failure.** L34 pushed night fog far from 880 m to 2350 m. `city.js`'s eight ghost shafts at
650–860 m — authored to be four-fifths obscured at the foot and gone entirely at the top — snapped
into focus as hard black bars, darker than the sky behind them, and became the most graphic thing in
the wide frame.
**Root owner.** The ghosts, not the fog. They outsourced their own dissolve to an atmosphere setting
owned by another module, and the comment above them still quoted the old numbers as a design premise.
**Correction.** `transparent: true, opacity: 0.30, depthWrite: false`. However the fog is tuned, a
ghost is now always mostly whatever is behind it.
**Regression.** An effect that depends on another module's constant is a latent break. Either read
that constant at build time or achieve the effect at the material.

---

## L42 — The backdrop has to be told when the world grows a city where it was standing
**Failure.** A 90 × 320 m unlit slab filled a quarter of the rainforest's eye-level frame. I assumed
it was a mountain, then a trunk; peeling scene children named the owner as `city.js`.
**Root owner.** `city.js`'s distant layer was composed when there was one city and the whole ring
past 600 m was empty backdrop to arrange. Lake City (62°/700) and Rainforest City (127°/700) then
landed inside it and nobody told that file. Measured: **five** distant forms standing in a
destination — the slab at 128° dead centre in the rainforest, the 330 m colossal tapered form and
the suspended pylon ring both inside the lake, plus a ghost in each. From the plaza every one of
them was invisibly correct, backdrop behind backdrop.
**Correction.** A `SITES` keep-out table and `clearOfSites(a, r, half)` that swings an offending
bearing outward in 3° steps, alternating sides, smallest move first. Nothing is dropped — a hole in
the far skyline would be its own defect. Every distant placement now goes through it.
**Regression.** This is `terrain.js`'s PASSES table read from the other side. When a new site is
added to the world at radius R, every module that places anything near R has to be re-checked —
placement conflicts are silent from the camera the older module was composed for, and only appear
once someone can stand in the newer one.

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
| Inter-city flight (R2 §9) — writes roam's camera, never its own | `travel.js` |
| RAINFOREST CITY (R2 §6) — the third destination, organisms + diamond-shard rain | `rainforest.js` |
| MAHNIMALS — the world's small fauna, land / air / water | `mahnimals.js` |
| LAKE CITY (R2 §5) — the second destination | `lakecity.js`; its mountain pass is `terrain.js` PASS |
| Universal music-line motif (R2 §10/§11) — built ONCE, nothing else may hand-roll a bar graph | `musicline.js` |
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
