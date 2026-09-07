# MAHWORLD R5 — MAH CROWN · THE HALO DOME · MAH HAVEN

The live state of the R5 layer. R5 is additive: R4 MAH HALO, R3 density/crystallisation, R2 and
prior world law are preserved, and every number below is read out of the assembled scene rather than
restated from a constant, because a module whose header and whose geometry disagree is this
project's most reliable defect.

---

## THE THREE PERMANENT LOCKS, AND THE PROBLEM EACH ONE POSED

| Lock | The problem | The answer |
| --- | --- | --- |
| **MAH CROWN** — the ultra-tall central sanctuary tower | It belongs at the centre of MAH HALO, and the centre of MAH HALO is a **hole**: 666 m of open air that R4 cut deliberately, because a disc at 1800 m erases the moon and the star field from every ground camera in the world | It is **carried across** the hole on eight spars from the inner rim, stayed from a collar at y 2360. The plinth takes 3.2% of the hole's area, so the plaza keeps its sky and gains a tower through the eye of the halo |
| **HALO DOME** — transparent enclosure and future climbing surface | "Translucent enough to preserve sky" and "colossal" pull against each other, and the number that fails is not the one you watch | Ellipsoid cap, opacity 0.16, and a **rib hierarchy** — the first cut's 48 full-height meridians photographed as a wireframe cage, because meridians converge |
| **MAH HAVEN** — the peaceful waterfront | Its whole emotional content is a sun path on water, and MAHWORLD's directional light **never moves** | The shore bearing was chosen by measuring the light, not by taste |

---

## MAH CROWN — the geometry, decided by arithmetic before any code

```
inner rim deck        y 1841.6   haloHeight at R_IN - APRON, so the spars are level
plinth top            y 1901.6   60 m
shaft                 y 1901.6 -> 3380   five square-diamond segments, 180 m across down to 96
crown                 y 3380 -> 3560     six stepped plates, each wider than tall
mast tip              y 3620
```

| | measured |
| --- | --- |
| Height above its own base | **1,790.9 m** |
| Slenderness | 9.88 : 1 |
| Subtends from the ring midline | 41.3° |
| Subtends from the outer rim | 27.9° |
| Subtends at 12 km | 8.4° |
| Cost | 4 draws, 3,872 triangles before the facade pass |

For scale inside this world: `city.js`'s tallest ghost shaft is 900 m and its megatalls stop at
392 m. **1,790 m is more than four times the tallest thing MAHWORLD had.**

*Why 9.88:1 and not thinner.* §06 and L58 forbid needles, and the ratio that lesson was written
about is 23:1 — a member so slender it aliases to a crawling hairline. A supertall at 10:1 is what
the reference actually is and what real supertalls are. Thinner fails §06; thicker fails R5's "do
not shrink it into a decorative tower".

### The facade, from the reference and nothing else

The supplied night tower contributes **four** things: extreme verticality with the top lost in
cloud, a narrow/tall proportion, a repeated luminous LINE rhythm, and rare warm interior glimpses
on an otherwise cold facade. R5 forbids the rest by name. What carries them:

- **Luminous bands at a constant 26 m pitch.** Constant in metres, so the compression that makes a
  photograph of a tower read as tall is real perspective and not an authored trick.
- **Vertical MAHGIC channels**, three per flat. The reference has horizontal banding on one tower
  and a vertical dash rhythm on the other; a tower with both reads as a building with two
  elevations rather than as an extrusion.
- **Authored square-diamond nodes** every fifth band, 0.22 of the segment width, alternating flats.
- **One large canted facet plane** per segment — "broad readable facets rather than noisy
  micro-triangles" — the element that catches the sky when nothing else does.
- **Ten hero windows.** mahplaza LAW-001 exempts interior light by ROLE and requires the identifier
  to name it; each is `crown-interior-light-*`. They are a night effect almost entirely, because a
  warm window at noon is a stain.

---

## THE HALO DOME

Springs at the outer rim (r 3434, y 1841.6 — the dish is symmetric, so both rims sit at the same
height) and closes at 3900. `y(r) = SPRING_Y + RISE · sqrt(1 − (r/R)²)`.

- **280 m of clearance** over MAH CROWN's mast. R5 §8 asks the tower not to clip the apex; 280 m is
  a clearance you can see rather than a tolerance you have to trust.
- **Rise 2058 m over radius 3434** — a 0.60 ratio. A true dome, not a lid and not a hemisphere.
- Vertical at the spring, flat at the apex, which is exactly the gradient a climbing surface wants:
  the first pitch off the rim is a wall, the middle is a slab, the last 800 m of radius is walkable.
- **The apex lands on an oculus ring, not a point** — 16 members converging is a spike, and §06
  forbids spikes.

### The rib hierarchy — the correction that made "preserve the sky" true

48 full-height meridians is one every 450 m at the spring, which is genuinely sparse and looked it
from close up. But **meridians converge**: at r 400 the same 48 are one every 52 m, and from across
the sanctuary the upper dome photographed as a wireframe cage laid over the sky. **The opacity
number could not have caught it — the obstruction was the structure, not the glass.**

| | before | after |
| --- | --- | --- |
| Ribs reaching the apex | 48 | **16**, and much heavier |
| Lower-half infill | — | 32 secondaries over 46% of the arc, fading out rather than stopping dead |
| Shell tessellation | tied to the rib count | independent (48 columns) — tying them to one number is what made the sparse version impossible |
| Triangles | 86,320 | 62,776 |

