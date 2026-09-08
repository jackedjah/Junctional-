/* MAHWORLD :: MAHPLAZA FLORA AND VEHICLES — diamond vegetation planters,
   crystalline TREES and square-diamond sky craft, one ES module, no
   dependencies beyond three.

   Art law (brief "MAHPLAZA landscape / portrait concept"):
   - DIAMOND VEGETATION: a banded planter (chamfered box or faceted low
     cylinder) → a few thin luminous stems that rise like controlled blue-white
     lasers with a slight outward lean → each stem ends in a SQUARE-DIAMOND
     crystalline leaf (a flattened octahedron with a bright inner core). Some
     stems fork once. Sparse and calm: 3–9 leaves per planter, never a bouquet.
   - THE PLANTER IS THREE BANDS, not one grey tub (v7 correction). A planter
     reads as a planter because of its rim: PLATINUM RIM (the low-metalness
     horizontal grade — a flat cap facing a night sky reflects an almost black
     zenith, so only a diffuse platinum reads there), MIDTONE BODY (the
     graphite-blue structural value the rest of the plaza wears) and a DARK
     INTERIOR VOID (the inner wall and the soil floor, near-black). Bright rim,
     midtone body, black soil. Nothing on the plaza is a neutral grey.
   - TREES (v7): the plaza is flanked by real trees, not scaled-up houseplants.
     A slim tapered trunk with a flared root collar, two or three branch tiers,
     and a broad canopy of large SQUARE-DIAMOND leaf plates massed on an oblate
     shell — the same leaf motif as the planters, grown up and grouped instead
     of scattered. The plates tilt roughly 40° off horizontal so the canopy
     shows area to the sky AND to a viewer standing 20–40 m away; upper faces
     are lit and undersides are dark because the light is BAKED INTO VERTEX
     COLOURS at build time (one face = one facet = one colour). The tree's only
     energy is a slim luminous heartwood seam up the trunk and a bright core in
     the crown plates — the planter's stem treatment, not an outline. A tree is
     three merged meshes: wood, canopy, heartwood.

   - THE CROWN, CORRECTED IN v8 (visual law 06, "make it more round looking not
     so pointy"). clouds.js states the rule this world actually obeys:

         THE SILHOUETTE IS ROUND.  THE SURFACE IS CRYSTALLINE.

     v7's crown failed the first half and it failed it structurally, not
     materially. Two faults, both about the OUTLINE:

       1. THE PLATE ENDED IN A POINT. The canopy plate was the planters' leaf
          geometry — an octahedron scaled to a flat rhombus — so its long axis
          ran radially OUT of the shell and finished on a single sharp vertex.
          Three or four dozen of those on a sphere is a starburst, not a crown.
       2. NOTHING BOUNDED THE OUTLINE. A plate was seated with its middle on the
          shell and then pushed out again by a random `puff` of 0.84–1.10, and
          nothing then checked where its corners landed. MEASURED across the
          plaza's 18 trees: the worst plate corner stood 24% past the nominal
          crown ellipsoid and ALL EIGHTEEN trees had corners outside it. That
          scatter IS the spiky read — the crown had no silhouette, it had
          thirty-nine of them.

     The fix keeps every plate and keeps the plate crystalline. It is two moves:

       A. A BLUNT DIAMOND (`canopyPlateGeometry`). Both tips of the diamond are
          cut back to a small FLAT FACET — a chamfered square diamond, six
          outline edges instead of four, twelve facets instead of eight. This
          ADDS faceting: where a needle aliased into a hairline and caught no
          light, a blunt tip carries a facet ~0.3x the plate's width that takes
          a highlight. The brand's own SQUARE DIAMOND is untouched and is still
          what the planters, the leaf cores and the craft prow wear — see
          `leafGeometry`, which this file still builds exactly as it did.
       B. AN ENVELOPE THAT IS SOLVED, NOT HOPED FOR. The crown is an oblate
          ellipsoid of semi-axes (canopyR, RY) and every plate is now SEATED
          against it: given the plate's frame, buildTree solves a quadratic per
          plate CORNER and takes the tightest, so the plate slides along its own
          radius until its outermost corner lies exactly ON that ellipsoid (or,
          for the deep plates, on a shell at a chosen fraction of it) and no
          corner is outside. Random radial scatter is gone; the outline is a
          chain of blunt facets on one smooth surface. All six corners are
          tested and not just the tip because the corner that breaks the outline
          is not always the tip: down in the skirt the shell normal points DOWN,
          the plate stands nearly on end, and it is the plate's INNER corner that
          hangs below the crown as a fringe. The plates near the outline are the
          small ones and the big ones sit BEHIND them: about a fifth are seated
          at 0.62–0.78 of the envelope at 1.2x the size, so the crown reads as a
          full mass rather than a hollow shell of leaves.

     MEASURED, over the plaza's own 18 trees at four bearings each, by rasterizing
     the canopy's orthographic silhouette:

                                          v7          v8
       worst canopy vertex, in NOMINAL crowns  1.240        1.100
       and it is now the SAME 1.100 on every plate — one shell, not a scatter
       widest point / median outline       1.205        1.125
       notch floor between plates          0.738        0.737
       share of the outline actually full  61.0%        74.8%

     Read that as: the crown is the same SIZE it was and the gaps between its
     plates are no deeper, but no PLATE sticks out of it any more and it is a
     seventh less transparent. The widest point of the crown is no longer a spike
     — it is the envelope, which every outline plate now shares.
     SAY THE BOUND OUT LOUD, because it is easy to misread this table: the crown
     is bounded by CROWN_ENVELOPE x (canopyR, RY), which is 1.10 x nominal, NOT by
     the nominal ellipsoid. v8 does not put the canopy inside `canopyR`; it puts
     every plate on ONE surface at 1.10 of it, exactly attained (verified over
     1,906 plates: the seating solve never falls back and never clamps). The
     roundness comes from the plates SHARING a surface, not from a smaller one.
     WHAT WAS STILL POINTY IN v8, and what v9 does about it: the BARE BRANCH TIPS.
     appendTube closed a tube by running its radius to zero, so a branch ended in
     a true needle, and the wood was byte-identical to v7. Pulling the canopy in
     from a scattered 1.24 to a uniform 1.10 uncovered them.

     v9 FIXES IT IN TWO MOVES, and the second one only exists because the first
     one MEASURED AS A NO-OP.

       A. THE BLUNT END (§06's own prescribed technique). appendTube now takes a
          `caps` mask and lays an END-CAP FAN on every FREE end, and a branch
          finishes on TIP_FACET (0.32) of the radius it started from instead of
          on zero. A branch tip is now a small flat facet 1.6-2.6 cm across that
          can hold a highlight where a hairline could only alias. The trunk
          leader gets the same treatment and the heartwood seam — whose two ends
          were open HOLES in the wood — is closed at both. A branch's start and
          the trunk's foot are not capped: they are buried in the trunk and in
          the deck, and four triangles for a face nobody can see is not a fix.
       B. THE TIP IS SEATED, the wood half of v8's plate-seating solve. Blunting
          a tip does not put it under foliage, so a branch that would finish
          outside the crown is moved along its own direction until it lies on a
          shell at BRANCH_SEAT (0.94) of the crown envelope.
          THE DIRECTION OF THAT MOVE IS THE WHOLE POINT AND IT IS THE OPPOSITE
          OF WHAT WAS ASSUMED. The obvious reading of "a tip outside the canopy"
          is a branch reaching too FAR, so the first cut of this solve clamped
          the length to the far intersection — and re-measuring returned all
          seven offenders byte-identical, because not one of them was long. They
          are SHORT: a low-tier branch starts about 1.4 RY below the crown centre
          on a large tree while the foliage stops around 0.9 RY below it, and a
          short shallow limb never gets up into the canopy at all. It ends in open
          air UNDER the skirt, short of the near intersection. So the seat is the
          INTERVAL [L1, L2] and not the ceiling L2, and the fix mostly LENGTHENS.
          Bounded both ways (BRANCH_FLOOR 0.55, BRANCH_REACH 1.45) so a seed keeps
          the tree it was given.

     MEASURED, same 54-tree population as v8 (ground.js's 18 tree spots, seeds
     106-123, at all three sizes) and the same 347 branch tips, taking a tip as
     outside when it stands past the canopy's own outermost point in the direction
     the tip points:

                                     v8            v9
       branch tips                  347           347
       tips outside the canopy        7             0
       worst tip, standing proud   33.9 cm       0.0 cm
       worst as a multiple of the
         canopy shell               1.174x        —
       tips ending on zero radius   347             0

     (v8's own header reports 8 tips / 32.0 cm for this population. The 7 / 33.9
     here is the same seven trees — seeds 107, 120 and 123 exactly as it names —
     measured against the canopy's MEASURED support rather than the analytic
     ellipsoid, which is a slightly different question and gives a slightly
     different count. Both go to zero.)

     WHAT IT MOVED. The seating solve is nearly invisible in the silhouette,
     which is the point: over the 54 trees the mean widest reach of the WOOD
     goes 1.436 -> 1.446 m, the widest single tree 2.198 -> 2.208 m, mean tree
     height is unchanged to the millimetre, and the largest change to any one
     tree's reach is 8.8 cm. WHAT IT COST: the end caps plus the un-collapsed
     final band take the 54-tree population from 30,762 to 34,618 triangles
     (+12.5%), all of it wood (6,054 -> 9,370). No new draw calls.

     WHAT IT COST. The plate went from 8 triangles to 12, so a canopy costs 1.5x
     what it did: 200/248/312 -> 300/372/468 by size, a tree 341/365/465 ->
     441/489/621, and the plaza's whole flora and craft population 10,370 ->
     13,146 triangles (+26.8%), MEASURED by traversing the built groups. NO NEW
     DRAW CALLS: still 132 across 6 planters, 18 trees and 3 craft, still three
     merged meshes per tree, still one geometry per (size, seed). The fullness
     came free of that — plate size (0.30 -> 0.36) buys coverage without widening
     the crown, because the envelope, not the plate, decides the outline now.
   - TRANSPORT (v9, §6). THE RHOMBUS IS RETIRED. Up to v8 this module built a
     chamfered rhombus hull with a belt, a cabin and a prow light. It had no
     wheels, no grille and no exhaust, so it passed the letter of §6 — and it
     failed the substance, because §6 does not say "not a car", it says where
     transport COMES FROM: FOBLOCK + square diamond + platinum module + black
     crystal + MAHGIC propulsion, and §11 gates on "transport derives from the
     genome's geometry". A rhombus derives from nothing here but itself.
     Every hull is now ONE EVALUATION OF foblock.js: a rounded square in plan
     with a flat table top and bottom, a tight fillet on every edge, a circular
     engraved medallion on the nose and the TWO LATERAL RINGS that identify the
     family — which on a craft are exactly what §4 calls "soft connection
     points". A pod docks to the world through rings.
       POD (§6A)      the genome at pod scale, PROPORTIONS UNTOUCHED. The BLOCK
                      is 1.90 m wide, 1.63 deep and 1.94 tall; the CRAFT is 3.22 m
                      across, because the two connection rings stand 0.66 m proud
                      of each flank (foblock's ringOut 0.62 + ringR 0.175 +
                      ringTube 0.052 = 0.847 of the width, either side). Say both
                      numbers: a placement test that uses 1.90 is testing the
                      wrong object, which is why the footprint below is MEASURED
                      off the built rings and not off the block. Hovers 0.34 m
                      clear of the deck on a MAHGIC underglow, no wheels and no
                      undercarriage. A square-diamond
                      emblem on each flank, a dark crystal pane forward of it,
                      two accent strips low on the body.
       SHUTTLE (§6B)  the same evaluation elongated along the genome's DEPTH axis
                      only — 2.30 x 5.14 x 2.35 — which is what "elongated
                      multi-resident floating block" means. Still a rounded
                      square in section, still a flat table top; NOT a rhombus
                      and NOT a wedge. Three diamond glazing panes run aft of the
                      rings, where a cabin is.
     The pods park in ones and twos on the aprons and idle; three shuttles ride
     the closed sky route, tangent to the path with a little banking. +Z forward.
     LAW 1 is re-measured after the stretch rather than inherited — see
     splitByNormal() and the §6 section header, which is where the reasoning
     lives.
   - Colour: stems, leaves, seams and undersides take the ENVIRONMENT energy
     colour of the viewing player's world theme ({ energy, energyLight }); the
     canonical theme is blue-white. No yellow or amber anywhere in this file.
     THE ONE PLACE THAT NOW CONTRADICTS THE REFERENCE, flagged rather than
     decided quietly: the hero render's pods carry "warm amber accent light
     strips low on the body". Warm is not available to a vehicle in MAHWORLD —
     hue 28-75 is reserved for light coming from INSIDE A BUILDING, a test
     enforces it by identifier, and this file's own standing law is the line
     above. The strips are therefore the world energy colour. If the director
     wants them amber it is a change to the warm-light law, not to this file.
   - Time of day: setTime({ daylight, sunElevation }) subdues every emissive
     element to ~25% by full day and restores it at night.
   - Performance: every geometry is shared; stems, halos, leaves and cores of a
     planter are four InstancedMeshes; a tree merges its trunk + branches, its
     whole canopy and its heartwood into one geometry each (3 draw calls; 441 /
     489 / 621 triangles for small / medium / large, MEASURED off the built
     groups in v8) and trees of the same size + seed share those geometries
     through a ref-counted cache, so the plaza's 18 trees cost 18 x 3 draw calls
     and 12.5k triangles however many distinct designs stand in it; materials are
     cached per theme.
     THE PODS ARE INSTANCED, and that is what makes an idle bob affordable:
     merging five pods by role would give the same seven draw calls but ONE
     transform, so every pod would bob in unison, which reads worse than not
     bobbing at all. One InstancedMesh per role, one instance per pod: seven
     draw calls for the whole pod fleet and a hover of its own for each craft.
     MEASURED off the built groups for the whole flora + transport population
     (6 planters, 18 trees, 5 parked pods, 1 parked shuttle, 3 route shuttles):

                       v8 (rhombus)      v9 (genome)
       draw calls           114              125     (header budget 132)
       triangles         13,146           21,440
         trees           11,082           12,450
         planters         1,428            1,428
         transport          636            7,562  (9 craft)

     (v9's first report gave the tree row as 12,510 -> 14,514. Both were wrong and
     the columns did not add up: 12,510 is trees PLUS planters, and 14,514 is the
     v8 whole-population total with the tree delta added to it. The delta itself,
     +1,368, was right. Re-measured by traversing both built populations through
     one code path; the totals and the draw calls were always correct.)
     A craft costs 826 triangles at pod scale and 858 at shuttle scale (the
     shuttle carries four more glazing panes): shell 240 + cap 200 + platinum 304,
     of which the two connection rings are 240 and the medallion rim 64, + crystal
     32 + emblem 24 + accent 24 + underglow 2. setQuality('low') drops the rings,
     the flank emblems and the accent strips: MEASURED on the parked fleet, that
     is 4,988 -> 2,876 triangles, 42% of a craft.
     ONE COST THIS TABLE DOES NOT CARRY: the parked shuttle registers its six
     non-cap meshes with ctx.reflect(), which the assembly turns into six more
     draw calls in its mirrored-copy group (the same convention fobstations.js
     follows). Counted there, not here.
     The canopy budget was 400 in the first build and the crowns came out as
     parasols: a dozen big plates on a nearly-vertical shell normal, seen
     edge-on from eye level. Mass needs COUNT, so the plate count roughly
     doubled and each plate shrank. 621 triangles against a ~150k scene is the
     right side of that trade for the only vegetation the camera gets near.
   - THE THEME IS ENERGY ONLY. Stems, leaves, cores, seams, undersides and the
     heartwood take the world energy colour. Bark, canopy, planter rim, planter
     body, planter void and the two transport metal grades are NATURE AND
     STRUCTURE: fixed values that no Theme may repaint — a platinum is a FINISH,
     not a colour. setTheme() touches the emissive set and nothing else.
   - LAW 2. buildFobPods() answers every emitter it places: each parked craft
     lays a themed pool on the deck through ctx.lightPool, which is the surface
     that actually shows an underglow. The sky route carries the same emitter
     set the v8 rhombus carried and no more, and takes an optional `lightPool`
     so an assembly that has one can answer those too.

   Materials are SHARED per theme, so setTime() on any planter or vehicle (or
   on a route) retunes every object of that theme — call it once per frame per
   theme, not once per object. */

