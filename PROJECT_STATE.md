# MAHWORLD WORLD 01 — CURRENT STATE

ACTIVE PRIORITY:
P3 MONUMENT MATERIAL — the two figures still read as dark low-poly mannequins rather than polished
platinum. SPACE and VALUE have each had a measured pass; the monument's finish is now the largest
unaddressed item in the direction and the one that does not depend on anything upstream.

CURRENT BEST CHECKPOINT:
branch `claude-mahworld-phase0-control-deck`, HEAD of the SPATIAL COMPOSITION RECOVERY pass.
Evidence: scratchpad `dv/p5-*.png` (before) against `dv/p6-*.png` (after), same fixed cameras.

## THE INSTRUMENT THAT MADE THIS PASS POSSIBLE

`scratchpad/coverage.cjs` raycasts a dense grid through a suite camera and reports SCREEN COVERAGE
PER OWNING MODULE plus a depth-band histogram. Every de-clutter pass before this one picked its
targets by eye, which is how a pass removes whatever is easiest to find rather than whatever is
actually eating the frame. Ranked coverage changes that: it named the sky as closed, ranked three
lamp masts above MAH MATCH, and cleared the monument of a charge it did not deserve.

USE IT BEFORE REMOVING ANYTHING. A screenshot cannot tell you that eleven poles are 4 % of a frame.

## MASTERED

- Ground VALUE is correct everywhere: plaza plane, 126–620 m ring and land all read as dark platinum
  with a grazing sheen driven by the clock's own horizon key. No pale sheet.
- One floor across the whole grounded map: deck (260 m) + city ring (126–620 m) + land (600–2600 m),
  one diamond lattice at one scale, no seams. No planar reflection; metal reads as a value RANGE
  (base 0.075, grazing 0.62, fresnel^5).
- Sun and moon reflect on every ground surface as an analytic glitter path that tracks the clock and
  hands over between bodies by colour, to 2600 m. Laws R3-08-A..D.
- ASCENT lines ranked: one hero (north, 1.30), two secondary (0.62 / 0.52). Laws R3-06-F..H.
- The ascent car is an elevator: cut aperture, two hinged leaves, lined and lit cabin. R3-06-I..L.
- City is 8 blocks (from 15). Every block that stacked behind another, or closed the forward view,
  is gone; all four id-keyed tables (MASSING/GESTURE/DECK/glazedIds) stay in sync.
- MAH MATCH's tower turns on a real plan radius (roundPrism), with cross-core armour ribs on the
  cardinal axes and a per-section light channel that rides the taper instead of floating off it.
- THE SKY IS OPEN (this pass). See below.

## THIS PASS — WHAT WAS REMOVED OR MOVED, AND WHAT IT BOUGHT

Measured on `plaza-hero`, 1936 rays, before → after:

| owner                      | before | after | note                                        |
|----------------------------|--------|-------|---------------------------------------------|
| sky (open air visible)     |  5.6 % | 10.2 %| **+82 % more visible sky**                  |
| diamond-clouds             | 14.2 % | 11.8 %| decks narrowed, gaps opened                 |
| fobstations (music masts)  |  4.7 % |  0.1 %| relocated out of the arrival cone           |
| plaza-dressing             |  4.4 % |  3.4 %| 16 lamp masts → 8                           |
| city / GYM / MARKET / links| 16.8 % | 18.4 %| distance REVEALED where clutter had been    |
| depth band 0–30 m          | 38.1 % | 33.7 %| foreground thinned                          |
| depth band 600 m+          | 15.2 % | 17.7 %| far layer opened                            |

REMOVED — eight lamp masts (`plaza-dressing.js` MASTS, 16 → 8). The existing rule kept posts out of
the central band but never guarded DISTANCE FROM THE CAMERA, so the z 32 and z 24 pairs stood 14 and
22 m off the arrival lens and read as columns up the full height of frame. Those two rows went, plus
the two positions that merely doubled a neighbour. Instanced with painted pools, not real lights, so
the plaza lost no illumination — only the repetition.

MOVED — three MUSIC square-diamonds (`fobstations.js` MUSIC), r 39–41 → r 70–76, azimuths swung into
the flanks and rear. They were 3.9 % of the arrival frame — more than MAH MATCH, MAH GYM or the
monument's figures each own — because deg 185 / r 40.5 put a 5.4 m mast 5.5 m in front of the lens.
They are infrastructure, so all three survive at full size and function; they only left the corridor.

