# WORLD 01 CAMPUS RECONSTRUCTION — CURRENT STATE

ACTIVE PHASE:
P3/P6/P7 — sixteen named frontage buildings now hold the quad, and the furnishing kit fills it.
P5 (roads/sidewalks) still not started. THE SHORELINE IS STILL UNTOUCHED and is the largest named
piece of direction outstanding.

CURRENT BEST CHECKPOINT:
branch `claude-mahworld-phase0-control-deck`. Pre-campus checkpoint frozen at tag
`world01-precampus-checkpoint` (795fd43). Evidence: `dv/c1-*` and `dv/c2-*`, daytime 13:20.

LOCKED / PRESERVE:
- Facility NAMES and identities: MAH GYM, MAH MATCH, MAH MARKET (buildings.js); MAH VITAL,
  MAH FORGE, MAH MODE (mahfacilities.js); MAH ASCENT, MAH NEXUS, MAH HAVEN, the crystal sea.
- Renderer: vendored three r185, ES modules, no bundler, no addons, no image files.
- LAW 1 (metals ≥0.9 take no diffuse), §06 diamonds wider than tall, L42 one-truth-one-source,
  determinism (golden ratio/angle, never Math.random).
- The fixed camera suite lives ONLY in `mahworld/diagnostic-views.json`.
- The planar mirror stays retired behind one `return null`.

REMOVED / RELOCATED (this pass):
- **The unnamed city.** `city.js` BUILD_UNNAMED = false switches off the eight lettered mid-rise
  blocks, the background towers, the shafts that do not end, the ghosts, the distant giants, the
  walkway and the bridges. None carried a MAH name; the mid-rise blocks were also where the amber
  window light lived (`city-window-spill-warm`, the WARM table), which the colour section names as a
  strict exclusion. The city GROUND ring survives — it is the floor. Sky roads survive — transport,
  not buildings. A switch, not a deletion: the tables are intact and §7's placeholder buildings will
  come back with names, entrances and windows.
- **All floor lines.** `ground.js` SMOOTH_FLOOR = true switches off six independent line families
  (joint catches, crossing studs, contrast-cell checker, routing channels, seam glow, edge ring) and
  clears the roughnessMap/bumpMap that painted the lattice into the SURFACE — which is what carried
  the grid out over the ring and the land where there are no cells at all. `plaza-dressing.js` drops
  its path rails, diamond course and path seams under the same switch; the ROUTES themselves survive
  as circulation.
- **The giant monument.** Scaled to 0.32 (about 11 m to the crystal) and moved to the exact centre of
  the quad. It is now the "small refined civic symbol" §1 permits rather than the obstruction §18
  forbids. Collider, deck light pool and key-light distance/intensity scaled explicitly — none of
  the three inherits a group scale.
- **The three ASCENT lines** left the middle of the quad (r 36–39) for the forecourt edges
  (r 108–116), each ~30–35 m from its facility's facade, in the gaps between facility bearings.

MASTERED:
- **Mountains have ridges.** massif() built its relief from two SINE terms added to a radius, which
  is a dome with bumps: a sine has no crease, so a spur and a gully are the same soft shape
  mirrored. It now uses |sin| ranks — which have a corner at every zero — at three rising
  frequencies, gullies cut 1.55x harder than spurs stand proud, the crest term survives to the
  summit so a massif carries a summit RIDGE with subsidiary tops instead of one apex, amplitudes
  are up from 0.16 of the width to 0.43, and normals are FLAT so the creases survive shading.
  FOOT_BOUND moved 1.16 -> 1.44 with them; it is what the treeline and the passes measure against.
- **Trees are bushes of shards.** Each crown was three smooth octahedra — a silhouette with no
  foliage in it. A crown is now built from individual square-diamond leaves, both tips chamfered to
  twelve facets, scattered on the shells of three overlapping lobes by the golden angle, each tilted
  to face out of its lobe with a free roll, in two ranks so the crown has a body and not just a
  skin. Leaf count falls with distance (52 near, 8 at the back of the belt) derived from the tree's
  own radius, so it needs no quality tier. Crown ratio 0.27-0.37 -> 0.44-0.60 and the crown seats a
  quarter lower on the trunk: the belt was a picket of bare poles with lumps on top.