import * as THREE from '../vendor/three/three.module.min.js';
/* THE GENOME. foblock.js is built from a photograph of the real FOB SYSTEMS object and hands out
   parts keyed by material role; §6 roots ALL transport in it and §11 gates on "transport derives
   from the genome's geometry". This module builds nothing of its own for a hull. */
import { foblockParts } from './foblock.js';

export const CANONICAL_THEME = Object.freeze({ energy: 0x7fc6ff, energyLight: 0xdff1ff, name: 'canonical' });

export const PLANTER_SIZES = Object.freeze({
  /* r: half-width (box) or radius (round) of the base; h: base height;
     stem: min/max stem height (m); leaf: min/max leaf height (m);
     stems: min/max primary stems; leaves: hard cap on leaves per planter */
  /* v3: sparser than v2 (detail must not become clutter) */
  small:  { r: 0.34, h: 0.42, stem: [1.2, 1.7], leaf: [0.22, 0.32], stems: [2, 3], leaves: 4 },
  medium: { r: 0.48, h: 0.54, stem: [1.5, 2.4], leaf: [0.28, 0.40], stems: [3, 4], leaves: 5 },
  large:  { r: 0.64, h: 0.68, stem: [2.0, 3.2], leaf: [0.34, 0.45], stems: [3, 5], leaves: 7 }
});

export const TREE_SIZES = Object.freeze({
  /* h: overall tree height (m, canopy crown included); canopy: canopy RADIUS (m);
     tiers: min/max branch tiers; plates: min/max canopy leaf plates.
     Human scale: the skirt of a medium tree hangs at ~2.6 m, so the plaza walks under it. */
  small:  { h: [3.2, 4.2], canopy: [1.45, 1.95], tiers: [2, 2], plates: [24, 30] },
  medium: { h: [4.4, 6.0], canopy: [1.95, 2.75], tiers: [2, 3], plates: [30, 38] },
  large:  { h: [6.0, 8.2], canopy: [2.60, 3.50], tiers: [3, 3], plates: [38, 48] }
});
const TREE_MAX_BRANCHES = 8;          /* triangle budget: 8 branches × 8 tris */
const TREE_TRUNK_SIDES = 5, TREE_BRANCH_SIDES = 4, TREE_SEAM_SIDES = 5;
/* v9 BLUNT WOOD (§06, and the regression v8 shipped knowingly — see the header).
   TIP_FACET is the radius a branch or the trunk leader ENDS on, as a fraction of the radius that
   segment started from. 0 is a needle; anything with a facet takes a highlight. 0.32 of the
   branch's own base is three times §06's own floor and still a small facet at 1.6–2.6 cm across.
   BRANCH_SEAT seats the tip against the crown the way v8 seats a canopy plate: a bare stick
   outside the foliage is a spike whatever its end looks like, so a branch that would finish
   outside is pulled back along its own direction until its tip lies on a shell at this fraction
   of the crown envelope. Both are build-time only. */
const TIP_FACET = 0.32;
const BRANCH_SEAT = 0.94;
const BRANCH_FLOOR = 0.55;            /* a seated branch never loses more than this much of its sweep */
const BRANCH_REACH = 1.45;            /* nor gains more than this much of it */
const TREE_CROWN_CORES = 3;           /* how many crown plates carry a lit core */
const GOLDEN = 2.399963229728653;     /* golden angle — an even shell from a deterministic sequence */

/* v8 crown geometry (see the header). PLATE_CHAMFER is how much of each diamond tip
   is cut back to a flat facet, as a fraction of the plate's length. */
const PLATE_CHAMFER = 0.32;
const PLATE_DEEP = 0.22;              /* share of plates seated deep in the mass rather than on the outline */
const PLATE_DEEP_GAIN = 1.20;         /* and they are bigger, because their job is mass, not outline */
/* The crown ellipsoid the plates are seated against is this multiple of (canopyR, RY).
   It is not 1.0 because a crown whose every plate is bounded by the NOMINAL ellipsoid comes
   out about a tenth narrower than v7's — v7's apparent width WAS its spikes. MEASURED across
   the plaza's 18 trees at four bearings, 1.10 puts the median outline back at 0.967 of the
   nominal crown against v7's 0.958, so the trees are the size they were, while the widest
   point of the crown falls from 1.205x the median (a spike) to 1.125x (the envelope itself). */
const CROWN_ENVELOPE = 1.10;
/* The six outline corners of a canopy plate as (across, along) offsets from the plate's
   OWN CENTRE, in units of its size. The envelope solve tests all six, because the corner
   that breaks the crown's outline is not always the outer one: on the lowest plates of the
   skirt the shell normal points down, the plate stands nearly on end, and it is the INNER
   corner that hangs below the crown. MEASURED before this was six-sided: the outer chamfer
   sat at 1.000 envelopes on every plate of a large tree — exactly seated — while the inner
   corners of the skirt reached 1.142, and that hanging fringe was the last of the spikes. */
const PLATE_CORNERS = [
  [PLATE_CHAMFER * 0.5, PLATE_CHAMFER * 0.5 - 0.5], [0.5, 0], [PLATE_CHAMFER * 0.5, 0.5 - PLATE_CHAMFER * 0.5],
  [-PLATE_CHAMFER * 0.5, 0.5 - PLATE_CHAMFER * 0.5], [-0.5, 0], [-PLATE_CHAMFER * 0.5, PLATE_CHAMFER * 0.5 - 0.5]
];

/* Planter proportions shared by the geometry and the planting (v7 three-band tub). */
const PLANTER_LIP = 0.09;             /* how far the soil sits below the rim (the dark void) */
const PLANTER_INNER = 0.74;           /* inner radius as a fraction of the outer radius — the rest is rim */
const PBAND = { body: 0, rim: 1, void: 2 };

/* Night-time emissive levels; day multiplies them by DAY_FACTOR. */
const NIGHT = Object.freeze({ stem: 1.9, halo: 0.34, leaf: 0.9, seam: 2.2, underside: 1.7, glass: 0.22, shell: 0.06, platinum: 0.04, canopy: 0.5 });
const DAY_FACTOR = 0.25;

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _s = new THREE.Vector3();
/* build-time scratch for the merge kit (never touched by update()) */
const _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _tc = new THREE.Vector3();
const _ea = new THREE.Vector3(), _eb = new THREE.Vector3(), _fn = new THREE.Vector3(), _bc = new THREE.Vector3(), _ref = new THREE.Vector3();
const _u = new THREE.Vector3(), _w = new THREE.Vector3(), _dir = new THREE.Vector3(), _pc = new THREE.Vector3();
const _col = new THREE.Color();

/* ---------------------------------------------------------------- helpers */
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function hashSeed(seed) {
  if (typeof seed === 'number' && isFinite(seed)) return (seed >>> 0) || 0x9e3779b9;
  const s = String(seed == null ? 'mahplaza' : seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 0x9e3779b9;
}
/* mulberry32 — deterministic per seed so a planter looks the same on every device */
function rng(seed) {
  let a = hashSeed(seed);
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function irange(R, lo, hi) { return lo + Math.floor(R() * (hi - lo + 1)); }
function triangles(geo) { return Math.floor((geo.index ? geo.index.count : geo.attributes.position.count) / 3); }

export function resolveTheme(theme) {
  if (!theme) return CANONICAL_THEME;
  const energy = Number.isFinite(theme.energy) ? theme.energy : CANONICAL_THEME.energy;
  const energyLight = Number.isFinite(theme.energyLight) ? theme.energyLight : CANONICAL_THEME.energyLight;
  const name = theme.name || (energy === CANONICAL_THEME.energy && energyLight === CANONICAL_THEME.energyLight ? 'canonical' : 'custom');
  return { energy, energyLight, name };
}

/* ------------------------------------------------------- theme materials */
const THEME_CACHE = new Map();

/* Shared material set for a theme (cached). Returns
   { stem, leaf, seam, underside, shell, planter, planterRim, planterVoid, bark,
     canopy, halo, platinum, glass, theme, setTime, setTheme, time }.
   ENERGY (recoloured by the Theme): stem, leaf, halo, seam, underside, shell,
   platinum, glass. NATURE AND STRUCTURE (never recoloured): planter, planterRim,
   planterVoid, bark, canopy. */
export function themeMaterials(theme) {
  const t = resolveTheme(theme);
  const key = t.energy.toString(16) + ':' + t.energyLight.toString(16);
  const hit = THEME_CACHE.get(key);
  if (hit) return hit;
  const energy = new THREE.Color(t.energy), light = new THREE.Color(t.energyLight);
  const m = {
    theme: t, key,
    /* ---- the three planter bands (v7). A tub is a rim, a body and a void. ----
       BODY: the plaza's own midtone structural blue-graphite, not a neutral grey. */
    planter: new THREE.MeshStandardMaterial({ color: 0x3d4c68, roughness: 0.46, metalness: 0.46, flatShading: true, envMapIntensity: 1.35 }),
    /* RIM: the LOW-metalness platinum grade. A horizontal cap reflects the near-black
       zenith, so a mirror grade renders black up there and only this one reads. */
    planterRim: new THREE.MeshStandardMaterial({ color: 0xb6c4d6, roughness: 0.3, metalness: 0.38, flatShading: true, envMapIntensity: 1.4 }),
    /* VOID: the inner wall and the soil — the darkest value in the object, on purpose,
       and contained inside the tub instead of being the tub. */
    planterVoid: new THREE.MeshStandardMaterial({ color: 0x080b11, roughness: 0.94, metalness: 0.04 }),
    /* tree wood: a midtone crystalline trunk that catches the horizon on its vertical facets */
    bark: new THREE.MeshStandardMaterial({ color: 0x4a5a76, roughness: 0.44, metalness: 0.5, envMapIntensity: 1.35 }),
    /* tree canopy: pale crystal foliage whose top-lit / dark-underside shading is baked
       into the vertex colours of the merged canopy (see buildTree) */
    canopy: new THREE.MeshStandardMaterial({ color: 0xcfe2f5, vertexColors: true, roughness: 0.34, metalness: 0.12, emissive: 0x16283f, emissiveIntensity: NIGHT.canopy, envMapIntensity: 1.25 }),
    /* laser stem: pale rod by day, white-hot core at night; also the prow light */
    stem: new THREE.MeshStandardMaterial({ color: 0x8fa3b8, emissive: light, emissiveIntensity: NIGHT.stem, roughness: 0.35, metalness: 0.1 }),
    /* additive aura around each stem and the root glow disc */
    halo: new THREE.MeshBasicMaterial({ color: energy, transparent: true, opacity: NIGHT.halo, blending: THREE.AdditiveBlending, depthWrite: false }),
    /* square-diamond crystal leaf */
    leaf: new THREE.MeshPhysicalMaterial({ color: light, emissive: energy, emissiveIntensity: NIGHT.leaf, roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, ior: 1.9, transparent: true, opacity: 0.8, flatShading: true }),
    /* vehicle energy seams (belt ring, nose seam, tail bar) */
    seam: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: energy, emissiveIntensity: NIGHT.seam, roughness: 0.5, metalness: 0 }),
    /* vehicle underside plate */
    underside: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: energy, emissiveIntensity: NIGHT.underside, roughness: 0.5, metalness: 0 }),
    /* dark crystalline hull */
    shell: new THREE.MeshPhysicalMaterial({ color: 0x1c212b, emissive: energy, emissiveIntensity: NIGHT.shell, roughness: 0.35, metalness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.15, flatShading: true }),
    /* platinum belt; on a genome-derived craft it is the medallion rim and the two connection rings */
    platinum: new THREE.MeshStandardMaterial({ color: 0xaab2bb, emissive: energy, emissiveIntensity: NIGHT.platinum, roughness: 0.32, metalness: 0.5, flatShading: true }),
    /* ---- THE LAW 1 PAIR for §6 transport. ONE GRADE OF METAL, READ AT TWO ORIENTATIONS. -------
       podShell is materials.js's `platinumMid` — the same colour, roughness, metalness and
       environment strength, repeated here because this module's factories take a THEME rather than
       the world palette and a pod built from a route has no ctx.M to reach for. High metalness, so
       it takes NO diffuse light and is lit only by scene.environment: legal on a VERTICAL or tilted
       face, which reflects the bright horizon band, and that is why a polished platinum pod on a
       near-black plaza reads as the dark chrome the reference render shows.
       podCap is its horizontal partner at LOW metalness — materials.js's `platinumLit` numbers, the
       same grade this file already uses for the planter rim. An up-facing or down-facing face
       reflects the near-black zenith, so a mirror grade renders BLACK there whatever its hex says.
       EVERY horizontal triangle on a craft in this module wears podCap, and which triangles those
       are is MEASURED by splitByNormal() after the stretch, never inherited from a bucket name. */
    podShell: new THREE.MeshStandardMaterial({ color: 0x7e90ae, roughness: 0.24, metalness: 0.94, envMapIntensity: 1.85 }),
    podCap: new THREE.MeshStandardMaterial({ color: 0xb6c4d6, roughness: 0.30, metalness: 0.38, envMapIntensity: 1.40 }),
    /* cabin glass */
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a1220, emissive: energy, emissiveIntensity: NIGHT.glass, roughness: 0.06, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, flatShading: true }),
    time: { daylight: 0, sunElevation: -1, factor: 1 },
    setTime(state) {
      const s = state || {};
      const daylight = clamp01(Number.isFinite(s.daylight) ? s.daylight : 0);
      const sunElevation = Number.isFinite(s.sunElevation) ? s.sunElevation : daylight * 2 - 1;
      const f = lerp(1, DAY_FACTOR, daylight);
      m.stem.emissiveIntensity = NIGHT.stem * f;
      m.halo.opacity = NIGHT.halo * f * f;                   /* the aura fades fastest in sunlight */
      m.leaf.emissiveIntensity = NIGHT.leaf * f;
      m.leaf.opacity = lerp(0.8, 0.92, daylight);           /* crystal reads a touch more solid in sunlight */
      m.seam.emissiveIntensity = NIGHT.seam * f;
      m.underside.emissiveIntensity = NIGHT.underside * f;
      m.glass.emissiveIntensity = NIGHT.glass * f;
      m.shell.emissiveIntensity = NIGHT.shell * f;
      m.platinum.emissiveIntensity = NIGHT.platinum * f;
      /* the canopy is not a lamp: this is a night-lift on foliage, a fixed cool value
         that only follows the hour — the Theme never touches it */
      m.canopy.emissiveIntensity = NIGHT.canopy * f;
      m.time = { daylight, sunElevation, factor: f };
      return m.time;
    }
  };
  for (const k of ['planter', 'stem', 'halo', 'leaf', 'seam', 'underside', 'shell', 'platinum', 'glass']) m[k].name = 'mahplaza-' + k + '-' + t.name;
  /* nature and structure keep ONE name: they belong to no theme. The two transport metal grades
     join them — a platinum is a FINISH, not a colour, and no Theme may repaint it. */
  for (const k of ['planterRim', 'planterVoid', 'bark', 'canopy', 'podShell', 'podCap']) m[k].name = 'mahplaza-' + k;
  /* live world-Theme change: recolour this shared set in place (every planter and
     vehicle built from it follows); the cache is re-keyed so later lookups agree */
  m.setTheme = function (themeIn) {
    const nt = resolveTheme(themeIn);
    const e = new THREE.Color(nt.energy), l = new THREE.Color(nt.energyLight);
    m.stem.emissive.copy(l); m.halo.color.copy(e); m.leaf.color.copy(l); m.leaf.emissive.copy(e);
    m.seam.emissive.copy(e); m.underside.emissive.copy(e); m.shell.emissive.copy(e); m.platinum.emissive.copy(e); m.glass.emissive.copy(e);
    THEME_CACHE.delete(m.key); m.theme = nt; m.key = nt.energy.toString(16) + ':' + nt.energyLight.toString(16); THEME_CACHE.set(m.key, m);
    for (const k of ['planter', 'stem', 'halo', 'leaf', 'seam', 'underside', 'shell', 'platinum', 'glass']) m[k].name = 'mahplaza-' + k + '-' + nt.name;
    return nt;
  };
  THEME_CACHE.set(key, m);
  return m;
}