NARROWED — all three cloud decks (`clouds.js` LAYOUT), plus low deck 5 masses → 4. A mass of width W
at radius r subtends 2·atan(W·QSCALE/2 / r) and only leaves sky if that is smaller than the spacing
between adjacent azimuths. Shipped values: low ~60° wide at ~35° spacing (1.7× overlap, a solid
lid), mid 48° at 38°, high 39° at 39°. All three decks were closed. Now ~30° of cloud against 38–46°
of spacing. Altitudes and radii untouched — they were settled against the skyline.

NOTHING WAS ADDED BACK.

## THIS PASS — P2 VALUE, THE SHAFTS THAT READ AS CUT-OUTS

`scratchpad/darkbars.cjs` reads the FRAMEBUFFER (not a screenshot), finds the columns whose mean
luminance sits under the frame's own median, and raycasts the middle of each dark run. It named the
three darkest verticals in `dome-vastness` as `city-shaft-band-1/2/3` at 521, 528 and 783 m,
luminance **59 against a frame median of 75**.

They are NOT black — the eye reads them as black and is wrong by a factor of three, which is exactly
why this needed a framebuffer read rather than a look. What they are is 0.79 of the sky they stand
in front of, hard-edged and full height: the cut-out defect city.js's own §12 note describes, which
was fixed for the TOWERS (glassFar / glassDeep: metalness falls with range, colour climbs toward the
horizon key) and never applied to the SHAFTS. The shaft ladder ran the other way — metalness a flat
0.88 through all four bands, colour DARKENING with altitude — on a sound argument about the night
zenith that simply missed that a shaft's higher segments are also its farther ones (this file puts a
600 m shaft's foot at 265 m and its top at 655 m). Two ladders for one law is the L42 failure.

Fixed: metalness 0.85 → 0.30 across the four bands, colour climbing gently toward the horizon key.
Result: object dark bars 54 → 28 columns of 1280 (−48 %); bands 2 and 3 left the dark list entirely.
Nothing over-lightened; no form pops out of the sky.

## SIGHTLINES THAT IMPROVED

- `plaza-hero` — the pole that crossed the left of frame is gone; stars and open sky read to the
  right of the moon where a continuous cloud smear used to sit; MAH MARKET and the west blocks now
  separate from each other with air between them.
- `dome-vastness` — sky is 41.0 % of the frame and the cloud smears have broken into discrete masses.
- `long-sightline` / `building-away` — unchanged, as expected: neither faces the objects that moved.

## CURRENT DEFECTS (ranked by measured frame cost)

1. ~~P2 VALUE — the shafts.~~ **DONE this pass.** See below; band 1 at 520 m is the one that
   remains, at 0.80 of sky value. Worth a second look only if a later frame still shows it.
2. §23 COLOUR — the city still carries WARM window light (city.js WARM table, NEUTRALS.interior
   0xffeccd, spillWarmM), which the master file names as a strict exclusion. Visible directly on
   MAH MATCH's facade in `match-anchor`. Unresolved conflict, and it is now a rendered fact rather
   than a code reading.
3. §6/§7 MONUMENT — the directive asks for reduced screen dominance and for the figures to stop
   reading as dark low-poly mannequins. THE FIRST HALF IS NOT SUPPORTED BY MEASUREMENT: the monument
   owns 5.3 % of `plaza-hero` — less than the clouds, the fobeams, the city or the ground — and it
   was 5.3 % before this pass and 5.3 % after. It is not what blocks the city. What made it FEEL
   dominant is that it had no open sky to sit against and no value separation from the district
   behind it, which is defects 1 and 2. Do not shrink the hero landmark until those are fixed and
   the frame is re-judged; the second half (material recovery — polished platinum, liquid silver,
   broad bright highlight bands) is real and independent and should be done regardless.
4. §22 FLOOR TEXT — plaza wordmark legibility at shallow angle still unverified.
5. FLOOR SEAM NOISE (directive 6) — `long-sightline` shows heavy repeated small panel lines and a
   scatter of small pale objects across the deck. Not yet measured; measure before cutting.
6. §26 DOME — still reads more as a ceiling than a shell, but defect 1 is upstream of it.