### Climbing is geometry, not texture

R5 §7 rules out a rock texture pasted on the dome, so the grip language is built: paired platinum
ridges forming a **channel you climb inside**, 656 square-diamond handholds in staggered clusters
(instanced — one draw), and resting shelves every eleventh step, because a 2 km climb with nowhere
to stop is a route nobody believes. Four routes, each **drifting in bearing as it climbs**, which is
what makes it a route rather than a ladder.

### The portal

MAH THRESHOLD's gantry runs from r 3380 to 3560 — through the spring line. R5 §9 keeps the
threshold as the departure system, so the dome carries a **framed 378 m portal at its bearing**:
jambs, a lintel, diamond nodes. You leave the sanctuary by passing through both. One composition
instead of two objects that intersect.

---

## MAH HAVEN

**It stands on the lake that already exists.** R2 cut an irregular 14-sided polygon at bearing 62,
r 700, water at `terrain.js`'s `BASIN.y`. A second body of water would be two systems where the
world has one, and the shoreline would drift from it the first time either was edited — so
`lakecity.js` now exports its polygon, water level and centre, and this district reads them.

**The shore bearing is a lighting decision, made by measurement.** MAHWORLD's directional light is
fixed at (−80, 120, 160) — bearing 243.4 — and the clock changes its colour and intensity but never
its azimuth. So orientation decides once and for all whether a district is front-lit, and no choice
of render hour can rescue one that faces the wrong way.

| bearing | view axis | off the light | verdict |
| --- | --- | --- | --- |
| 232 (first cut) | 52° | 168° | fully backlit — the reveal came back with a black lake |
| 63.4 (ideal) | 243.4° | 0° | inside LAKE CITY's terrace arc (−46 to +78). Not available |
| **118 (built)** | **298°** | **54.6°** | three-quarter front light raking across the water; clears both bridge pinches at 103 and 257 |

### The entrance is the whole district

The reference photograph is not a place, it is a sequence — narrow approach, beds pressing in, steps
down, a rail, a promenade crossing, a low shore edge, water, mountains. **The feeling is not the
water; it is the contrast between a corridor two metres wide and a world thirty kilometres wide.**

- corridor **96 m long, 7.4 m wide**, narrowed to 4.6 m of clear walking by the beds
- **five steps down**, because descending is what makes a horizon rise
- the rail is **1.05 m** — low enough that it never crosses the horizon from a standing eye, which
  is the one thing that would undo the reveal

### Reserved, not decorated (R5 §13)

overlook · street food (8 kiosk pads + communal seating) · mini-farm (7 growing rows, covered
frames, a water channel off the lake, 2 service pads) · market plinth and colonnade · 9 low service
footprints, **none over 8.5 m** · 3 docks with FOB transport points · a vegetation reserve whose
planting is *irregular* where the farm's is *ordered* — same organisms, opposite grammar.

**No livestock.** R5 §15 draws that line explicitly and the law suite asserts it by name.

### The material separation (R5 §17)

MAH HAVEN gets **stone: roughness 0.88, metalness 0.04, envMapIntensity 0.30** — the one walking
surface in MAHWORLD allowed not to be a near-black mirror. A rural promenade paved like HALO PULSE
reads as an airport apron. The surface reads by its own value instead of by what it reflects, which
is what "softer materials, more natural surface variation" means in PBR terms.

---

## LIVE STATE

**Built and wired.** `mah-crown.js` · `halo-dome.js` · `mah-haven.js` · `lakecity.js` (now exports
its lake contract) · `halo.js` (rim apertures, underside grid) · `mahplaza.js` (build order, hooks,
nav, roam ceiling, LOD tiers) · `tests/mahworld-r5-laws.test.js`.

**Budget.** crown 4 draws / 3.9k tris · dome 5 draws / 62.8k tris · haven 4 draws / 12.1k tris. A
standing view on the ring under the dome: ~305 draws / ~795k triangles.

**The two most expensive defects of this pass were the same bug.** Twice a new module was written,
wired, committed and rendered while **not existing**: a `const` array declared below the build that
closes over it sits in the temporal dead zone, the first call throws a ReferenceError, and the
assembly's guarded `try/catch` — which is correct, and which is what lets the world degrade to
whatever loaded — turns a dead district into one console line. `halo-threshold.js` lost eight
capture cameras to it; `mah-haven.js` lost seven. **The R5 law suite now opens with a wiring gate**,
which costs one line and would have caught both.

**Open.**
- The dome's ribs invert value between day and night (dark lines on a bright sky, lit lines on a
  dark one). Physically correct; wants a noon frame before it is called.
- The PBR material pass — procedural roughness break-up, normal micro-depth and vertex-AO — is
  specified and not yet applied. Every material in this world is still a scalar.
- MAH HAVEN's reveal frame is under investigation: the water reads as a dark void at 17:10 and the
  cause is being probed rather than guessed.
- Carried from R4: the downward world view is thin at night; the halo (r 3400) outruns the built
  terrain (r 1500).

**Proof set.** `scratchpad/crown1.cjs <tag> <time>` — 23 views covering R5 §18's required list.
`scratchpad/haven1.cjs <tag> <times>` — the district across a time sweep.
