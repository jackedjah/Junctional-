# MAHWORLD R4 — MAH HALO SANCTUARY

The governing document for R4, continuing from `MAHWORLD_R3_MASTER_IMPLEMENTATION_SPEC.md`. R4 is
**additive**: R3, R2 and every world law before them stand.

---

## THE CANON

MAH HALO is an enormous upper sanctuary — a grid/shell that **appears locally flat but reveals
gradual world-scale curvature at immense distance** — supporting roughly half of ordinary
non-combat gameplay. MAH ASCENT physically docks into HALO ARRIVAL. HALO stays distinct from the
deeper cloud Sky Realm.

The supplied laser references contribute **grid precision, luminous-line behaviour, modular
event-floor behaviour and curvature perception ONLY**. Their red/rainbow palettes are not inherited:
MAHWORLD's platinum / dark-crystal / square-diamond / MAHGIC language governs.

---

## THE GEOMETRY, DECIDED BY ARITHMETIC BEFORE ANY CODE

**A RING, not a disc.** A disc puts a ceiling over MAHWORLD's night sky, and the sky is authored —
dome, stars, galaxy, moon (L43). The ring keeps the hole open over MAHPLAZA, which is also what
makes the downward views possible.

| | | why |
|---|---|---|
| `Y` | 1800 | clears `city.js`'s 900 m ghosts by 930 m |
| `R_IN` | 700 | the hole; MAHPLAZA keeps its sky |
| `R_OUT` | 3400 | |
| `R_MID` | 2050 | the flat midline the ring is walked along |
| `R_DISH` | 23000 | the cross-section's radius of curvature |
| `APRON` | 34 | the lip past each rim — an analytic guard rail |
| `THICK` | 16 | a world layer has mass |

One pure function is the **only** definition of where the halo is, and roam, the districts and the
law suite all read it:

```
haloHeight(x, z) = 1800 + (hypot(x,z) - 2050)^2 / 46000
haloFloor(x, z)  = onHalo(x,z) ? haloHeight(x,z) : null
```

`null` off the ring is what keeps the hole open over the plaza and the sky open past the outer rim.

**The curvature ladder this produces**, which is R4's central claim made measurable:

| distance | deviation | reads as |
|---|---|---|
| 50 m | 0.15 m | flat |
| 150 m | 1.37 m | flat |
| 300 m | 5.49 m | a very slight dish |
| 1000 m | 60.67 m | curved |
| 3000 m | 524.73 m | a world |

Worst walkable grade **5.87%** at the rims, flat at the midline. The rim rise doubles as the guard
rail, so no collision geometry is needed to keep a walker on.

---

## THE EIGHT DISTRICTS

`ARRIVAL -90° · COMMONS -45° · PULSE 0° · TABLE 45° · PLAY 90° · QUIET 135° · FORUM 180° ·
STAGE -135°`. Names may refine; functions are locked. Separated by R4's own order — silhouette,
roughness, transmission, depth, motion, shadow, scale — **before** hue. No district gets a colour.

**PEACEFULNESS is a constraint with teeth.** No hostile spawns, no ambient attacks, no boss
encounters in ordinary districts. `stats.hostiles === 0` is declared and asserted, not intended.

---

## THE ARRIVAL CHAIN

```
ground pad → cloud aperture 566 → TRANSFER decks 700 → pier 1836 → concourse spine → gateway → ring
```

The `mahascent` decks are demoted from destination to **transfer**, which is what R4 means by
"replace the tiny top-platform feeling". Beams land at the **inner rim** (r 760): a 730 m run
against a 1136 m climb, **32.7° off vertical** — a cable-car angle. The 1220 m between pier and
district is crossed by an authored **CONCOURSE SPINE**, 13 bays of dark channel with platinum kerbs,
paired masts, seating and a glazed view cut at the halfway point.

---

## THE MATERIAL LAW AT THREE SCALES (L51)

§07 — *every walking surface is near-black and reflective* — was measured on a 43 m plaza. Applied
unchanged to a 2700 m plate it deletes itself: at grazing incidence a polished plane returns the
horizon, so the first standing render came back a sheet of milk. The law survives as a **ladder**:

| surface | span | roughness | envMapIntensity |
|---|---|---|---|
| plaza hero / satin | 43 m | 0.045 / 0.13 | (unchanged) |
| halo near tiles (follow the viewer) | 208 m | 0.20 | 1.15 |
| district decks | 60–150 m | 0.52 | 0.45 |
| the shell | 2700 m | 0.78 | 0.22 |

And the vocabulary rule that goes with it: **platinum is for verticals and edges; every horizontal
you stand on is dark.** A vertex-colour "value" cannot fix a grazing whiteout — it multiplies the
base colour, and the whiteout is the environment reflection.

---

## THE FOUR-SCALE GRID (L52)

`MICRO 1 m → TILE 8 m → MEGA 64 m → SECTOR (polar)`. Every scale fades except the last, and the
last is in the coordinate system the object is actually organised in: **16 spokes** and a band every
**300 m of radius**. Spokes sit at half-sector bearings so no joint runs down a district's
concourse. Anti-shimmer is `fwidth` in the fragment shader, so a cell that shrinks below a pixel
fades rather than aliasing.

---

## THE SECTOR ARCHITECTURE (L53)

Sixteen joints, each a raised platinum rail across the full 2700 m width with a dark recessed
shoulder, each carrying **four pylons** at r 980 / 1520 / 2680 / 3220 — radial stations chosen to
miss the district band (1966–2134). 64 pylons, one every 805 m along the midline. Heights grow with
radius (34 → 78 m) because the outer ones are read from three kilometres. All of it merges into the
rim's existing draw.

---

## LIVE STATE

**Built and wired.** `halo.js` (surface contract, laser-plate shader, shell, underside, rims,
sector architecture, viewer-following tile field) · `halo-districts.js` (eight districts, ascent
pier, concourse spine, overlooks, event tiles, the ring's own light pools) · `roam.js` (analytic
surfaces, two-storey bounds) · `mahplaza.js` (build order, hook lists, `roam.setSurfaces`/
`setBounds`, altitude-dependent frustum and fog, MAH NAV entries, `setHaloState`) · `mahascent.js`
(publishes `stats.sites`) · `halo-life.js` (item 16: the population — authored nodes, promenade
field, ring strollers, rails read from `halo-districts.stats.overlookSites`) · `halo-threshold.js`
(item 19: hold, narrowing causeway, tile run-out, gate, launch gantry, cloud shelf) ·
`tests/mahworld-r4-laws.test.js`.

**Budget.** halo 7 draws / 127k tris · districts 10 draws / 29k tris · 64 pylons · 676 near tiles ·
12 overlooks · 63 ring pools. A standing view on the ring: ~310 draws / ~377k triangles, against the
plaza's ~1800 / ~1.2M.

**Corrections that came out of renders, in order of how much frame they occupied.**
1. **The underside was a lit lid.** From MAHPLAZA — the view the world is seen from most — the halo
   filled the sky as a pale ceiling out-valuing the night. Grazing Fresnel on a 6800 m dome (L57).
2. 95% bare plate → the sector architecture: 16 joints, 64 pylons (L53).
3. Graph paper to the horizon → MEGA ramps out, polar spokes and bands take over (L52).
4. A sheet of milk → the three-grade material ladder, platinum confined to verticals and edges, and
   finally the district decks taking the shell's own plating rather than a third env tweak (L51).
5. **The overlooks photographed black.** The dish rises 39.6 m to the rim, so a window cut 60 m
   short looks uphill at a lip 1.8 m above eye level — the guard rail deleting its own clause. They
   are 30 m cantilevers now, straddling the shell's edge with 29 m over open air.
6. `halo-rims` had NaN in all 205,824 positions from one undefined scale argument, so the two rims
   never drew (L56).
7. The dock raked at 61° instead of the 32.7° its own header claimed (L55).
8. Two `ctx.lightPool` calls would have painted the terrain 1800 m below (L54).
9. **Four elements rotated 90° to their own supports** — `kerb()`, `P.screen` (twice: fixed onto the
   wrong axis first), and HALO STAGE's proscenium, whose beams floated crosswise over their piers.
10. Masts at 23:1 → section derived from height (L58). Overlooks in three districts of eight → all
    eight. Crystal growths dark-on-dark → a platinum crown. HALO TABLE's 4.6 m kiosks over a 300 m
    span → a 168 m serving canopy, L53's answer at district scale.

