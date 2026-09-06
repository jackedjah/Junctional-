# MAHWORLD scene contracts — v5, the chromium city

What each module owns and what it promises the assembly, as of the ULTRA CHROMIUM
CITY pass. Supersedes nothing in `CONTRACTS_V4.md`: v4's module contracts
(`setTime` / `setTheme` / `update` / `setQuality` / `dispose`, optional loading,
the appearance-owner law, the light law) all still hold. This file records what
v5 added on top.

## 1. The finish grades — `materials.js`

MAHWORLD is a civilization built from chromium, dark platinum, polished crystal,
reflective glass, a diamond facet language and MAHGIC light. **A finish is a
roughness, not a hue.** The five grades are the same cool neutral metal read at
five polishes, and they are ranked by how much of the world may wear each:

| grade | roughness | metalness | env | where it belongs |
| --- | --- | --- | --- | --- |
| `chromeMirror` | 0.03 | 1.00 | 2.7 | focal trim, hero catches, floor joints, portal frames — **rare** |
| `chromeSatin` | 0.17 | 1.00 | 2.1 | broad structural framing, lamp columns, rails, receivers |
| `platinumBrushed` / `…H` | 0.34 | 0.96 | 1.7 | large secondary architectural surfaces (directional streaks, `v` or `h`) |
| `graphiteMetal` | 0.52 | 0.90 | 1.5 | structural depth, mass, the dark that holds the light |
| `crystalGlass` | 0.06 | 0.22 | 2.0 | windows and light-transmitting sections |

This does **not** mean every surface becomes mirror chrome. Mirror is focal;
graphite is everywhere.

Two procedural maps carry the grades, both cached and shared:

- `brushTexture(axis)` — fine directional streaks along one axis. Multiplied
  into `roughness`, so it reads as a brushed panel without an anisotropy
  extension.
- `diamondFloorTexture()` — the plaza's diamond cells painted into a roughness
  and bump map, so the base plane stays a jointed, polished floor between the
  modelled cells.

Every neutral moved up a step out of near-black. MAHWORLD is still a night
world; what changed is that its darks are dark **metal**, which returns light.

## 2. The hero floor — `ground.js`

```js
export const DIAMOND_CELL = 9.0;   // architectural scale: one diamond is nine metres across
export const FLOOR_TOP = 0.17;     // the laid floor's deck level
```

The plaza is a **laid deck**, not a plane: nine-metre chromium diamond cells,
each a chamfered slab with a sub-half-degree deterministic tilt so it takes its
own value under one light, in mirror-grade joint catches inside the hero radius
(28 m) and a satin field carrying out to 43 m. Cells are semi-transparent over
the mirrored emissive copies the assembly builds under the floor.

**Consequence for every other module: anything standing on the plaza stands on
`FLOOR_TOP`, not on `y = 0`.** `plaza-dressing.js` lifts its whole group;
`life.js` uses `deckY(x, z)`; the assembly lifts residents and planters inside
the deck radius. Aprons step up above it and carry a mirror nosing.

## 3. The site plan — `buildings.js`

```js
export const SITES = { gym: {...}, market: {...}, match: {...} }
```

One table, three depths, three silhouettes. `ground.js` places its aprons from
it, `plaza-dressing.js` routes its paths to its `approach` points, and `life.js`
derives its approach nodes from the door anchors the assembly builds out of it.
Move a building here and the ground, the paths and the crowd follow.

| site | depth | silhouette treatment |
| --- | --- | --- |
| MAH GYM | nearest, left | `broadCanopy()` — a swept curved glazed canopy on chromium columns, mirror nosing, lit clerestory |
| MAH MARKET | midground, right | `terraces()` — three receding roof terraces with rails, troughs, service volumes |
| MAH MATCH | furthest, centre | `verticalTower()` — a 22 m tapering tower on a banded shoulder, corner fins, one lit slot, a crown and the district beacon |

`verticalTower()` publishes `ctx.matchRoof` (world position of the tower crown)
and pushes to `ctx.beacons`.

**No un-bevelled 90° corners.** `box()` in this module is a chamfered box whose
chamfer scales with the part.

## 4. The FOBEAM tiers — `fobeam.js`

```js
const TIER = { near: {...}, mid: {...}, far: {...} };   // gauge, tessellation, brightness
const FAR_ROUTES = 30;
```

Forty routes instead of five, each far thinner. `near` and `mid` are the
authored infrastructure between named receivers; `far` is generated along a band
arcing across the sky — denser toward its middle, a third of it running nearly
straight — so the distant tier reads as one luminous river rather than thirty
drawn lines. A far packet is a spark, not a lamp (`TIER.far.packet` scales its
gain).

`stats` now reports `tiers`, `routeCount` and `packets`.

## 5. What chromium reflects — `mahplaza.js`

A mirror finish is only as interesting as its surroundings: chrome against a
smooth gradient reads as flat grey paint. The environment scene therefore
carries **the district itself** — 56 vertical bars of varied height and
brightness around the horizon, one merged vertex-coloured mesh built once, whose
brightness follows the clock. `scene.environmentIntensity` rose to `1.18` at
night, because a chromium world is lit largely by what it reflects.

## 6. Unchanged laws

Everything in `CONTRACTS_V4.md` §"Laws" still binds, in particular:

- `world-clock.js` is the one owner of world time.
- Three independent appearance owners; no global tint, filter, overlay or
  material overwrite.
- The species law: square-diamond head with a dark facial chamber, humanoid
  upper body, ONE continuous lower teardrop, no legs, one colour per resident.
- Blue-white light only; MAH MATCH's red accent is the one exception.
- No audio, no network, no HUD in the world, no invented product copy.
