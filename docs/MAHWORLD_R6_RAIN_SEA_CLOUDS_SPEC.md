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

**Flowy and faceted at once**, which a normal water shader cannot do. **Six** summed directional
waves (757 → 84 m) displace the mesh vertically *and laterally* — the lateral term makes the plates
stretch on the back of a swell and crowd on its face — and the normal comes from `cross(dFdx, dFdy)`
of `vViewPosition`, the true facet of whatever triangle the fragment landed on. Real geometry sliding
against itself, no texture, one varying `meshphysical` already declares.

**Tessellation is sized from the swimmer, not from the sea.** 512 × 120 with rings crowded toward the
shore puts facets near 28 m there. Below what the mesh can carry, the chop moves into a **fragment
ripple at 2.6, 8.3 and 21 m** — because no tessellation this world can afford reaches centimetres
across three kilometres. Geometry for the swell, gradient for the chop, and both prefiltered.

**Swim groundwork** (R5 §13's rule — lay the shape, not the activity system):
`seaAt(x,z) → {inside, surfaceY, bedY, depth}` · `crystalSeaBed` as a roam surface · a volume on
`ctx.swimVolumes`, without this file knowing anything about roam.

### THE CRYSTAL CLOUDS
**16 mantle clusters × 24** on the dome's surface of revolution, pushed out along the true *ellipsoid*
normal `(x/R², y'/H²)` — a mantle laid on the *radius* sits at an angle to the shell it hugs, and on a
dome 3434 × 2058 that is a visible error. **40 veil clusters × 18** coming down outside it, whose
inner radius depends on their height: above the spring you must be outside the dome's footprint,
below it the space is open sky under the halo.

Lobe alpha is **0.033**, and the cluster geometry is solved rather than chosen — see the starfish
section below for why both numbers are what they are.

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
| 7 | the lobes were **starfish** | see below — three wrong diagnoses before the right one |
| 8 | the sea was flat at noon | every wave was **174 m or longer**; a swimmer sees 50 m, one *eighteenth* of the longest |
| 9 | a speckle band at the horizon | one pixel spans hundreds of metres; a **2.6 m sine sampled once inside it** |
| 10 | residual moiré under that | at 1500 m the facets are 58 m and an **84 m wave had 1.5 samples per wavelength** |

### The starfish, which took three attempts and one measurement

1. **Blamed the deformation.** Halved the harmonics ±0.28 → ±0.155. The stars persisted.
2. **Blamed accumulation, and was right about the cause but wrong about the cure.** A single lobe at
   alpha 0.11 cannot make a *white* shape, so the shape had to be overlap: 12 lobes of ~200 m radius
   in a 250 m disc stack ~15 deep, `1 − 0.89¹⁵` = **0.83**. Solved for a 0.55 core by *spreading the
   lobes out* — which fixed the core and made the outline **worse**.
3. **Measured it instead.** Rasterise the lobe's projected triangles, bin the outline radius by
   angle: from the camera that photographed the stars, one lobe is **0.77 min/max — convex.**

   *(The first version of that measurement binned vertices, left bins empty, and reported 0.000 for
   a perfect sphere. A metric that returns zero for everything is a fact about the metric.)*

So the star is the **union**. Lightly-overlapping discs meet at cusps and scallop; heavily-overlapping
discs merge. Step 2 had moved `r_lobe/R_cluster` from 0.80 to **0.51** — the wrong way for the outline
while being the right way for the core. Both at once needs heavy overlap *and* far lower alpha: at
r/R 0.71 with 24 lobes the centre stacks 24 deep, and `1 − (1−a)²⁴ = 0.55` wants **a = 0.033**.

And the coverage gate was measuring the wrong quantity — it summed lobe areas, counting every overlap
twice, so the design that actually looks like cloud read 144% and failed. What stands in front of the
dome is the **union of the cluster discs**: 16 × 300 m against 11 km² = **41%**.

### One law, three channels, three times

*A detail drawn at a scale the framebuffer cannot resolve does not read as detail — it reads as noise.*
That argument is written into `halo.js` in my own words, and it then had to be applied twice more:

| channel | the unresolvable detail | the prefilter |
| --- | --- | --- |
| halo grid | constant-**pixel** lines that could not dim | real widths in metres, dimmed by true/drawn |
| sea, fragment | 2.6 m ripple at the horizon | each octave dies as `fwidth` reaches its wavelength |
| sea, vertex | 84 m wave on a 58 m facet | facet size from the grading constants; each wave damped at its own wavelength |

The mesh's facet size is a *known function of radius* — the rings were graded by a constant this file
owns — so the third one needs no derivative at all, only the arithmetic that built the mesh.

## LIVE STATE

**Built and wired.** `mah-rain.js` · `mahplaza.js` (build order, hooks, nav, detail tier, roam
surface, `ctx.swimVolumes`) · `tests/mahworld-r6-rain-sea.test.js`.

**Budget.** curtain 1 draw / 5,000 instances · sea 1 draw / 123k facets · clouds 2 draws / 1,104 lobes.
The entire cloud drift is two counter-turning group rotations a frame.

**Gates.** R6 **37/37**. R5 **51/51**, no regression.

| r | facet | waves the mesh can carry |
| --- | --- | --- |
| 2300 | 28 m | 6 of 6 |
| 3400 | 42 m | 6 of 6 |
| 4200 | 52 m | 4 of 6 |
| 5200 | 64 m | 4 of 6 |

**Open.**
- The cloud masses read as soft plates rather than volumes; more lobes per cluster at lower alpha
  would deepen them, at a cost worth measuring first.
- Night frames are monochrome navy overall — a value question for the world, not for this layer.
- The rain's landing on the water has no interaction yet: no disturbance, no ring, no spray.
- Carried: #101 floor shards · #102 transport wiring · #105 flora needles · #106 broadcast monitor.