/* ------------------------------------------------------ shared geometry */
const GEO = {};

function stemGeometry() {   /* unit height, base at origin, slight taper */
  if (!GEO.stem) { const g = new THREE.CylinderGeometry(0.62, 1, 1, 5, 1, true); g.translate(0, 0.5, 0); GEO.stem = g; }
  return GEO.stem;
}
function leafGeometry() {   /* square-diamond: a SQUARE rotated 45° in the plate plane (local XY), thin depth; unit height, bottom vertex at origin */
  if (!GEO.leaf) { const g = new THREE.OctahedronGeometry(1, 0); g.scale(0.5, 0.5, 0.09); g.translate(0, 0.5, 0); GEO.leaf = g; }
  return GEO.leaf;
}
/* CANOPY PLATE (v8) — the same square diamond with both tips CUT BACK to a flat
   facet. Same convention as leafGeometry: unit length along +Y (0 → 1), unit
   width across X, thin in Z, so a plate drops into the same frame the sharp leaf
   used. Cutting fraction PLATE_CHAMFER off each tip along both of its edges turns
   the four-corner rhombus into a six-edge outline; wrapping that outline to the
   two ±Z apexes gives 12 facets instead of 8. THE CHAMFER IS NOT A SMOOTHING —
   it replaces one arris with a third face, so the plate is MORE crystalline and
   its outer end now carries a facet 0.32x the plate width that takes a highlight
   where a vertex could only alias into a hairline.
   Area lost to the two cuts is 10.2%: the plate is 0.4488 against the rhombus'
   0.5000. The blunt end is not literally one facet — it is the two triangles that
   share the 0.32-long tip edge, meeting at a 171 degree dihedral (a 9 degree
   ridge), so it reads as a flat tip rather than being one. What matters is that
   the OUTLINE loses its corner. The solid stays a closed manifold (V8 E18 F12,
   Euler 2) with 12 distinct facet normals, up from the octahedron's 8.
   THE BRAND FIGURE IS NOT THIS. leafGeometry above is the MAHFITT square diamond
   and it keeps its four points — planter leaves, the crown cores and the craft
   prow all still wear it, sharp, on purpose. This is foliage. */
function canopyPlateGeometry() {
  if (GEO.plate) return GEO.plate;
  const hw = PLATE_CHAMFER * 0.5;                 /* half-width of a chamfer facet = 0.16 */
  const lo = hw, hi = 1 - hw;                     /* where the two flats sit along the length */
  const pos = new Float32Array([
    hw, lo, 0, 0.5, 0.5, 0, hw, hi, 0, -hw, hi, 0, -0.5, 0.5, 0, -hw, lo, 0,   /* outline, CCW seen from +Z */
    0, 0.5, 0.09, 0, 0.5, -0.09                                                 /* the two ridge apexes */
  ]);
  const idx = [];
  for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; idx.push(i, j, 6, i, 7, j); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  GEO.plate = g;
  return g;
}
function discGeometry() {   /* unit disc facing +Y */
  if (!GEO.disc) { const g = new THREE.CircleGeometry(1, 10); g.rotateX(-Math.PI / 2); GEO.disc = g; }
  return GEO.disc;
}
/* Surface of revolution with one MATERIAL BAND per profile segment — the lathe
   this module needs, since three's LatheGeometry emits a single group and a
   planter is three values. profile: [[r, y], ...] bottom → top; bands[i] is the
   material index of the segment between point i and i + 1. Faces are wound with
   the lathe convention (dP/ds × dP/dφ), which points OUT on the tub wall, UP on
   the rim and the soil and IN on the void wall — exactly what a pot needs.
   Non-indexed, so computeVertexNormals() bakes one normal per facet. */