**Item 16, and what putting the camera at body scale cost.** Every capture until `hC` framed the
ring from 50–90 m, where a 2.0 m species is a coloured pawn and nothing about it can be judged. At
12–30 m three things failed at once and none of them was visible in a stats line:

| failure | what the frame showed | the fix |
| --- | --- | --- |
| the ring is not inhabited | 83 figures on a 12,900 m circumference — one person per 155 m — so the district-to-district view R4's proof requires read as empty plate | nodes raised where a node is a density; a FIELD in the promenade bands either side of each built core; 132 strollers around the whole ring. The gate is now people-per-km, not a count. |
| the head was a box | `chamferBox` is a box: a pale carton on a torso, with nothing of the brand figure at the one scale a viewer meets it | the four-segment lathe residents.js already uses — a square standing on its corner — plus the neck residents drops only at its own far tier, and the dark facial chamber |
| the arms were crossbars | built centred, an arm rotates about its own middle: the swing lifts the top above the shoulder while the bottom flares away | the geometry hangs from the shoulder, and the pose angles came down with it (widest gesture 0.34 rad, was 0.55) |

Two placement corrections came with them. FORUM's amphitheatre photographed EMPTY because every
figure stood at `haloHeight(x, z)` while its tiers stand 1.5–6.9 m proud — so `NODES` carries a
LIFT, read off the tread geometry rather than guessed. And a `rail` node at (deg −90, s 0) put two
people against a rim wall 21 m from the nearest bay, because this file had no way to know ARRIVAL's
overlooks are at s = ±60: `halo-districts` now publishes `stats.overlookSites` from inside
`P.overlook` itself, and every rail is read off that (L42, again).

**Item 19 — the threshold.** R4 asks for a transition that is both CLEAR and SPECTACULAR, which pull
against each other: a door in a wall is clear and dull, a horizon is spectacular and says nothing.
So it is a sequence at bearing −67.5° (the open plate between ARRIVAL and COMMONS, which puts
departure beside arrival and radially opposite it): a hold at r 2200 → a 940 m causeway that narrows
from 30 m to 16 m while its masts grow → a run-out where the tiling breaks into stepping plates with
widening gaps → the largest square-diamond gateway in the sanctuary at r 3300 → a gantry cantilevered
past the outer rim into an open launch ring.

*Distinctness is arithmetic, not atmosphere.* Bringing the weather onto the ring is the cheap way to
make this feel spectacular and it would fail R4's "Sky Realm stays distinct" on the first frame. So
near the rim every cloud top sits 62 m BELOW the walking surface — you look down into the biome from
a tiled floor — and only past a third of the way out does it rise above it. The module publishes
that number and the law suite asserts it from the built geometry. (The plaza's own clouds are a
different body: `clouds.js` runs at y 215–560 to clear the city's skyline, 1.2 km below this.)

**Open.**
- **The downward world view is thin at night.** R4 gives it a clause. From 1836 m the world below is
  mostly unlit terrain; the plaza and city are ~23 px and ~160 px respectively. Needs either a
  far-emissive tier on `city.js` or a deliberately lit night-world read. Not yet solved.
- **The extreme view shows the halo over an empty world.** MAHWORLD's built terrain stops at r 1500
  and the halo reaches 3400, so from outside the shell floats over blue. Either the world ring
  extends or the extreme camera stays inside it.
- R4 order items 20 (360 / far-zoom / iPhone / performance closure) and 21 (the three-largest-
  failures loop). Items 15–19 are built and wired.
- Carried from R3: the far-zoom lock (the mountain ring still hides both peer cities), #101 floor
  shards, #102 transport wiring, #105 flora needles, #106 broadcast monitor.

**Proof set.** `scratchpad/halo4.cjs <tag> <time>` — local · across · mid300 · km · shell · dock ·
pier · ascend · spine · overlook · overlook-hi · sector · pulse · quiet · stage · world · farzoom ·
plaza. `scratchpad/ladder.mjs <png...>` measures the plate's value ladder from the render itself,
which is the thing being judged.

**Suites.** mahplaza 27/27 · crystalline 6/6 · pack 8/8 · skyrealm 16/16 · roam 18/18 · r3 20/20 ·
r4 written, first full run pending.
