# MAHWORLD R6 — MAH RAIN, THE CRYSTAL SEA, THE CRYSTAL CLOUDS

One weather system, one file (`mahworld/scene/mah-rain.js`), one truth about where the dome is.
The clouds gather on the dome; the dome sheds the curtain; the curtain fills the sea.

**The standing direction that governs everything from here:** *"graphics should be looking extremely
realistic, no sharp edges, no overly premium areas premium. This only comes after supreme detail."*

---

## THE MEASUREMENT THAT CAME FIRST

Whatever the rain lands in has to stand on something, and this world's ground is not infinite. A
24-bearing raycast, r 1800 to 5400:

| r | ground hits | mean y |
| --- | --- | --- |
| 1800 | 24/24 | 177.6 — the far range |
| 2400 | 24/24 | 19.7 — the land ring, falling away |
| **2600** | **17/24** | **5.3 — the land's edge, already broken up** |
| 2800 | 1/24 | 28.3 |
| **3000, 3434, 4200, 5400** | **0/24** | **nothing at all** |

`terrain.js` builds its land ring 600→2600 and its far range at 1500. The halo's outer rim is 3400
and the dome springs at 3434 — **both have been standing over void for two layers.** That is R4's
carry-over note "the halo outruns the terrain", never closed. R6 closes it.

---

## THE THREE SYSTEMS

### MAH RAIN — the curtain
5,000 glass shards, **one draw call**, falling 1,843 m from the dome's own perimeter (asked of
`halo-dome.js`, never re-derived), flaring 3434 → 4189 and leaning into the flare.

**No points, at either end, at any length.** Each shard is an eight-sided lathe whose radius follows
`sin(πt)^0.42` clamped to 0.17, terminating in **flat discs** — not fans to an axis vertex, which is
a point however shallow the cone around it.

**The section is 25:1**, not the 55:1 it shipped at. L58 records 23:1 as the ratio that aliases into
a crawling hairline. Widening cost nothing: triangles are per instance.

The motion is **CPU-composed on purpose**. A vertex-shader fall displaces after `instanceMatrix`,
which in r185 happens inside `project_vertex` — so `worldpos_vertex` would hand fog and the
environment the *undisplaced* position, and a 1,843 m curtain would be fogged for where it is not.

### THE CRYSTAL SEA
Inner shore **2277–2572** (inside the land's broken edge at 2600 at *every* bearing, not on average),
out to 5600 — past the dome, so the ring's horizon is water. Level **y −1.4**: `terrain.js`'s
`BASIN.y`, which `lakecity.js` also uses.

**Flowy and faceted at once**, which a normal water shader cannot do. Four summed directional waves
displace the mesh vertically *and laterally* — the lateral term makes the plates stretch on the back
of a swell and crowd on its face — and the normal comes from `cross(dFdx, dFdy)` of `vViewPosition`,
the true facet of whatever triangle the fragment landed on. Real geometry sliding against itself, no
texture, one varying `meshphysical` already declares.

**Tessellation is sized from the swimmer, not from the sea.** 512 × 76 with rings crowded toward the
shore puts facets near 20 m there; a fragment ripple at 3.7 m and 13.1 m supplies the surface of each
plate, because no tessellation this world can afford reaches centimetres across three kilometres.

**Swim groundwork** (R5 §13's rule — lay the shape, not the activity system):
`seaAt(x,z) → {inside, surfaceY, bedY, depth}` · `crystalSeaBed` as a roam surface · a volume on
`ctx.swimVolumes`, without this file knowing anything about roam.

### THE CRYSTAL CLOUDS
**16 mantle clusters × 12** on the dome's surface of revolution, pushed out along the true *ellipsoid*
normal `(x/R², y'/H²)` — a mantle laid on the *radius* sits at an angle to the shell it hugs, and on a
dome 3434 × 2058 that is a visible error. **40 veil clusters × 8** coming down outside it.

**"Not inside of it" is a predicate, not a margin.** `insideDome(r, y)` is written once, used by the
placement, published in stats, and asserted off the *built instance matrices* — a rule enforced by
the code that also checks it is not a gate.

Each lobe is a subdivided icosahedron deformed by three harmonics of its own surface direction, left
non-indexed so `computeVertexNormals` gives per-face normals: 80 facets each catching the sky at its
own angle, computed once at build. **Roughness 0.62** — it holds its facets because the geometry is
faceted, not because the surface is a mirror.

---

## WHAT THE RENDERS CAUGHT THAT THE CODE DID NOT

| # | the frame said | the arithmetic said |
| --- | --- | --- |
| 1 | the dome vanished | 1500 lobes × 430 m = **218 km² against an 11 km² silhouette** — 20× over |
| 2 | it read as ice rubble | a uniform **scatter** is a debris field however soft each piece is; a cloud is an *aggregate* |
| 3 | the sea was navy glass | the swell's taper was anchored to the **mean** shore, ramped over 360 m → **0.0065** at the bay where you swim |
| 4 | the sea ended at a line | correct geometry, and a horizon nobody would build |
| 5 | one facet filled the frame | plates were **39 × 49 m**, seen from 2.3 m up |
| 6 | the sea was pale violet | 0.30 metalness × envMap 1.55 returns most of the sky at grazing |
| 7 | the lobes were **starfish** | ±0.28 of harmonic beat lobes an icosahedron; flattening a lobed ball makes a star — points, on the one system that may have none |

**And two of the gates were measuring the wrong thing.** The end-radius gate took the *smallest*
radius among end vertices, which makes a genuinely blunt disc indistinguishable from a needle. The
visibility gate fired three rays through a volume that is 0.05% rain — a lottery, not a measurement;
it counts shards inside a viewer's 32° cone now.

---

## LIVE STATE

**Built and wired.** `mah-rain.js` · `mahplaza.js` (build order, hooks, nav, detail tier, roam
surface, `ctx.swimVolumes`) · `tests/mahworld-r6-rain-sea.test.js`.

**Budget.** curtain 1 draw / 5,000 instances · sea 1 draw / ~78k facets · clouds 2 draws / 512 lobes.
The entire cloud drift is two counter-turning group rotations a frame.

**Gates.** R6 at 36/37 before the veil-radius fix; R5 remains 51/51.

**Open.**
- The cloud masses read as soft plates rather than volumes; more lobes per cluster at lower alpha
  would deepen them, at a cost worth measuring first.
- Night frames are monochrome navy overall — a value question for the world, not for this layer.
- The rain's landing on the water has no interaction yet: no disturbance, no ring, no spray.
- Carried: #101 floor shards · #102 transport wiring · #105 flora needles · #106 broadcast monitor.