function revolveGeometry(profile, segments, phiStart, bands) {
  const cs = [], sn = [];
  for (let s = 0; s < segments; s++) { const a = phiStart + (s / segments) * TAU; cs.push(Math.cos(a)); sn.push(Math.sin(a)); }
  const buckets = new Map();
  const at = (p, s) => new THREE.Vector3(p[0] * cs[s], p[1], p[0] * sn[s]);
  const raw = (arr, a, b, c) => {
    _ea.subVectors(b, a); _eb.subVectors(c, a);
    if (_ea.cross(_eb).lengthSq() < 1e-12) return;              /* collapsed at the axis */
    arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  for (let b = 0; b < profile.length - 1; b++) {
    const p0 = profile[b], p1 = profile[b + 1], mi = bands[Math.min(bands.length - 1, b)];
    let arr = buckets.get(mi); if (!arr) { arr = []; buckets.set(mi, arr); }
    for (let s = 0; s < segments; s++) {
      const s2 = (s + 1) % segments;
      const A = at(p0, s), B = at(p0, s2), C = at(p1, s2), D = at(p1, s);
      raw(arr, A, D, C); raw(arr, A, C, B);
    }
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const total = keys.reduce((acc, k) => acc + buckets.get(k).length, 0);
  const pos = new Float32Array(total);
  const g = new THREE.BufferGeometry();
  let off = 0;
  for (const k of keys) { const arr = buckets.get(k); pos.set(arr, off); g.addGroup(off / 3, arr.length / 3, k); off += arr.length; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* Three-band planter tub: PLATINUM RIM (top chamfer + flat annulus) over a
   MIDTONE BODY (bottom chamfer + wall) around a DARK VOID (inner wall + soil). */
function planterBaseGeometry(size, shape) {
  const key = 'base:v7:' + size + ':' + shape;
  if (GEO[key]) return GEO[key];
  const S = PLANTER_SIZES[size] || PLANTER_SIZES.medium;
  const box = shape === 'box';
  const r = box ? S.r * Math.SQRT2 : S.r;      /* lathe radius reaches the corner of a box */
  const h = S.h, c = (box ? Math.SQRT2 : 1) * 0.09 * h, lip = PLANTER_LIP, ri = r * PLANTER_INNER;
  const profile = [
    [r - c, 0],        /* ↓ body: bottom chamfer                */
    [r, c],            /* ↓ body: outer wall                    */
    [r, h - c],        /* ↓ rim: top chamfer (catches the light)*/
    [r - c, h],        /* ↓ rim: flat annulus — the platinum lip*/
    [ri, h],           /* ↓ void: inner wall dropping to soil   */
    [ri, h - lip],     /* ↓ void: the soil floor                */
    [0, h - lip]
  ];
  const bands = [PBAND.body, PBAND.body, PBAND.rim, PBAND.rim, PBAND.void, PBAND.void];
  const g = revolveGeometry(profile, box ? 4 : 10, box ? Math.PI / 4 : 0, bands);
  GEO[key] = g;
  return g;
}

/* --------------------------------------------------- merge kit (no addons)
   BufferGeometryUtils is an addon and this module vendors nothing but the core,
   so the trees merge their own buffers. Every builder appends flat-shaded
   triangles into one sink and finishSink() turns it into a single geometry.
   `ref` forces a face to point away from a reference point; `tint` bakes a
   vertex colour per face (one face is one facet, so no smoothing is wanted). */
function sink(withColour) { return { pos: [], nrm: [], col: withColour ? [] : null, tris: 0 }; }
function pushFace(out, a, b, c, ref, tint) {
  _ea.subVectors(b, a); _eb.subVectors(c, a); _fn.crossVectors(_ea, _eb);
  const len2 = _fn.lengthSq();
  if (len2 < 1e-14) return;
  _fn.multiplyScalar(1 / Math.sqrt(len2));
  if (ref) {
    _bc.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(ref);
    if (_fn.dot(_bc) < 0) { const t = b; b = c; c = t; _fn.negate(); }
  }
  out.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  out.nrm.push(_fn.x, _fn.y, _fn.z, _fn.x, _fn.y, _fn.z, _fn.x, _fn.y, _fn.z);
  if (out.col) {
    tint(_col, a, _fn); out.col.push(_col.r, _col.g, _col.b);
    tint(_col, b, _fn); out.col.push(_col.r, _col.g, _col.b);
    tint(_col, c, _fn); out.col.push(_col.r, _col.g, _col.b);
  }
  out.tris++;
}
function appendGeo(out, src, matrix, ref, tint) {
  const p = src.attributes.position, ix = src.index, n = ix ? ix.count : p.count;
  for (let i = 0; i < n; i += 3) {
    _ta.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(matrix);
    _tb.fromBufferAttribute(p, ix ? ix.getX(i + 1) : i + 1).applyMatrix4(matrix);
    _tc.fromBufferAttribute(p, ix ? ix.getX(i + 2) : i + 2).applyMatrix4(matrix);
    pushFace(out, _ta, _tb, _tc, ref, tint);
  }
}
/* END CAP (v9). A fan from the ring's own centre out to its rim, wound to face AWAY from the
   tube — this is the flat facet §06 asks a taper to finish on, and it is what turns a branch from
   a hairline into a small cut end that can hold a highlight. A ring of (near) zero radius has no
   facet to cap and is skipped, so a tube that genuinely wants to close on a point still can. */
function capRing(out, ring, centre, inward) {
  if (!ring || ring.length < 3) return;
  if (centre.distanceToSquared(ring[0]) < 1e-8) return;
  _ref.copy(inward);
  for (let k = 0; k < ring.length; k++) pushFace(out, centre, ring[k], ring[(k + 1) % ring.length], _ref, null);
}
/* tapered prism through a chain of { p, r } nodes — trunk, branch, heartwood seam.
   `caps` is a bitmask: 1 caps the START ring, 2 caps the END ring. A branch's start is buried
   inside the trunk and a trunk's foot is buried in the deck, so neither is worth four triangles;
   what needs the facet is every FREE end — the branch tip, the trunk leader, and both ends of the
   heartwood seam, which were open holes in the wood before this. */
function appendTube(out, nodes, sides, roll, caps) {
  const rings = [];
  for (let i = 0; i < nodes.length; i++) {
    _dir.subVectors(nodes[Math.min(nodes.length - 1, i + 1)].p, nodes[Math.max(0, i - 1)].p);
    if (_dir.lengthSq() < 1e-10) _dir.set(0, 1, 0);
    _dir.normalize();
    _u.set(0, 1, 0);
    if (Math.abs(_dir.y) > 0.94) _u.set(1, 0, 0);
    _u.cross(_dir).normalize();
    _w.crossVectors(_dir, _u).normalize();
    const ring = [];
    for (let k = 0; k < sides; k++) {
      const a = roll + (k / sides) * TAU;
      ring.push(new THREE.Vector3().copy(nodes[i].p).addScaledVector(_u, Math.cos(a) * nodes[i].r).addScaledVector(_w, Math.sin(a) * nodes[i].r));
    }
    rings.push(ring);
  }
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    _ref.copy(nodes[i].p).add(nodes[i + 1].p).multiplyScalar(0.5);
    for (let k = 0; k < sides; k++) {
      const j = (k + 1) % sides;
      pushFace(out, A[k], A[j], B[j], _ref, null);
      pushFace(out, A[k], B[j], B[k], _ref, null);
    }
  }
  const last = rings.length - 1;
  if (last < 1) return;
  const c = caps == null ? 2 : caps;
  if (c & 1) capRing(out, rings[0], nodes[0].p, nodes[1].p);
  if (c & 2) capRing(out, rings[last], nodes[last].p, nodes[last - 1].p);
}
function finishSink(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  if (out.col) g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
  g.computeBoundingSphere();
  return g;
}

/* ================================================================= §6 TRANSPORT
   TRANSPORT IS NOT A CAR AND IT IS NOT A RHOMBUS EITHER.

   Up to v8 this module built "square-diamond sky craft": a chamfered rhombus hull with a belt,
   a cabin and a prow light. It had no wheels, no grille and no exhaust, so it passed the letter
   of §6 — and it failed the substance of it, because §6 does not say "not a car", it says where
   transport COMES FROM: FOBLOCK + square diamond + platinum module + black crystal + MAHGIC
   propulsion, and §11 gates on "transport derives from the genome's geometry". A rhombus derives
   from nothing in this world but itself. The rhombus is retired here; every hull below is one
   evaluation of foblock.js.

   WHAT THAT BUYS, read off the genome's own header: the body is a ROUNDED SQUARE IN PLAN with a
   FLAT TABLE top and bottom and a tight fillet on every edge, it carries a circular engraved
   medallion, and it carries TWO LATERAL RINGS at mid height — the family's identifying feature
   and, on a vehicle, exactly what §4 calls "soft connection points": a pod docks to the world
   through rings. The rings become the craft's lateral hover collars, seen as two circles from
   the front and as thin standing hoops from the flank.

     POD (§6A)      one evaluation at POD.size, PROPORTIONS UNTOUCHED. "Small personal hovering
                    rounded block" is the genome at pod scale and nothing else — no stretch, no
                    taper, no nose. It floats POD.hover clear of the deck with no undercarriage.
     SHUTTLE (§6B)  the same evaluation stretched along the genome's DEPTH axis only, which is
                    what "elongated multi-resident floating block" means: still a rounded square
                    in section, still a flat table top, just long. NOT a rhombus and not a wedge.

   LAW 1, AND WHY IT IS RE-MEASURED HERE. The genome splits its own shell into `shell` (normals
   more vertical than horizontal — a mirror grade is legal) and `cap` (up/down facing — a mirror
   grade renders BLACK against a near-black zenith and only a low-metalness partner reads). It
   does that split by MEASURING each triangle's normal. But it measures the UNSTRETCHED block,
   and scaling a body along Z transforms its normals by diag(1, 1, 1/S): at the shuttle's stretch
   a face that measured |ny| = 0.50 measures 0.83 afterwards and has silently become a cap. So
   splitByNormal() takes the split AGAIN, on the transformed triangles, and the cap bucket is the
   only thing that ever reaches a low-metalness grade. This project has shipped a flat up-facing
   mirror four times by trusting a bucket label instead of a normal; it is not doing it again.

   LAW 2. Every pod and the parked shuttle lay a pool on the deck through ctx.lightPool for their
   MAHGIC underglow and their accent strips — buildFobPods() answers each emitter it places, on
   the surface that shows it. The craft on the sky route carry the SAME emitter set the v8 rhombus
   carried and no more; createVehicleRoute() now accepts a `lightPool` so an assembly that has one
   can answer those too (see the note in createVehicleRoute).

   COLOUR. The reference render reads "warm amber accent strips low on the body". WARM IS NOT
   AVAILABLE TO A VEHICLE in this world: hue 28-75 is reserved for light coming from inside a
   building and a test enforces it, and this module's own law is "no yellow or amber anywhere in
   this file". So the accent strips and the underglow take the world ENERGY colour like every
   other seam here. Flagged for the director rather than decided quietly.  */

/* The size ladder for transport, in the genome's own unit: `size` is the block's WIDTH in metres
   and every other proportion follows from it inside foblock.js. */
export const POD = Object.freeze({
  size: 1.90,        /* a one-being block: 1.90 wide x 1.63 deep x 1.94 tall */
  hover: 0.34,       /* how far the flat base floats clear of whatever it is parked on */
  bob: 0.038,        /* idle bob, half-amplitude in metres */
  rate: 0.55         /* idle bob, radians per second */
});
export const SHUTTLE = Object.freeze({
  size: 2.30,
  stretch: 2.60,     /* along the genome's DEPTH axis only: 2.30 x 5.14 x 2.35 */
  hover: 0.46,
  bob: 0.055,
  rate: 0.38
});
const CAP_BAND = 0.62;     /* foblock.js P.capBand — the two must agree or LAW 1 has a seam in it */

/* ---- merge kit, again (three's BufferGeometryUtils is an addon and does not exist here) ----
   Position + normal only, index-aware because TorusGeometry arrives INDEXED. */
function mergeParts(list) {
  const flat = [];
  for (const g0 of list) {
    const g = g0.getIndex() ? g0.toNonIndexed() : g0;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    flat.push(g);
  }
  let n = 0;
  for (const g of flat) n += g.getAttribute('position').count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of flat) {
    const p = g.getAttribute('position'), q = g.getAttribute('normal');
    pos.set(p.array.subarray(0, p.count * 3), o * 3);
    nor.set(q.array.subarray(0, q.count * 3), o * 3);
    o += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}

/* LAW 1, MEASURED. Re-split a set of geometries into { shell, cap } by each triangle's OWN
   normal, after every transform has been applied. Flat normals, one per facet, which is what the
   genome emits anyway and what §06 wants: a rounded silhouette made of cut faces. */
function splitByNormal(geos, band) {
  const shell = { p: [], n: [] }, cap = { p: [], n: [] };
  const B = band == null ? CAP_BAND : band;
  for (const g0 of geos) {
    const g = g0.getIndex() ? g0.toNonIndexed() : g0;
    const p = g.getAttribute('position');
    for (let i = 0; i + 2 < p.count; i += 3) {
      _ta.fromBufferAttribute(p, i); _tb.fromBufferAttribute(p, i + 1); _tc.fromBufferAttribute(p, i + 2);
      _ea.subVectors(_tb, _ta); _eb.subVectors(_tc, _ta); _fn.crossVectors(_ea, _eb);
      const L = _fn.length();
      if (L < 1e-12) continue;
      _fn.multiplyScalar(1 / L);
      const out = Math.abs(_fn.y) > B ? cap : shell;
      out.p.push(_ta.x, _ta.y, _ta.z, _tb.x, _tb.y, _tb.z, _tc.x, _tc.y, _tc.z);
      for (let k = 0; k < 3; k++) out.n.push(_fn.x, _fn.y, _fn.z);
    }
  }
  const mk = s => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(s.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(s.n, 3));
    return g;
  };
  return { shell: mk(shell), cap: mk(cap) };
}

/* THE BRAND FIGURE. A square diamond — a square rotated 45 degrees — flattened through its own
   normal so it sits ON a face as an emblem or a pane instead of standing off it as a caltrop.
   §06's ONE exemption: it keeps its four points. Unit width across X, unit height up Y, thin
   through Z, so it drops into a face frame the same way the planter leaf does. */
function emblemGeometry() {
  if (!GEO.emblem) {
    const diamondEmblem = new THREE.OctahedronGeometry(1, 0);   /* the square-diamond brand figure */
    diamondEmblem.scale(0.5, 0.5, 0.055);
    GEO.emblem = diamondEmblem;
  }
  return GEO.emblem;
}
function barGeometry() {
  if (!GEO.bar) GEO.bar = new THREE.BoxGeometry(1, 1, 1);
  return GEO.bar;
}

/* A flat quad in the XZ plane facing DOWN — the underglow plate. Built rather than taken from
   PlaneGeometry so its winding and its normal are explicit; it is emissive at metalness 0, so it
   is a horizontal face LAW 1 has nothing to say about, and it is counted in the audit anyway. */
function underplateGeometry() {
  if (GEO.underplate) return GEO.underplate;
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(Math.PI / 2);                   /* normal now points at -Y */
  GEO.underplate = g;
  return g;
}

/* THE FLANK'S OWN X AT A POINT, EXACT. The body is a SUPERELLIPSE in plan, so its side is not a
   plane: toward the ends it turns hard around the corner, and an emblem seated at a fixed x would
   float off that corner on a long body and sink into it on a short one. This slices the body's
   triangle soup with the plane y = y0 and then with the plane z = z0 and returns the largest |x|
   of the crossings — the surface the renderer ACTUALLY draws, a 20-sided plan rather than the
   ideal curve, so nothing seated on it can bury itself in a facet.
   MEASURED rather than re-derived: foblock.js keeps its plan exponent private, and a hand-copied
   copy of it here is exactly how two files drift apart. (The first cut of this binned the shell's
   vertices by z instead, and with 20 sides most bins came out empty and were filled from their
   neighbours around the corner — which seated a flank emblem 28 cm inside the body. The audit
   caught it; a bin is not a surface.)
   Build time only, and a handful of queries against ~440 triangles. */
const _slice = [];
function flankX(geos, y0, z0) {
  let best = 0;
  for (const g of geos) {
    const p = g.getAttribute('position');
    for (let i = 0; i + 2 < p.count; i += 3) {
      _ta.fromBufferAttribute(p, i); _tb.fromBufferAttribute(p, i + 1); _tc.fromBufferAttribute(p, i + 2);
      _slice.length = 0;
      for (let e = 0; e < 3; e++) {
        const A = e === 0 ? _ta : e === 1 ? _tb : _tc, B = e === 0 ? _tb : e === 1 ? _tc : _ta;
        const dA = A.y - y0, dB = B.y - y0;
        if ((dA > 0 && dB > 0) || (dA < 0 && dB < 0)) continue;
        const t = Math.abs(dA - dB) < 1e-12 ? 0 : dA / (dA - dB);
        _slice.push(A.x + (B.x - A.x) * t, A.z + (B.z - A.z) * t);
      }
      for (let k = 0; k + 3 < _slice.length; k += 2) {
        const ax = _slice[k], az = _slice[k + 1], bx = _slice[k + 2], bz = _slice[k + 3];
        const dA = az - z0, dB = bz - z0;
        if ((dA > 0 && dB > 0) || (dA < 0 && dB < 0)) continue;
        const t = Math.abs(dA - dB) < 1e-12 ? 0 : dA / (dA - dB);
        const x = Math.abs(ax + (bx - ax) * t);
        if (x > best) best = x;
      }
    }
  }
  return best;
}
/* SEAT AND SIZE A PLATE TOGETHER. A FLAT plate on a CURVED flank can be flush at its middle or at
   its ends but not both, and which way that error runs decides whether the plate reads at all: a
   plate seated on the flank's value under its own CENTRE has its ends buried, and a 0.57 m emblem
   on a 1.9 m pod measured 12 cm inside the body — invisible. Proud is the safe direction (a badge
   standing off a curve is what a badge does), so:
     · shrink the plate until the flank falls away by no more than `tol` across its own footprint;
     · seat it on the MAXIMUM of the flank over that footprint, plus a small lift.
   It is then proud everywhere by between `lift` and `lift + tol`, and buried nowhere. Adaptive
   rather than hand-tuned, so it stays right if the genome's plan or this module's stations move. */
function fitPlate(geos, y0, z0, size, tol) {
  let s = size;
  for (let i = 0; i < 7; i++) {
    let lo = Infinity, hi = 0;
    for (let k = 0; k <= 6; k++) {
      const v = flankX(geos, y0, z0 + (k / 6 - 0.5) * s);
      if (v > 0) { if (v < lo) lo = v; if (v > hi) hi = v; }
    }
    if (!isFinite(lo)) break;
    if (hi - lo <= tol) return { size: s, x: hi, drop: hi - lo };
    s *= 0.82;
  }
  return { size: s, x: flankX(geos, y0, z0), drop: 0 };
}

/* ---------------------------------------------------------------- one hull, by role
   Returns merged geometry per material bucket for ONE craft, in the craft's own frame:
   origin at the body centre in X/Z, y = 0 at the flat base, +Z forward. The buckets are the
   material roles this module actually owns, which is fewer than the genome's seven because two
   pairs share a grade:  shell | cap | platinum (medallion rim + connection rings) |
   crystal (medallion recess + the diamond glazing) | emblem | accent | underglow.        */
const HULL_CACHE = new Map();
function hullParts(spec) {
  const hit = HULL_CACHE.get(spec.key);
  if (hit) { hit.uses++; return hit.g; }

  const w = spec.size, S = spec.stretch || 1;
  const parts = foblockParts({ tier: 'standard', size: w, medallion: true, rings: true, diamond: true, energy: false });

  /* the genome's real extents, MEASURED off what it returned rather than re-derived from its
     private ratios — this stays true if those ratios are ever retuned */
  const box = new THREE.Box3();
  for (const g of parts.shell.concat(parts.cap)) { g.computeBoundingBox(); box.union(g.boundingBox); }
  const hx = box.max.x, hy = box.max.y, hz = box.max.z;
  const HZ = hz * S;                                   /* half LENGTH once stretched */

  const stretch = new THREE.Matrix4().makeScale(1, 1, S);
  const body = [];
  for (const g of parts.shell) body.push(g.clone().applyMatrix4(stretch));
  for (const g of parts.cap) body.push(g.clone().applyMatrix4(stretch));
  /* LAW 1, on the TRANSFORMED triangles — and with a band that knows whether this craft holds
     its attitude. A parked pod is only ever Y-rotated, which leaves |ny| untouched, so the
     genome's own 0.62 is exact. A craft on the sky route BANKS up to 0.38 rad and pitches with
     the curve, so a face that measures |ny| = 0.50 parked can measure 0.83 mid-turn: its band is
     tightened to 0.24, which is cos(acos(0.62) + 26 degrees) and therefore guarantees that no
     triangle in the mirror-grade bucket can become an up-facing mirror at any attitude the route
     puts it in. MEASURED across the loop, this is what takes the exposed mirror area to zero. */
  const split = splitByNormal(body, spec.capBand);

  const platinum = [];
  for (const g of parts.rim) platinum.push(g.clone().applyMatrix4(stretch));
  /* THE CONNECTION RINGS ARE NOT STRETCHED. They are the identifying feature of the family and a
     ring squashed to an ellipse stops being one; on an elongated body they sit at mid length and
     read as lateral hover collars. */
  for (const g of parts.ring) platinum.push(g.clone());

  const crystal = [];
  for (const g of parts.dark) crystal.push(g.clone().applyMatrix4(stretch));

  const emblem = [];
  for (const g of parts.diamond) emblem.push(g.clone().applyMatrix4(stretch));   /* the engraved nose mark */

  /* THE FLANK EMBLEM, which is what the reference render leads with: a bright square diamond on
     the side of the body. It stands clear of the connection ring in Z so the ring never hides it. */
  const em = emblemGeometry();
  const EMBLEM_Y = hy * 0.54, ACCENT_Y = hy * 0.26;
  const TOL = w * 0.015;
  const fitted = [];
  const flankPlace = (sx, z, size, into, lift) => {
    const f = fitPlate(body, EMBLEM_Y, z, size, TOL);
    if (sx < 0) fitted.push({ z: +z.toFixed(3), size: +f.size.toFixed(3), proud: +(w * lift).toFixed(4), drop: +f.drop.toFixed(4) });
    _q.setFromAxisAngle(UP, sx > 0 ? Math.PI / 2 : -Math.PI / 2);
    _m.compose(_v.set(sx * (f.x + w * lift), EMBLEM_Y, z), _q, _s.set(f.size, f.size, f.size));
    into.push(em.clone().applyMatrix4(_m));
  };
  for (const sx of [-1, 1]) {
    flankPlace(sx, HZ * spec.emblemZ, w * spec.emblem, emblem, 0.005);
    /* diamond glazing (§6B "diamond glazing", §6A "black crystalline glass"): panes of the same
       figure in the dark crystal grade, forward of the emblem */
    for (let i = 0; i < spec.panes; i++) {
      const t = spec.panes === 1 ? 0 : i / (spec.panes - 1) - 0.5;
      flankPlace(sx, HZ * (spec.paneZ + t * spec.paneSpan), w * spec.pane, crystal, 0.002);
    }
  }

  /* THE ACCENT STRIPS, low on the body — thin bars let into the flank and standing a few
     millimetres proud of it. A bar is straight and the flank is not, so it goes through the same
     fitPlate() as the emblems, at half the tolerance: it is shortened until the side falls away by
     under a centimetre along its whole length, and there is no gap under its ends.
     The reference calls these amber; see the colour note in the module header. */
  const accent = [];
  const fitStrip = fitPlate(body, ACCENT_Y, 0, HZ * 0.86, TOL * 0.5);
  for (const sx of [-1, 1]) {
    _m.compose(_v.set(sx * (fitStrip.x + w * 0.006), ACCENT_Y, 0), _q.identity(), _s.set(w * 0.022, w * 0.030, fitStrip.size));
    accent.push(barGeometry().clone().applyMatrix4(_m));
  }

  /* THE MAHGIC UNDERGLOW — the propulsion, and the only thing holding the craft off the ground.
     One down-facing emissive plate under the flat base.
     ITS SIZE IS THE BASE TABLE'S, MEASURED, NOT THE BODY'S. The fillet insets the table by a fifth
     of the width on every side, so a plate scaled from the body's half-extents stands PROUD of the
     base and glows past the craft's own silhouette — the first cut of this did exactly that and the
     horizontal-face audit measured 31.4 m2 of emissive underside across nine craft against the v8
     rhombus fleet's 4.9. At 0.62 of the table it sits inside the shadow of the body, which is where
     an underglow belongs: what the viewer reads is the POOL it lays on the deck and its copy in the
     mirror floor, not the strip itself. */
  let bx = 0, bz = 0;
  for (const g of parts.cap) {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > 1e-4) continue;
      bx = Math.max(bx, Math.abs(p.getX(i)));
      bz = Math.max(bz, Math.abs(p.getZ(i)));
    }
  }
  const underglow = [];
  _m.compose(_v.set(0, -w * 0.008, 0), _q.identity(), _s.set(bx * 2 * 0.62, 1, bz * S * 2 * 0.62));
  underglow.push(underplateGeometry().clone().applyMatrix4(_m));

  const g = {
    shell: split.shell, cap: split.cap,
    platinum: mergeParts(platinum), crystal: mergeParts(crystal),
    emblem: mergeParts(emblem), accent: mergeParts(accent), underglow: mergeParts(underglow),
    info: { width: w, halfW: hx, halfL: HZ, height: hy, footprint: Math.max(hx, HZ) }
  };
  /* the working copies have all been folded into the seven role buffers above */
  for (const arr of [body, platinum, crystal, emblem, accent, underglow]) for (const gg of arr) gg.dispose();
  /* the rings reach further sideways than the body does; the footprint has to know that */
  const rb = new THREE.Box3();
  for (const gg of parts.ring) { gg.computeBoundingBox(); rb.union(gg.boundingBox); }
  g.info.footprint = Math.max(g.info.footprint, Math.abs(rb.min.x), Math.abs(rb.max.x));
  g.info.triangles = ROLES.reduce((n, k) => n + triangles(g[k]), 0);
  g.info.plates = fitted;
  g.info.strip = { size: +fitStrip.size.toFixed(3), drop: +fitStrip.drop.toFixed(4) };
  for (const k of Object.keys(parts)) for (const gg of parts[k]) gg.dispose();
  HULL_CACHE.set(spec.key, { g, uses: 1 });
  return g;
}
const ROLES = ['shell', 'cap', 'platinum', 'crystal', 'emblem', 'accent', 'underglow'];
function releaseHull(key) {
  const e = HULL_CACHE.get(key);
  if (!e || --e.uses > 0) return;
  for (const k of ROLES) e.g[k].dispose();
  HULL_CACHE.delete(key);
}

