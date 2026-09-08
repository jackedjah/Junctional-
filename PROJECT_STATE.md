# MAHWORLD WORLD 01 — CURRENT STATE

ACTIVE PRIORITY:
P2 VALUE — the black shafts. Spacing has now had a measured pass and the next spaciousness gain is
smaller than the value gain: roughly ten pure-black vertical bars slice the sky in `dome-vastness`
and `high-overview`, and a world read through a picket fence cannot read as an open shell no matter
how much air is opened behind it.

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

## SIGHTLINES THAT IMPROVED

- `plaza-hero` — the pole that crossed the left of frame is gone; stars and open sky read to the
  right of the moon where a continuous cloud smear used to sit; MAH MARKET and the west blocks now
  separate from each other with air between them.
- `dome-vastness` — sky is 41.0 % of the frame and the cloud smears have broken into discrete masses.
- `long-sightline` / `building-away` — unchanged, as expected: neither faces the objects that moved.

## CURRENT DEFECTS (ranked by measured frame cost)

1. **P2 VALUE — the black shafts.** `city-shaft-band-0/1/2` plus `city-towers-A-graphite` = 6.3 % of
   `dome-vastness`, rendered as pure black bars floor-to-frame-top. This is LAW 1 arithmetic: a
   metal shaft under a near-black zenith returns near-black. It destroys depth separation (every bar
   is the same value at every distance), it cages the dome, and it is the reason the world still
   reads compressed after the air was opened. THIS IS THE NEXT ACTION.
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

P2 VALUE. Open `city.js`, find the material behind `city-shaft-band-0/1/2` and
`city-towers-A-graphite`, and give the megatall shafts a value that RISES WITH DISTANCE — the same
aerial-perspective ladder `glassFar`/`glassDeep` and fobstations' RECEDE table already encode, which
these bands evidently never joined. Judge on `dome-vastness` and `high-overview` only. Do not touch
the monument, the floor or the clouds in the same pass.

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
- **Rank the frame before you cut it.** Coverage is not intuition: the objects that felt biggest in
  `plaza-hero` (the monument, the statues) were 5.3 %, and the objects that felt incidental (three
  music masts) were 3.9 % — with one of them five metres from the lens.