- **The quad is held.** Sixteen NAMED frontage buildings on the 114 m line between the quad edge and
  the facility facades, each with a signboard, a recessed entrance with two leaves and a lit header,
  a canopy, windows framed as four members around a real opening with dark glass and a lit interior
  plane behind, a podium with an entrance step, a set-back upper storey and a designed roof. Windows
  on all four elevations, because from a quad you see far more flank than facade.
- **A value hierarchy the eye can read by class**, which is the reference's actual lesson: deep navy
  roofs and floor bands, near-black podiums, mid cool-grey walls, bright platinum frames and rails,
  near-black mirror glass, cool-white interiors, green planting. Not one white-on-white ladder.
- **A furnishing vocabulary**: bench, planter, lamp, signpost with arrow blades, hydration post,
  weight-plate rack, training mat, banner pylon, kerb bed — every one composed of the parts a
  stranger already expects that object to have, placed as designed CLUSTERS rather than scattered.
- **The campus plan has an owner.** `campus-plan.js` holds the macro topology and nothing else:
  quad 96 m, facade line 132, service band 168, loop boulevard 186, district beyond 205. Facility
  positions, facings and approach points are DERIVED from one bearing each; buildings.js keeps only
  the dimensions it actually builds. Before this, four files each held a fragment of a site plan and
  none held the plan — which is why the whole campus fitted inside a 190 m disc.
- **Facilities are separate destinations.** Facade line 132 m (was 58/71/74), 144 m between MAH MATCH
  and each neighbour, 241 m between MAH GYM and MAH MARKET, with a 36 m forecourt in front of every
  entrance. The 228° arc behind MARKET and GYM is reserved open — arrival approach, rear sea
  sightline, and the reserve for future districts.
- Floor: one smooth platinum surface across the whole grounded map, no lines, no lattice, no mirror.
  The grazing return still takes the sky's COLOUR from the clock's horizon key but its luminance is
  capped (FLOOR_SKY_CAP 0.30) so the metal cannot wash out to pale stone at midday.
- Monument material: polished platinum, measured 33 → 77 against a frame mean of 62.
- MAH MATCH's tower turns on a real plan radius with cross-core armour ribs.

CURRENT DEFECT:
0. **THE SHORELINE IS A BLANKET.** Land meets sea as a value change at r 2600 with no built
   transition — no beach, no promenade, no steps, no moorings. Named by the direction, not started.
1. **No roads.** The loop boulevard, sidewalks, forecourt paving and crossings are a plan and not
   geometry. `road-street` renders an empty band. This is the next action.
2. **Nothing between the campus and the horizon.** Removing the unnamed city removed the entire
   background layer, so the middle distance is now bare floor to the treeline. This is the honest
   cost of the removal and the master's §7 answer is placeholder buildings WITH names and entrances —
   not the generic blocks that were there.
3. Lamp masts still cross the lens in `quad-edge-across`; the treeline still reads as a repeated
   spiky form (§9 "spike forests").
4. The floor's mid-distance band is still lighter than the foreground; the cap helped, it did not
   finish the job.
5. Law suites unverified against the removal at time of writing — see PERFORMANCE STATUS.

CURRENT EVIDENCE:
`dv/c1-campus-overview`, `c1-quad-hero`, `c1-quad-edge-across`, `c1-road-street`, `c1-waterfront`
(daytime 13:20, floor lines gone, unnamed city gone) and `c2-quad-hero`, `c2-quad-edge-across`
(after the floor luminance cap).

PERFORMANCE STATUS:
Draw calls fell sharply with the unnamed city removed — `quad-hero` 1370 draws / 2.38 M tris,
`road-street` 288 / 1.24 M, `waterfront` 181 / 1.22 M. Console clean apart from the harness's own
off-origin abort.

NEXT ACTION:
THE SHORELINE, and nothing else in the same pass. It is a genuinely separate job and should not be smuggled into a campus pass:
the coast is at r 2600-5600, the sea mesh, the shore bed and the swim volume all key off SEA in
mah-rain.js, and "no more blanket implications" means built beach, promenade, steps, railings,
moorings and a real land-to-water transition — not a tinted band where the two meet.

LAST LEARNED RULE:
A "line on the floor" is not one thing. This floor drew its grid from six independent families PLUS
two texture maps, which is why three previous passes each removed one and the grid survived. Before
removing a visual feature, enumerate every family that produces it — the roughnessMap in particular
paints lines onto surfaces that have no geometry at all, which is how the lattice reached the ring
and the land.