/* The two specs the world actually builds. `emblem` / `pane` are NOMINAL sizes as a fraction of
   the genome's width — fitPlate() shrinks any of them that will not lie on the flank. `*Z` are
   stations along the half-length, POSITIVE FORWARD. They are chosen to keep every plate clear of
   the two connection rings, which stand proud of the flank at mid length: on the pod the emblem
   sits aft and the single dark pane forward, and on the shuttle the emblem rides forward with the
   three glazing panes running aft of the rings, which is where a shuttle's cabin is anyway. */
const POD_SPEC = Object.freeze({
  key: 'pod', size: POD.size, stretch: 1, capBand: CAP_BAND,
  emblem: 0.30, emblemZ: -0.27, pane: 0.30, paneZ: 0.31, paneSpan: 0, panes: 1
});
const SHUTTLE_SPEC = Object.freeze({
  key: 'shuttle', size: SHUTTLE.size, stretch: SHUTTLE.stretch, capBand: CAP_BAND,
  emblem: 0.26, emblemZ: 0.34, pane: 0.26, paneZ: -0.34, paneSpan: 0.42, panes: 3
});
/* the same shuttle, split at the tighter band because it is going to bank (see splitByNormal's
   call site). Its own cache key, so the parked one keeps the crisper split. */
const SHUTTLE_ROUTE_SPEC = Object.freeze(Object.assign({}, SHUTTLE_SPEC, { key: 'shuttle-route', capBand: 0.24 }));

/* Material for each role. The two grades that matter are the LAW 1 pair:
     shell -> podShell, a HIGH-metalness platinum, legal because every triangle in that bucket was
              measured to be more vertical than horizontal, and on a black plaza under a night sky
              a polished platinum reads as the dark chrome the reference render shows;
     cap   -> podCap, the LOW-metalness platinum, which is the only grade an up-facing or
              down-facing face may wear. */
function hullMaterials(mats) {
  return {
    shell: mats.podShell, cap: mats.podCap, platinum: mats.platinum,
    crystal: mats.glass, emblem: mats.leaf, accent: mats.seam, underglow: mats.underside
  };
}

/* ------------------------------------------------------------- planters */
function designStems(S, R) {
  const stems = [];
  const nPrimary = irange(R, S.stems[0], S.stems[1]);
  let leaves = nPrimary;
  const ri = S.r * 0.78;
  const a0 = R() * TAU;
  for (let i = 0; i < nPrimary; i++) {
    const a = a0 + (i / nPrimary) * TAU + (R() - 0.5) * 0.7;
    const rr = ri * (0.2 + 0.55 * R());
    const base = new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr);
    const lean = THREE.MathUtils.degToRad(3 + 11 * R());
    const la = a + (R() - 0.5) * 0.8;
    const dir = new THREE.Vector3(Math.sin(lean) * Math.cos(la), Math.cos(lean), Math.sin(lean) * Math.sin(la)).normalize();
    const height = lerp(S.stem[0], S.stem[1], R());
    const radius = 0.009 + 0.004 * R();
    const leaf = lerp(S.leaf[0], S.leaf[1], R());
    stems.push({ base, dir, height, radius, leaf, jitter: (R() - 0.5) * 1.1 });
    if (leaves < S.leaves && R() < 0.5) {   /* one fork on about half the stems */
      const t = 0.55 + 0.2 * R();
      const bbase = base.clone().addScaledVector(dir, height * t);
      const axis = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).cross(dir).normalize();
      const bdir = dir.clone().applyAxisAngle(axis, THREE.MathUtils.degToRad(18 + 18 * R()));
      if (bdir.y < 0.6) bdir.y = 0.6;
      bdir.normalize();
      stems.push({ base: bbase, dir: bdir, height: height * (1 - t) * (0.55 + 0.4 * R()), radius: radius * 0.75, leaf: leaf * 0.8, jitter: (R() - 0.5) * 1.1, branch: true });
      leaves++;
    }
  }
  return stems;
}

/* Roll (about the stem axis) that turns the leaf plate to face outward from
   the planter centre, so the square-diamond is seen face-on from outside. */
function outwardRoll(st, q) {
  const radial = _v2.set(st.base.x, 0, st.base.z);
  if (radial.lengthSq() < 1e-6) radial.set(st.dir.x, 0, st.dir.z);
  if (radial.lengthSq() < 1e-6) radial.set(1, 0, 0);
  radial.addScaledVector(st.dir, -radial.dot(st.dir)).normalize();   /* project onto the plane ⟂ stem */
  const zq = _v3.set(0, 0, 1).applyQuaternion(q);                    /* plate normal before rolling */
  const cosT = THREE.MathUtils.clamp(zq.dot(radial), -1, 1);
  const sinT = _v.crossVectors(zq, radial).dot(st.dir);
  return Math.atan2(sinT, cosT) + st.jitter;
}

/* createPlanter({ theme, seed, size: 'small'|'medium'|'large', shape: 'box'|'round' })
   → Group with origin at ground centre; userData { setTime(state), triangles, leaves, size, shape }.
   The tub is ONE mesh in three material bands (platinum rim, midtone body, dark
   interior void) — see planterBaseGeometry. */