## LOCKED / DO NOT REGRESS

- Renderer: vendored three r185, ES modules, no bundler, no addons, no image files (procedural only).
- LAW 1: metals at metalness ≥ ~0.9 take no diffuse; horizontal faces need a lit grade.
- §06: square diamonds WIDER THAN TALL; the brand figure keeps its points.
- L42: one truth, one source. No second table describing the same thing.
- Determinism: golden ratio / golden angle, never Math.random.
- The fixed camera suite lives in `mahworld/diagnostic-views.json` and nowhere else. Thirteen views.
- MAHWORLD world work stays on `claude-mahworld-phase0-control-deck`, separate from Astra's
  canonical mrmah3d character work on `claude/mrmah-3d-renderer-poc-1nyunz`.
- The planar mirror is retired behind one `return null` and must not be re-enabled without direction.
- Never push MAHFITT source publicly; no deployment/visibility changes without explicit authorization.

## NEXT ACTION

P3 MONUMENT MATERIAL, and ONLY the material. The direction: "the two central figures must stop
reading as dark low-poly mannequins — move them toward polished platinum, liquid silver, deep
graphite reflections, broad bright silver highlight bands, controlled roughness. Preserve their
canonical geometry. Bright enough to read against the city but not glowing like emissive objects."

`monument.js` currently clones only `/-body$/` materials through `statueGradeOf()` and moves
roughness / metalness / envMapIntensity across from `M.platinumLit`, leaving colour as white ×
vertex colours. Start by MEASURING what the figures actually render at — `darkbars.cjs`'s framebuffer
read against the `monument-close` and `monument-34` cameras, compared with the plinth's own platinum
nosings in the same frame, which are the reference value the figures should be near. Judge on
`monument-close` + `monument-34`. Do not touch scale (see the negative result below), the floor, or
the city in the same pass.

## NEGATIVE RESULTS (do not re-test)

- Fog is NOT what washes the ground pale. Switching `scene.fog` off at runtime left the floor exactly
  as bright. The cause was a uniform's DEFAULT value.
- The monument is NOT what blocks the city from the arrival camera. Measured at 5.3 % of the frame,
  behind it on the axis there is only MAH MATCH and then open ground; every city block sits at
  |x| ≥ 62. Shrinking it would cost the hero landmark and buy about two per cent of frame.

## LEARNED RULES

- A uniform's default is live code. Uniforms are created at a material's FIRST COMPILE, on the first
  render — after the clock has run — so anything written "every tick" does not own the value until
  the tick after compile. Seed from real state at patch time.
- `onBeforeCompile` is ONE slot. Every patch must chain `prev` or it silently deletes another
  module's shader.
- A patch that MATCHES is not a patch that has an EFFECT. `applied` flags prove a `String.replace`
  found its anchor, nothing more.
- **A landmark with no diagnostic camera cannot be corrected.** Three suite views rendered with
  byte-identical triangle counts across a full rebuild of MAH MATCH's tower, because the tallest
  thing in the district was not visible from any camera in the suite.
- **A "before" needs the same CLOCK, not just the same camera.** `views.cjs` advanced world time
  0.4 s per view, so a frame shot sixth in a batch saw a different sky from the same frame shot
  first — and a before/after pair taken that way appeared to swing the whole image toward violet,
  which no material edit in that pass could have caused. The runner now re-stamps the time before
  every screenshot. A shared camera table is necessary and was never sufficient.
- **Read the framebuffer, not a screenshot, and render synchronously first.** The renderer runs
  without `preserveDrawingBuffer`, so a `drawImage` from the canvas after a yield returns a sheet of
  zeros. The first run of `darkbars.cjs` duly reported median luminance 0, no dark bars, no defect —
  believable-looking output from a broken read. It was only caught because zero is impossible.
- **The eye over-reads hard edges.** The shafts that looked pure black measured 59 against a sky
  median of 75 — 0.79, not 0.0. They read as black because they were the only hard-edged dark
  verticals in a soft frame. Fix the contrast that is actually there, not the one that is perceived.
- **Rank the frame before you cut it.** Coverage is not intuition: the objects that felt biggest in
  `plaza-hero` (the monument, the statues) were 5.3 %, and the objects that felt incidental (three
  music masts) were 3.9 % — with one of them five metres from the lens.