export function createPlanter(opts) {
  const o = opts || {};
  const size = PLANTER_SIZES[o.size] ? o.size : 'medium';
  const shape = o.shape === 'box' ? 'box' : 'round';
  const S = PLANTER_SIZES[size];
  const mats = themeMaterials(o.theme);
  const R = rng(o.seed == null ? size + ':' + shape : o.seed);
  const group = new THREE.Group();
  group.name = 'planter-' + size + '-' + shape;

  /* three bands, one mesh: [body, rim, void] must match the group indices the
     revolve wrote (PBAND) */
  const base = new THREE.Mesh(planterBaseGeometry(size, shape), [mats.planter, mats.planterRim, mats.planterVoid]);
  base.name = 'base'; base.castShadow = true; base.receiveShadow = true;
  group.add(base);
  let tris = triangles(base.geometry);

  const floorY = S.h - PLANTER_LIP;
  const ri = (shape === 'box' ? S.r * Math.SQRT2 : S.r) * PLANTER_INNER;
  const disc = new THREE.Mesh(discGeometry(), mats.halo);
  disc.name = 'root-glow'; disc.position.y = floorY + 0.004; disc.scale.setScalar(ri * 0.88);
  group.add(disc);
  tris += triangles(disc.geometry);

  const stems = designStems(S, R);
  const n = stems.length;
  const stemMesh = new THREE.InstancedMesh(stemGeometry(), mats.stem, n);
  const haloMesh = new THREE.InstancedMesh(stemGeometry(), mats.halo, n);
  const leafMesh = new THREE.InstancedMesh(leafGeometry(), mats.leaf, n);
  const coreMesh = new THREE.InstancedMesh(leafGeometry(), mats.stem, n);
  stemMesh.name = 'stems'; haloMesh.name = 'stem-halos'; leafMesh.name = 'leaves'; coreMesh.name = 'leaf-cores';
  const coreLocal = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.25, 0), new THREE.Quaternion(), new THREE.Vector3(0.5, 0.5, 0.5));
  for (let i = 0; i < n; i++) {
    const st = stems[i];
    _q.setFromUnitVectors(UP, st.dir);
    stemMesh.setMatrixAt(i, _m.compose(st.base, _q, _s.set(st.radius, st.height, st.radius)));
    haloMesh.setMatrixAt(i, _m.compose(st.base, _q, _s.set(st.radius * 2.9, st.height, st.radius * 2.9)));
    const roll = outwardRoll(st, _q);
    _v.copy(st.base).addScaledVector(st.dir, st.height);
    _q2.setFromAxisAngle(UP, roll);
    _q.multiply(_q2);
    _m.compose(_v, _q, _s.setScalar(st.leaf));
    leafMesh.setMatrixAt(i, _m);
    coreMesh.setMatrixAt(i, _m2.multiplyMatrices(_m, coreLocal));
  }
  for (const im of [stemMesh, haloMesh, leafMesh, coreMesh]) {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.position.y = floorY;
    group.add(im);
    tris += triangles(im.geometry) * n;
  }
  stemMesh.castShadow = true;

  group.userData = {
    kind: 'planter', size, shape, leaves: n, theme: mats.theme.name, triangles: tris,
    setTime(state) { return mats.setTime(state); },
    setTheme(theme) { const t = mats.setTheme(theme); group.userData.theme = t.name; return t; }
  };
  return group;
}

/* ---------------------------------------------------------------- trees */
/* A tree is DESIGNED first (pure numbers, seeded) and then BUILT into three
   merged geometries, so two trees with the same size and seed share one build. */
function designTree(T, R, heightOverride) {
  let height = lerp(T.h[0], T.h[1], R());
  let canopyR = lerp(T.canopy[0], T.canopy[1], R());
  let r0 = height * (0.023 + 0.007 * R());                       /* slim: ~0.15 m at the foot of a 6 m tree */
  if (Number.isFinite(heightOverride)) {
    const k = Math.min(11, Math.max(2.4, heightOverride)) / height;
    height *= k; canopyR *= k; r0 *= k;
  }
  const RY = canopyR * 0.62;                                     /* canopy is oblate: broad, not tall */
  const cy = height - RY;                                        /* canopy centre — crown reaches `height` */
  const trunkTop = cy - RY * 0.38;                               /* the fork sits low in the canopy */
  const leanA = R() * TAU, lean = Math.tan(THREE.MathUtils.degToRad(2 + 6 * R()));
  const lx = Math.cos(leanA) * lean * trunkTop, lz = Math.sin(leanA) * lean * trunkTop;
  const axis = t => new THREE.Vector3(lx * Math.pow(t, 1.4), trunkTop * t, lz * Math.pow(t, 1.4));
  const radius = t => r0 * (1 - 0.58 * t) * (t < 0.02 ? 1.16 : 1);   /* flared root collar at the foot */

  const trunk = [0, 0.36, 0.7, 1].map(t => ({ p: axis(t), r: radius(t) }));
  /* v9: the leader ends on a facet inside the canopy, not on a point. It was r = 0 — a five-sided
     needle standing in the crown — and the same appendTube runs the trunk, so the fix is one law. */
  trunk.push({ p: axis(1.10), r: radius(1) * TIP_FACET });

  /* THE CROWN, KNOWN BEFORE THE BRANCHES ARE CUT. Its centre and semi-axes do not depend on any
     seeded draw made after this point, so computing them here seats the branch tips without
     touching the random stream — every tree keeps the design its seed already gave it except for
     the ~2% of branches that finished outside their own foliage. */
  const centre = new THREE.Vector3(lx, cy, lz);
  const seatA = canopyR * CROWN_ENVELOPE * BRANCH_SEAT, seatB = RY * CROWN_ENVELOPE * BRANCH_SEAT;
  const seatA2 = seatA * seatA, seatB2 = seatB * seatB;
  /* THE TWO LENGTHS AT WHICH A BRANCH CROSSES THE CROWN. E(base + L·u) = 1 is one quadratic,
     a·L² + 2b·L + c = 1; its roots are L1, where the branch ENTERS the foliage, and L2, where it
     would leave it again on the far side. Returns null when the trajectory misses the crown.

     WHICH DIRECTION THE FIX ACTUALLY RUNS, because the first cut of this solve measured as an
     exact no-op and the measurement is the only reason it was caught: the assumption was that an
     exposed tip is a branch reaching too FAR, so clamping to L2 would fix it. It changed nothing —
     every one of the seven offending tips came back byte-identical. They are the opposite case.
     A tip on the lowest tier starts about 1.4 RY BELOW the crown centre on a large tree while the
     foliage stops around 0.9 RY below it, and a short low-elevation limb simply never gets up into
     the canopy: it ends in open air under the skirt, short of L1, not past L2. So the seat is the
     INTERVAL and not the ceiling. */
  const seatSpan = (base, u) => {
    const qx = base.x - centre.x, qy = base.y - centre.y, qz = base.z - centre.z;
    const a = (u.x * u.x + u.z * u.z) / seatA2 + (u.y * u.y) / seatB2;
    const b = (qx * u.x + qz * u.z) / seatA2 + (qy * u.y) / seatB2;
    const c = (qx * qx + qz * qz) / seatA2 + (qy * qy) / seatB2;
    if (!(a > 1e-9)) return null;
    const disc = b * b - a * (c - 1);
    if (disc <= 0) return null;
    const s = Math.sqrt(disc);
    return [(-b - s) / a, (-b + s) / a];
  };

  const tiers = irange(R, T.tiers[0], T.tiers[1]);
  const branches = [];
  const a0 = R() * TAU;
  for (let i = 0; i < tiers; i++) {
    const t = 0.50 + 0.46 * ((i + 0.45) / tiers);
    const base = axis(t), br = radius(t);
    const count = irange(R, 2, 3);
    for (let k = 0; k < count && branches.length < TREE_MAX_BRANCHES; k++) {
      const a = a0 + i * 2.39 + (k / count) * TAU + (R() - 0.5) * 0.6;
      const el = THREE.MathUtils.degToRad(30 + 28 * R());
      let len = canopyR * (0.46 + 0.34 * R());
      const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      /* SEAT THE TIP. The tip travels along dir + 0.10 UP, so that combined direction is what the
         quadratic is solved for; the branch is shortened only when it would finish outside the
         crown, and never lengthened. This is the wood half of v8's plate-seating solve. */
      /* SEAT THE TIP UNDER THE FOLIAGE. Keep the seeded length where it already lands inside the
         crown; otherwise move it to just past L1 (a tip a tenth of the chord inside the shell,
         so it is genuinely under leaves rather than balanced on the surface) or back to L2. The
         move is bounded both ways — BRANCH_FLOOR of the seeded length at the short end,
         BRANCH_REACH at the long end — so a seed keeps the tree it was given. */
      const span = seatSpan(base, _v.copy(dir).addScaledVector(UP, 0.10));
      if (span) {
        const lo = Math.max(span[0], 0), hi = span[1];
        if (hi > lo) {
          const want = Math.min(Math.max(len, lo + (hi - lo) * 0.10), hi);
          len = Math.min(Math.max(want, len * BRANCH_FLOOR), len * BRANCH_REACH);
        }
      }
      /* three nodes so a branch SWEEPS — rises off the trunk, then levels out under the canopy —
         and ends on a small FLAT FACET (v9, §06): TIP_FACET of the radius it started from, capped
         by appendTube, where it used to run to zero and close as a needle */
      branches.push([
        { p: base.clone().addScaledVector(dir, -br * 0.5), r: br * 0.62 },   /* start inside the trunk */
        { p: base.clone().addScaledVector(dir, len * 0.55).addScaledVector(UP, len * 0.12), r: br * 0.34 },
        { p: base.clone().addScaledVector(dir, len).addScaledVector(UP, len * 0.10), r: br * 0.62 * TIP_FACET }
      ]);
    }
  }

  /* canopy plates on an oblate shell, distributed crown → skirt by the golden angle */
  const nPlate = irange(R, T.plates[0], T.plates[1]);
  const spin = R() * TAU;
  const plates = [];
  for (let i = 0; i < nPlate; i++) {
    const v = (i + 0.5) / nPlate;
    const yy = 0.94 - 1.70 * v;                                  /* crown (+0.94) down past the equator (−0.76) */
    const rr = Math.sqrt(Math.max(0.04, 1 - yy * yy));
    const a = spin + i * GOLDEN;
    const puff = 0.84 + 0.26 * R();
    const p = new THREE.Vector3(
      centre.x + Math.cos(a) * rr * canopyR * puff,
      centre.y + yy * RY * (0.92 + 0.16 * R()),
      centre.z + Math.sin(a) * rr * canopyR * puff
    );
    /* plate normal: the shell normal tipped toward the sky. The tip is 0.42, not the 0.85 of the
       first build — at 0.85 every plate faced so nearly straight up that a camera at eye level saw
       the canopy edge-on, which is what made the first trees read as parasols rather than as crowns.
       At 0.42 the crown still lies back to catch the light while the flanks turn out to the viewer
       and the skirt stands up as the silhouette at 20–40 m. */
    const n = new THREE.Vector3((p.x - centre.x) / (canopyR * canopyR), (p.y - centre.y) / (RY * RY), (p.z - centre.z) / (canopyR * canopyR));
    if (n.lengthSq() < 1e-9) n.set(0, 1, 0);
    n.normalize().addScaledVector(UP, 0.42).normalize();
    /* v8 — TWO POPULATIONS, and this is what makes a cluster read as one round mass.
       An OUTLINE plate is seated so its blunt outer facet lands on the crown envelope
       (buildTree solves for it), and it is the smaller of the two. A DEEP plate is
       seated at 0.62–0.78 of that envelope and is 1.2x the size: it never reaches the
       silhouette, it stands behind the outline plates and stops the crown reading as a
       hollow shell of leaves. `env` is the fraction of the envelope its tip may reach.
       Every draw is unconditional so the seeded sequence does not fork. */
    const deep = R() < PLATE_DEEP, depth = R(), grow = R();
    const env = deep ? 0.62 + 0.16 * depth : 0.975 + 0.025 * depth;
    /* smaller plates than the first build (which ran to half the canopy radius, so a crown was only
       a dozen readable leaves). Smaller AND more of them is what makes a canopy read as mass.
       0.36 rather than v7's 0.30: the tip chamfers take ~9% of the plate's area back, and the rest
       is bought deliberately. Once the envelope is a hard bound, plate size no longer widens the
       crown — it only closes the gaps between plates, so it is the one lever that rounds the
       outline for nothing. MEASURED over the plaza's 18 trees at four bearings, walking 0.32 →
       0.36 lifts the share of the outlined crown actually covered from 68% to 75% and lifts the
       notch floor between neighbouring plates from 0.712 to 0.737 of the median outline, at the
       same plate count and the same triangle count. Past ~0.42 the plates start reading as a
       dozen big blades again, which is the failure the first build shipped. */
    const s = canopyR * (0.36 + 0.11 * grow) * (0.86 + 0.30 * rr) * (deep ? PLATE_DEEP_GAIN : 1);
    plates.push({ p, n, s, env, roll: (R() - 0.5) * 0.62 });
  }

  const seamA = R() * TAU;
  const seam = [0.20, 0.97].map(t => {
    const p = axis(t), rr = radius(t);
    return { p: new THREE.Vector3(p.x + Math.cos(seamA) * rr * 0.86, p.y, p.z + Math.sin(seamA) * rr * 0.86), r: Math.max(0.011, rr * 0.19) };
  });

  return { height, canopyR, RY, cy, centre, trunk, branches, plates, seam, tiers };
}

/* One core matrix reused by every crown plate: a small diamond sharing the plate's
   frame, standing proud of both faces so it reads through an opaque leaf. */
const TREE_CORE_LOCAL = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.33, 0), new THREE.Quaternion(), new THREE.Vector3(0.34, 0.34, 1.8));

function buildTree(D) {
  const wood = sink(false), canopy = sink(true), accent = sink(false);
  appendTube(wood, D.trunk, TREE_TRUNK_SIDES, 0.3, 2);          /* the leader's facet; the foot is in the deck */
  for (const b of D.branches) appendTube(wood, b, TREE_BRANCH_SIDES, 0.6, 2);   /* the blunt tip (v9) */
  appendTube(accent, D.seam, TREE_SEAM_SIDES, 0, 3);            /* the seam was open at both ends */

  /* BAKED LIGHT. k rises with how far a facet faces the sky and with how high it
     sits in the canopy, so the crown is lit, the skirt is halved and every
     underside falls to a cool near-black. No light in the scene has to do this. */
  const yBase = D.cy - D.RY, span = 2 * D.RY;
  const tint = (col, p, nrm) => {
    const up = clamp01(nrm.y * 0.5 + 0.5);
    const depth = clamp01((p.y - yBase) / span);
    const k = clamp01(0.10 + 0.90 * Math.pow(up, 1.55) * (0.42 + 0.58 * depth));
    col.setRGB(lerp(0.11, 1, k), lerp(0.14, 1, k), lerp(0.22, 1, k));
  };

  const leaf = leafGeometry(), plate = canopyPlateGeometry();
  const crown = D.plates.slice().sort((a, b) => b.p.y - a.p.y).slice(0, TREE_CROWN_CORES);
  /* THE CROWN ENVELOPE (v8). One oblate ellipsoid, semi-axes (canopyR, RY), and every
     plate is seated against it rather than scattered around it. */
  const cR2 = D.canopyR * D.canopyR * CROWN_ENVELOPE * CROWN_ENVELOPE, rY2 = D.RY * D.RY * CROWN_ENVELOPE * CROWN_ENVELOPE;
  for (const pl of D.plates) {
    /* plate frame: local +Z is the plate normal, local +Y runs outward along the shell.
       The roll about that normal is ±0.31 rad rather than v7's ±0.45: enough that no two
       plates present the same facet angle, little enough that the blunt outer facet stays
       roughly tangent to the envelope instead of turning a side corner into the outline. */
    _u.set(pl.p.x - D.centre.x, 0, pl.p.z - D.centre.z);
    if (_u.lengthSq() < 1e-8) _u.set(1, 0, 0);
    _u.addScaledVector(pl.n, -_u.dot(pl.n));
    if (_u.lengthSq() < 1e-8) _u.set(-pl.n.z, 0, pl.n.x);
    _u.normalize().applyAxisAngle(pl.n, pl.roll);
    _w.crossVectors(_u, pl.n).normalize();
    /* SEAT THE PLATE ON THE ENVELOPE. q is the plate's offset from the crown centre and d
       is one corner's offset from the plate's own middle. Slide the plate along q by a
       scalar k until E(k·q + d) = env² — one quadratic per corner, and the SMALLEST root
       wins, so no corner of the plate can leave the crown. This is the whole of the
       silhouette fix: it replaces the random 0.84–1.10 `puff` that used to throw plate
       tips 22% past the crown with a solve that puts the outermost corner exactly ON it
       (or, for a deep plate, on the shell at `env` of it). Build time only. */
    _v2.subVectors(pl.p, D.centre);
    const eq = (_v2.x * _v2.x + _v2.z * _v2.z) / cR2 + _v2.y * _v2.y / rY2;
    let kFit = Infinity;
    for (const c of PLATE_CORNERS) {
      _v3.copy(_w).multiplyScalar(c[0] * pl.s).addScaledVector(_u, c[1] * pl.s);
      const bd = (_v2.x * _v3.x + _v2.z * _v3.z) / cR2 + _v2.y * _v3.y / rY2;
      const ed = (_v3.x * _v3.x + _v3.z * _v3.z) / cR2 + _v3.y * _v3.y / rY2;
      const disc = bd * bd - eq * (ed - pl.env * pl.env);
      if (!(eq > 1e-9) || disc <= 0) continue;      /* a plate wider than the crown itself: leave it */
      const ki = (-bd + Math.sqrt(disc)) / eq;
      if (ki < kFit) kFit = ki;
    }
    const k = isFinite(kFit) ? Math.min(1.25, Math.max(0.05, kFit)) : 1;
    _pc.copy(D.centre).addScaledVector(_v2, k);                  /* the seated plate centre */
    _m.makeBasis(_w, _u, pl.n);
    _q.setFromRotationMatrix(_m);
    _v.copy(_pc).addScaledVector(_u, -0.5 * pl.s);               /* the plate's middle sits on the seat */
    /* square in plane (1.00, not v7's 0.92): the outline is the brand's own square diamond
       with its two ends chamfered, and a square tip gives the widest flat facet to catch a
       highlight. `_pc` is handed to appendGeo as the winding reference, so every one of the
       twelve facets is forced to face away from the plate's centre. */
    _m.compose(_v, _q, _s.set(pl.s, pl.s, pl.s * 0.30));
    appendGeo(canopy, plate, _m, _pc, tint);
    if (crown.indexOf(pl) >= 0) appendGeo(accent, leaf, _m2.multiplyMatrices(_m, TREE_CORE_LOCAL), null, null);
  }
  return {
    wood: finishSink(wood), canopy: finishSink(canopy), accent: finishSink(accent),
    info: { height: D.height, canopyR: D.canopyR, plates: D.plates.length, branches: D.branches.length, tiers: D.tiers }
  };
}

/* ref-counted share: identical (size, seed, height) trees are one build */
const TREE_GEO = new Map();
function acquireTree(key, build) {
  let e = TREE_GEO.get(key);
  if (!e) { e = { g: build(), uses: 0 }; TREE_GEO.set(key, e); }
  e.uses++;
  return e.g;
}
function releaseTree(key) {
  const e = TREE_GEO.get(key);
  if (!e || --e.uses > 0) return;
  for (const k of ['wood', 'canopy', 'accent']) e.g[k].dispose();
  TREE_GEO.delete(key);
}

/* createTree({ theme, seed, size: 'small'|'medium'|'large' | height in m, height })
   → Group with origin at ground centre, +Y up; three meshes (wood, canopy,
   heartwood), 325 / 437 / 541 triangles by size; userData
   { setTime(state), setTheme(theme), dispose(), triangles, height, canopyRadius } */
export function createTree(opts) {
  const o = opts || {};
  const size = TREE_SIZES[o.size] ? o.size : 'medium';
  const T = TREE_SIZES[size];
  const mats = themeMaterials(o.theme);
  const seed = o.seed == null ? 'tree:' + size : o.seed;
  const hIn = Number.isFinite(o.height) ? o.height : (Number.isFinite(o.size) ? o.size : null);
  const key = size + '|' + String(seed) + '|' + (hIn == null ? '-' : hIn.toFixed(3));
  const G = acquireTree(key, () => buildTree(designTree(T, rng(seed), hIn)));

  const group = new THREE.Group();
  group.name = 'tree-' + size;
  const wood = new THREE.Mesh(G.wood, mats.bark);
  wood.name = 'trunk'; wood.castShadow = true; wood.receiveShadow = true;
  const foliage = new THREE.Mesh(G.canopy, mats.canopy);
  foliage.name = 'canopy'; foliage.castShadow = true;
  const heart = new THREE.Mesh(G.accent, mats.stem);
  heart.name = 'heartwood';
  group.add(wood, foliage, heart);

  let released = false;
  group.userData = {
    kind: 'tree', size, theme: mats.theme.name,
    height: G.info.height, canopyRadius: G.info.canopyR, plates: G.info.plates, branches: G.info.branches, tiers: G.info.tiers,
    triangles: triangles(G.wood) + triangles(G.canopy) + triangles(G.accent), meshes: 3,
    setTime(state) { return mats.setTime(state); },
    setTheme(theme) { const t = mats.setTheme(theme); group.userData.theme = t.name; return t; },
    /* materials are shared per theme and are never disposed here — only this tree's
       share of the merged geometry is given back */
    dispose() { if (released) return; released = true; group.remove(wood, foliage, heart); releaseTree(key); }
  };
  return group;
}

/* createGrove({ theme, seed, count, size, radius }) → Group of 2–5 trees in a
   loose stand (the concept shows trees in groups, never one alone). */
export function createGrove(opts) {
  const o = opts || {};
  const mats = themeMaterials(o.theme);
  const R = rng(o.seed == null ? 'grove' : o.seed);
  const size = TREE_SIZES[o.size] ? o.size : 'medium';
  const count = Math.min(5, Math.max(2, Math.round(Number.isFinite(o.count) ? o.count : 3)));
  const radius = Number.isFinite(o.radius) ? o.radius : 2.6;
  const group = new THREE.Group();
  group.name = 'grove-' + size;
  const trees = [];
  let tris = 0;
  const a0 = R() * TAU;
  for (let i = 0; i < count; i++) {
    const t = createTree({ theme: mats.theme, seed: String(o.seed == null ? 'grove' : o.seed) + ':' + i, size });
    const a = a0 + (i / count) * TAU + (R() - 0.5) * 0.6, rr = radius * (0.35 + 0.65 * R());
    t.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
    t.rotation.y = R() * TAU;
    trees.push(t); group.add(t); tris += t.userData.triangles;
  }
  group.userData = {
    kind: 'grove', size, count, theme: mats.theme.name, triangles: tris, trees,
    setTime(state) { return mats.setTime(state); },
    setTheme(theme) { const t = mats.setTheme(theme); group.userData.theme = t.name; return t; },
    dispose() { for (const t of trees) t.userData.dispose(); }
  };
  return group;
}

/* ------------------------------------------------------------- vehicles */

/* One craft, as seven meshes sharing one cached hull. `origin` decides where y = 0 is: a craft
   built for a route is centred on its own body so the curve can carry it, while one parked on the
   deck stands on its base. Both are the same geometry. */
function craftGroup(spec, mats, name) {
  const G = hullParts(spec);
  const M = hullMaterials(mats);
  const group = new THREE.Group();
  group.name = name;
  let tris = 0;
  for (const k of ROLES) {
    const t = triangles(G[k]);
    if (!t) continue;
    const mesh = new THREE.Mesh(G[k], M[k]);
    mesh.name = name + '-' + k;
    if (k === 'shell' || k === 'cap' || k === 'platinum') { mesh.castShadow = true; mesh.receiveShadow = true; }
    group.add(mesh);
    tris += t;
  }
  group.userData = { hullKey: spec.key, triangles: tris, info: G.info };
  return group;
}

/* createVehicle({ theme, seed, length }) → the §6B SHUTTLE: the genome elongated along its depth
   axis, origin at the body centre, +Z forward. `length` is honoured as the craft's overall LENGTH
   in metres (the v8 signature took the same argument and meant the same thing), applied as a
   uniform scale on the shared hull so every craft on a route is still one geometry.
   userData { setTime(state), triangles, length } */
export function createVehicle(opts) {
  const o = opts || {};
  const mats = themeMaterials(o.theme);
  const R = rng(o.seed == null ? 'vehicle' : o.seed);
  const group = new THREE.Group();
  group.name = 'shuttle';
  const body = craftGroup(SHUTTLE_ROUTE_SPEC, mats, 'shuttle');
  const natural = body.userData.info.halfL * 2;
  const L = Number.isFinite(o.length) ? Math.min(9, Math.max(3, o.length)) : lerp(4.4, 6.2, R());
  const k = L / natural;
  body.scale.setScalar(k);
  body.position.y = -body.userData.info.height * 0.5 * k;   /* the route carries it by its middle */
  group.add(body);
  group.userData = {
    kind: 'vehicle', length: L, theme: mats.theme.name, triangles: body.userData.triangles,
    hullKey: SHUTTLE_ROUTE_SPEC.key,
    setTime(state) { return mats.setTime(state); },
    dispose() { releaseHull(SHUTTLE_ROUTE_SPEC.key); }
  };
  return group;
}

/* ------------------------------------------------- the plaza's parked transport (module contract)
   THE PODS ARE INSTANCED, and that is what makes an idle bob affordable. Merging five pods by role
   would give the same seven draw calls but ONE transform, so every pod would bob in unison, which
   is worse than not bobbing at all. One InstancedMesh per role and one instance per pod costs the
   same seven draw calls and gives every craft its own hover.  */

/* Bearing convention shared with fobstations.js and sky-layout.js: dir(b) = (sin b, 0, -cos b),
   so a Y-rotation that points a craft's local +Z along bearing f is ry = PI - f. */
const yawFor = deg => Math.PI - deg * Math.PI / 180;

/* WHERE THEY PARK. The reference shows pods "in ones and twos, parked and idling, not in traffic",
   so these are two pairs and a single, on the aprons rather than the polished centre. The bearings
   dodge everything that is already spoken for: the three facility approaches run out along -z, -x
   and +x, fobstations.js holds the four diagonals at r = 33 and the music diamonds at r ~ 40, and
   the two market residents stand at (24, -14) and (25.8, -12.2). Every candidate is still TESTED
   against ctx.colliders and ctx.planterSpots before it is built, and a rejected one is counted in
   stats.skipped rather than dropped silently. */
/* R170 §18 — THE FIFTH POD WAS PARKED IN THE ARRIVAL CORRIDOR.
   Four of these sit at x ±16..19.5, z −18..−20: flanking the monument's forecourt, off the axis,
   doing exactly what a parked fleet should do. The fifth stood at (−13, 28.5) — 11 m in front of
   the arrival mark and 13 m off the centre line, which puts it INSIDE the plaza's own long
   sightline, in the near foreground, between the camera and everything the plaza exists to show.
   §18 asks for sight corridors that "intentionally reveal landmarks", and the approach from the
   north is the one corridor this world cannot afford to park in.
   It is MOVED, not deleted (§17: reposition before removing). At (−31, 24) it stands on the plaza's
   west flank, still on the apron, still read as part of the fleet from any camera that turns to
   look — and out of the wedge between the arrival mark and the monument. */
const POD_SPOTS = [
  { x:  16.0, z: -18.0, face: 118 },
  { x:  19.5, z: -20.0, face: 104 },
  { x: -16.0, z: -18.0, face: 242 },
  { x: -19.5, z: -20.0, face: 256 },
  { x: -31.0, z:  24.0, face: 208 }
];
/* THE ASCENT PADS ARE INVISIBLE TO ctx.colliders, AND THAT COST THE FIRST CUT OF THIS FILE A
   SHUTTLE. ground.js, plaza-dressing.js and monument.js all push invisible collider Meshes, so
   clear() sees benches, masts, stairs and the monument. fobeam.js pushes NOTHING: its three ASCENT
   launch pads are real architecture — two chamfered courses (8.4 m and 6.6 m square, turned 45°),
   a coping, four canted mast blades and four buttresses, standing 0.17 m to 1.70 m above the deck
   — and they are simply not in the list. The v9 SHUTTLE_SPOT was (30, -20.5); ASCENT EAST is at
   (32, -18); a 45°-turned 6.6 m course has a half-diagonal of 4.67 m and |dx| + |dz| there is 4.50,
   so the shuttle's CENTRE stood inside the pad's second course and its flat base (DECK_Y + 0.46 =
   0.63) sat 3 cm BELOW that course's top at 0.66. A parked shuttle was planted in a launch pad and
   clear() returned true, because the pad is not a collider.
   Until fobeam.js registers colliders of its own, this table is the keep-out. The radius is the
   CIRCUMSCRIBED radius of the outer course (8.4 × √2 / 2 = 5.94), which is conservative: the pad
   is a diamond, not a disc, so the corners are the only places it actually reaches that far. */
const ASCENT_PADS = [
  { x: -30.0, z: -22.0 },     /* fobeam.js ascent-west  */
  { x:  32.0, z: -18.0 },     /* fobeam.js ascent-east  */
  { x: -13.0, z: -37.0 }      /* fobeam.js ascent-north */
];
const ASCENT_PAD_R = 5.94;
/* one §6B shuttle stands on the east apron, so the apron reads as transport rather than as
   furniture. MEASURED clearances at (33.5, 15.5), worst first: deck edge 3.22 m (r = 36.9 against
   ground.js FIELD_RADIUS 43), large tree at (24, 18) 3.35 m, lamp mast at (26, 16) 4.30 m,
   ascent-east pad 33.5 m. It faces the plaza centre, the same convention fobstations.js derives,
   so its flank — the emblem, the glazing and the accent strip — is what the arrival view sees. */
const SHUTTLE_SPOT = { x: 33.5, z: 15.5, face: 295 };
const DECK_Y = 0.17;          /* ground.js FLOOR_TOP — anything on the plaza stands here */

/* buildFobPods(ctx) → the module contract { group, stats, setTime, setTheme, update, setQuality,
   dispose }. ctx carries THREE, scene, M, theme, colliders, lightPool, planterSpots, reflect. */
export function buildFobPods(ctx) {
  const c = ctx || {};
  const mats = themeMaterials(c.theme);
  const group = new THREE.Group();
  group.name = 'fobpods';
  const stats = { pods: 0, shuttles: 0, skipped: [], pools: 0, poolsDropped: 0, draws: 0, triangles: 0 };

  /* collider boxes, computed once — the same test fobstations.js runs, for the same reason: a
     craft that silently intersects a bench only shows up in a render three rounds later. */
  const boxes = (c.colliders || []).map(o => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); });
  const planted = c.planterSpots || [];
  const clear = (x, z, r, h) => {
    const b = new THREE.Box3(new THREE.Vector3(x - r, DECK_Y - 0.3, z - r), new THREE.Vector3(x + r, DECK_Y + h, z + r));
    for (const o of boxes) if (o.intersectsBox(b)) return false;
    /* planting is not a collider — ground.js hands its spots over instead, and a large tree's
       canopy is 3.5 m of radius that a parked craft must not stand inside */
    for (const s of planted) {
      const keep = r + (s.kind === 'tree' ? 3.6 : 1.1);
      if ((s.x - x) * (s.x - x) + (s.z - z) * (s.z - z) < keep * keep) return false;
    }
    /* and the ASCENT pads, which are architecture that registers no collider — see ASCENT_PADS */
    for (const a of ASCENT_PADS) {
      const keep = r + ASCENT_PAD_R;
      if ((a.x - x) * (a.x - x) + (a.z - z) * (a.z - z) < keep * keep) return false;
    }
    return true;
  };

  /* ---- the pods, one InstancedMesh per role --------------------------------------------------
     REFERENCE COUNTING, spelled out because getting it wrong leaks a buffer per teardown and
     nothing complains: hullParts() takes a reference every time it is called and craftGroup()
     calls it too, so `refs` tallies what this builder actually took and dispose() gives back
     exactly that many. */
  const refs = [];
  const podG = hullParts(POD_SPEC); refs.push(POD_SPEC.key);
  const podR = podG.info.footprint + 0.25;
  stats.footprint = +podR.toFixed(3);
  const placed = [];
  for (const sp of POD_SPOTS) {
    if (!clear(sp.x, sp.z, podR, podG.info.height + POD.hover + 0.4)) { stats.skipped.push('pod@' + sp.x + ',' + sp.z); continue; }
    placed.push(sp);
  }
  const podMeshes = [];
  const podMat = hullMaterials(mats);
  if (placed.length) {
    for (const k of ROLES) {
      if (!triangles(podG[k])) continue;
      const im = new THREE.InstancedMesh(podG[k], podMat[k], placed.length);
      im.name = 'fobpod-' + k;
      if (k === 'shell' || k === 'cap' || k === 'platinum') { im.castShadow = true; im.receiveShadow = true; }
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(im);
      podMeshes.push(im);
      /* NOT ctx.reflect(). The assembly's mirrored-copy helper clones one plain Mesh from
         mesh.geometry at mesh.matrixWorld, which for an InstancedMesh is ONE pod at the group's
         own origin rather than five at their spots — a phantom on the deck. The pods are carried
         by the plaza's real planar mirror pass instead, which sees the scene as it is. */
    }
    placed.forEach((sp, i) => {
      _q.setFromAxisAngle(UP, yawFor(sp.face));
      _v.set(sp.x, DECK_Y + POD.hover, sp.z);
      _m.compose(_v, _q, _s.setScalar(1));
      for (const im of podMeshes) im.setMatrixAt(i, _m);
      /* LAW 2: the underglow and the accent strips are answered on the deck they float over. The
         pool is themed (hue null), so ground.js's own time hook carries it with the world Theme
         and the hour, exactly like the seat seams and the monument. */
      if (c.lightPool) {
        if (c.lightPool({ x: sp.x, z: sp.z, rx: 6.2, rz: 6.2, k: 0.30 })) stats.pools++;
        else stats.poolsDropped++;
      }
      stats.pods++;
    });
    for (const im of podMeshes) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  }

  /* ---- one parked shuttle -------------------------------------------------------------------- */
  let parked = null;
  const sh = SHUTTLE_SPOT;
  const shG = hullParts(SHUTTLE_SPEC); refs.push(SHUTTLE_SPEC.key);
  if (clear(sh.x, sh.z, shG.info.footprint + Math.max(0, shG.info.halfL - shG.info.footprint) * 0.5 + 0.3, shG.info.height + SHUTTLE.hover + 0.4)) {
    parked = craftGroup(SHUTTLE_SPEC, mats, 'fobshuttle'); refs.push(SHUTTLE_SPEC.key);
    parked.position.set(sh.x, DECK_Y + SHUTTLE.hover, sh.z);
    parked.rotation.y = yawFor(sh.face);
    group.add(parked);
    if (c.lightPool) {
      if (c.lightPool({ x: sh.x, z: sh.z, rx: 8.4, rz: 8.4, rot: parked.rotation.y, k: 0.30 })) stats.pools++;
      else stats.poolsDropped++;
    }
    if (c.reflect) { parked.traverse(o => { if (o.isMesh && !/-cap$/.test(o.name)) { try { c.reflect(o); } catch (e) {} } }); }
    stats.shuttles++;
  } else {
    stats.skipped.push('shuttle@' + sh.x + ',' + sh.z);
  }

  /* ---- measure, honestly (a count is not a geometry) ----------------------------------------- */
  group.traverse(o => {
    if (!o.isMesh) return;
    stats.draws++;
    const g = o.geometry, idx = g.getIndex();
    stats.triangles += ((idx ? idx.count : g.getAttribute('position').count) / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  if (c.scene) c.scene.add(group);

  const phase = placed.map((sp, i) => (i * GOLDEN) % TAU);
  const shPhase = 1.7;
  let disposed = false;
  return {
    group, stats,
    setTime(clockState) { return mats.setTime(clockState); },
    setTheme(theme) { return mats.setTheme(theme); },
    /* THE IDLE. A parked pod is not still: it hangs on its underglow and breathes. One sine per
       craft, no allocation, and the amplitude is small enough (3.8 cm) that it reads as hover
       rather than as bouncing. */
    update(t) {
      const tt = Number.isFinite(t) ? t : 0;
      if (podMeshes.length) {
        /* an indexed for, not forEach: a callback literal in a per-frame method allocates a fresh
           closure every frame, and this runs at 60 Hz on a phone. Everything else here is the
           module's build-time scratch, reused — update() allocates nothing. */
        for (let i = 0; i < placed.length; i++) {
          const sp = placed[i];
          _q.setFromAxisAngle(UP, yawFor(sp.face));
          _v.set(sp.x, DECK_Y + POD.hover + Math.sin(tt * POD.rate + phase[i]) * POD.bob, sp.z);
          _m.compose(_v, _q, _s.setScalar(1));
          for (const im of podMeshes) im.setMatrixAt(i, _m);
        }
        for (const im of podMeshes) im.instanceMatrix.needsUpdate = true;
      }
      if (parked) parked.position.y = DECK_Y + SHUTTLE.hover + Math.sin(tt * SHUTTLE.rate + shPhase) * SHUTTLE.bob;
    },
    /* LOD: on a low tier the lateral rings, the flank emblems and the accent strips go — the
       rounded block, its caps, its glazing and its underglow are what carry the read at distance. */
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      group.traverse(o => { if (o.isMesh && /-(platinum|emblem|accent)$/.test(o.name)) o.visible = !low; });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const k of refs) releaseHull(k);
      if (group.parent) group.parent.remove(group);
    }
  };
}

/* createVehicleRoute(points, { theme, count (3..5), speed (m/s, default 9), seeds, length, bank,
                                lightPool })
   points: closed CatmullRom loop in the sky (THREE.Vector3[] or {x,y,z}[])
   → { group, curve, vehicles, update(tSeconds), setTime(state), setTheme(theme), dispose(),
       triangles }

   LAW 2 AND THE SKY ROUTE, stated plainly rather than glossed. A craft on this loop carries the
   SAME emitter set the v8 rhombus carried — an underglow plate and the accent strips, no more —
   and it flies 14-24 m over the district, where this module has no surface of its own to answer
   on. `lightPool` is the hook for an assembly that does: pass ground.js's ctx.lightPool and each
   waypoint the route passes low over gets a pool laid under it. When it is absent nothing new is
   emitted that was not already there, but the debt is real and it is the assembly's to settle —
   one line in the caller (`lightPool: ctx.lightPool`). */
export function createVehicleRoute(points, opts) {
  const o = opts || {};
  const mats = themeMaterials(o.theme);
  const pts = (points || []).map(p => p && p.isVector3 ? p.clone() : new THREE.Vector3(p.x, p.y, p.z));
  if (pts.length < 3) throw new Error('createVehicleRoute needs at least 3 points');
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
  curve.arcLengthDivisions = 400;
  const length = curve.getLength();
  const count = Math.min(5, Math.max(3, Math.round(Number.isFinite(o.count) ? o.count : 4)));
  const speed = Number.isFinite(o.speed) ? o.speed : 9;
  const bankGain = Number.isFinite(o.bank) ? o.bank : 0.55;
  const seeds = Array.isArray(o.seeds) ? o.seeds : [];
  const R = rng(o.seed == null ? 'route:' + mats.theme.name : o.seed);

  const group = new THREE.Group();
  group.name = 'vehicle-route';
  const vehicles = [];
  let tris = 0;
  for (let i = 0; i < count; i++) {
    const v = createVehicle({ theme: mats.theme, seed: seeds[i] != null ? seeds[i] : 'route-vehicle-' + i + ':' + Math.floor(R() * 1e6), length: o.length });
    v.userData.routeOffset = i / count;
    v.userData.phase = R() * TAU;
    v.userData.bobAmp = 0.10 + 0.10 * R();
    vehicles.push(v); group.add(v); tris += v.userData.triangles;
  }

  /* LAW 2, where the caller has given this route somewhere to answer on. A craft is only worth a
     pool where it passes LOW — the loop climbs to 24 m over the district and a pool under that is
     a stain, not an answer — so the sample walks the curve and lays one under each waypoint that
     sits within POOL_CEILING of the ground. Themed, so ground.js's clock hook carries it. */
  let pools = 0;
  if (typeof o.lightPool === 'function') {
    const POOL_CEILING = 20;
    const probe = new THREE.Vector3();
    const n = Math.max(4, Math.min(10, pts.length));
    for (let i = 0; i < n; i++) {
      curve.getPointAt(i / n, probe);
      if (probe.y > POOL_CEILING) continue;
      const rr = 4 + probe.y * 0.55;
      if (o.lightPool({ x: probe.x, z: probe.z, rx: rr, rz: rr, k: 0.16 })) pools++;
    }
  }

  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3(), tan = new THREE.Vector3(), tan2 = new THREE.Vector3(), left = new THREE.Vector3(), look = new THREE.Vector3();
  function update(tSeconds) {
    const t = Number.isFinite(tSeconds) ? tSeconds : 0;
    const travelled = (t * speed) / length;
    for (const v of vehicles) {
      let u = (v.userData.routeOffset + travelled) % 1; if (u < 0) u += 1;
      curve.getPointAt(u, pos);
      curve.getTangentAt(u, tan);
      curve.getTangentAt((u + 0.004) % 1, tan2);
      left.crossVectors(up, tan).normalize();
      const turn = tan2.sub(tan).dot(left) / 0.004;          /* + = turning left */
      const bank = THREE.MathUtils.clamp(-turn * bankGain * 0.02, -0.38, 0.38);
      pos.y += Math.sin(t * 0.7 + v.userData.phase) * v.userData.bobAmp;
      v.position.copy(pos);
      v.up.copy(up);
      v.lookAt(look.copy(pos).add(tan));                    /* non-camera lookAt: +Z toward the target */
      v.rotateZ(bank);
    }
  }
  update(0);

  let released = false;
  return {
    group, curve, vehicles, length, speed, count, pools,
    update,
    setTime(state) { return mats.setTime(state); },
    setTheme(theme) { return mats.setTheme(theme); },
    /* the same LOD the parked craft use: at 60-137 m the rings, the flank emblems and the accent
       strips are sub-pixel detail on a phone, and they are 45% of a craft's triangles */
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      group.traverse(o => { if (o.isMesh && /-(platinum|emblem|accent)$/.test(o.name)) o.visible = !low; });
    },
    /* the craft share ONE cached hull through hullParts(); this gives back their references so a
       torn-down route frees the buffers instead of leaking them (v8 had no dispose at all) */
    dispose() {
      if (released) return;
      released = true;
      for (const v of vehicles) { if (v.userData && v.userData.dispose) v.userData.dispose(); }
      if (group.parent) group.parent.remove(group);
    },
    triangles: tris
  };
}
