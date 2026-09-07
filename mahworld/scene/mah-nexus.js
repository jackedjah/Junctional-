/* MAHWORLD R6 :: MAH NEXUS — the ground-to-halo transport organism.

   R6 §1 names it the highest-priority new world object: "a monumental GROUND-TO-HALO TRANSPORT /
   SUPPORT COMPLEX ... a major transport building, a vertical world connector, an architectural
   support/branch system for MAH HALO, one of the cleanest hero artifacts in MAHWORLD."

   §2 is unusually specific about what it must NOT be, and the list is the useful half of the brief:

       not a generic tower        not a bundle of pipes        not a crystal spike
       not an industrial refinery not a shard tree

   "It should feel like an engineered living platinum transport organism." Everything below is an
   attempt to earn that sentence with geometry rather than with adjectives.

   ---- THE SITE, AND WHY THE FIRST SWEEP WAS WORTHLESS -------------------------------------------
   The first site sweep asked "where is the ground flat and unbuilt" and returned ZERO clear sites
   anywhere in r 280..700. I was one step from writing that down as a fact about a crowded world.
   It was not. It was a fact about two mistakes, and both are the same mistake this project keeps
   making — measuring something adjacent to the question instead of the question:

     1. The `built` filter matched /city/, and the world's ground plane is named `city-ground`. So
        every "occupied" site was occupied by the FLOOR. A follow-up probe that NAMED the objects
        instead of counting them found the tallest thing standing on the best candidate was 3.2 m.
        This is the third filter in this session to match the thing it was meant to exclude.

     2. Far worse: every radius I swept — 280 to 700 — is INSIDE MAH HALO's hole (halo.js R_IN 700).
        R6 §3 requires the trunks to connect PHYSICALLY into the halo underside. A base inside the
        hole cannot do that; its branches would have to lean hundreds of metres sideways to find any
        ceiling at all. The governing constraint was never "is the ground flat here". It was "can a
        trunk rise from here and LAND on something", and not one sample I took was in the band where
        the answer could be yes.

   The rewritten sweep then returned NO GROUND AT ALL, anywhere, at any radius — and that was the
   fourth instrument failure, not a fifth fact:

     3. The pool classifier read `/halo|rain|cloud|sky|star/` as "ceiling", and TERRAIN CONTAINS
        RAIN. terrain-land, terrain-range-near, -mid, -far and terrain-basin were every one of them
        filed as sky and deleted from the ground pool. I had introduced `rain` as a filter word
        because I built the rain module; "terrain" was collateral. Two sweeps then reported an
        empty world, which I was again one step from believing.

   The fix is not a better substring — it is to stop using substrings. These names are hyphen
   delimited, so the classifier matches whole TOKENS: `terrain-range-near` is [terrain, range, near]
   and `mah-rain-curtain` is [mah, rain, curtain], and they can never collide again.

   ---- WHAT THE WORKING INSTRUMENT SAID ----------------------------------------------------------
   With errors reported instead of swallowed, misses counted instead of scored as -2e9, and the
   token classifier in place, the whole compass was swept at r 850..1800:

       MAHWORLD HAS NO FLAT GROUND IN THE HALO-REACHABLE BAND EXCEPT INSIDE THE TWO PASSES.

   Everything else is terrain-range at 150 to 217 m of relief with rock on 21 of 25 samples. And
   that is not bad luck — terrain.js CUT those passes flat, on purpose, so the two peer cities could
   be seen and flown to. The only flat halo-reachable ground in this world is the ground that was
   deliberately flattened.

   ---- SO THE PASS IS THE SITE, AND THAT IS A COMPOSITION ----------------------------------------
   MAH NEXUS stands on the rainforest pass axis (terrain.js PASSES 'rainforest', 108..146, centre
   127) at bearing 126, r 1750 — 1050 m BEYOND Rainforest City, which sits at bearing 127, r 700.
   The confirming probe:

       relief 0.0 m across an 800 m footprint      rock 0/25       nothing built under it
       vertical column to the halo underside clear 0/25
       ground dead flat at y -0.1 from r 600 out to r 2000
       sight line from the plaza: nothing occludes the trunk above y 400 except cloud

   Standing on a preserved sight line sounds like a conflict and is the opposite of one. The pass
   was opened so there would be something to look at down it; a 1794 m monument TERMINATES that axis
   instead of blocking it. Rainforest City becomes the foreground that gives the trunk its scale,
   the two range shoulders frame it left and right, and §10's "roads/paths/FOBEAMs converge" on the
   approach is already true because the corridor exists.

   From the world view the implication §3 asks for is then unavoidable: the sanctuary is not
   floating arbitrarily, because you can see what it stands on.

   ---- ONE MEMBER GENOME (L42) -------------------------------------------------------------------
   The core trunk, the six primary trunks, the ring collars and all thirteen tubes are ONE function,
   `sweptTube`. It sweeps a rounded-square section of varying half-extent, exponent and twist along a
   curve, using a parallel-transport frame so a straight run does not flip its section the way a
   Frenet frame does. Two tables describing one thing is how geometry drifts; there is one table.

   The section is a ROUNDED SQUARE, not a circle, and its exponent is the whole §5 argument in one
   number: exponent 2 is a circle, exponent 8 is nearly a square with hard corners. Everything here
   lives between 3.0 and 4.6 — square enough to belong to a world of diamonds, round enough that
   §5's "no razor corners, large radii, blended curvature" is satisfied by construction rather than
   by a chamfer bolted on afterwards.

   ---- WHAT THIS PASS IS ------------------------------------------------------------------------
   §21 PASS 1: "Block MAH NEXUS base/trunk/tube families at correct world scale. No detailing until
   far silhouette works." So there are no doors here, no portal jambs, no concourse, no status nodes.
   Those are PASS 4/5/6 and they are listed in the module's own carry-over table at the bottom.

   buildMahNexus(ctx, opts) -> the standard module contract, plus navSites() and nexusSurface(). */

import * as THREE from '../vendor/three/three.module.min.js';
import { applyPlatinumFinish } from './materials.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/* terrain.js's bearing convention, quoted. The world has one. */
const polar = (aDeg, r) => [r * Math.cos(aDeg * DEG), -r * Math.sin(aDeg * DEG)];
const gold = i => (i * 0.6180339887) % 1;
const frac = i => (i * 0.7548776662) % 1;

/* ================================================================================================
   THE NUMBERS. Every one of them is either measured out of the assembled scene or derived from a
   number that was, and the derivation is written next to it.
   ================================================================================================ */
export const NEXUS = Object.freeze({
  /* THE SITE. Measured, and the measurement is the whole argument — see THE SITE in the header.
     bearing 126, r 1750: relief 0.0 m across an 800 m footprint, rock 0/25, nothing built under it,
     vertical column to the halo underside clear 0/25, ground dead flat at y -0.1 from r 600 to
     r 2000. It is the pass axis (terrain.js PASSES 'rainforest' 108..146, centre 127), 1050 m
     beyond Rainforest City. */
  BEARING: 126,
  R: 1750,
  GROUND_Y: -0.1,

  /* THE CEILING. halo.js: Y 1800, R_MID 2050, R_DISH 23000, THICK 16. The underside over this site
     is haloHeight(R) - THICK/2, and the trunks are built to MEET it, not to stop short of it —
     §3's "connect physically" is a geometric assertion this module has a gate for. */
  HALO_Y: 1800, HALO_R_MID: 2050, HALO_R_DISH: 23000, HALO_THICK: 16,
  HALO_R_IN: 700, HALO_R_OUT: 3400,

  /* THE BASE — §2 "wide circular/rounded-square civic base". Three tiers, each a rounded square
     that gets rounder as it rises, so the plan turns from civic (square, addressable, has corners
     you can stand on) to structural (round, which is what a trunk springs from).

     THE BASE GAINS ITS PRESENCE IN HEIGHT, BECAUSE WIDTH IS NOT AVAILABLE. §2 asks for a "massive
     premium central base" and the first build gave it 92 m under a 1702 m trunk — five per cent of
     the object, which reads as a footing, not as half of what the brief describes. The obvious fix
     is to widen it and the SITE FORBIDS THAT: the footprint probe returned relief 0.0 m out to
     400 m and 105.5 m of rock past it, so 400 is a wall, and the tube families already stand at
     r 262 with the petals closing at 389. Height costs nothing. At 208 m the base is twelve per
     cent of the complex and reads as architecture from the pass mouth, while the trunk still
     dominates it four to one — which is §8's requirement stated as a ratio, not an adjective. */
  TIERS: Object.freeze([
    { a: 300, y0: 0,   y1: 64,  n: 4.0, mat: 'deck'  },   /* PLINTH: the ground address */
    { a: 236, y0: 64,  y1: 140, n: 4.6, mat: 'deck'  },   /* CONCOURSE: the level §9 will open up */
    { a: 176, y0: 140, y1: 208, n: 6.0, mat: 'plate' }    /* COLLAR: where the trunk springs */
  ]),
  SPRING_Y: 208,

  /* WHERE EACH FAMILY STANDS, and this table exists because the first build had none.

     The approach render showed six trunks with open mouths HANGING IN THE AIR: the primaries were
     seated at r 196 on a collar whose half-extent is 168, so their feet met nothing. A member has
     to stand on a deck wide enough to hold it, and "wide enough" is arithmetic, not judgement —
     SEAT_R + R0 <= that tier's half-extent. buildMahNexus checks it and publishes the result.

     The seating is concentric on purpose, and it is also the answer to §8's "keep the central trunk
     dominant": the PLINTH carries the tube families at r 240-262, the CONCOURSE carries the six
     primary trunks at r 186, and the COLLAR carries the core alone. Reading inward from the ground
     the members get fewer and heavier until there is one, which is what makes the centre dominant
     without making it merely taller. */
  SEAT_Y: Object.freeze([64, 140, 208]),   /* the top of each tier, in order */

  /* THE CORE TRUNK. 1586 m of rise on a 300 m section is 5.3:1 — the Washington Monument is 10:1
     and reads as monumental, not slender, so this is stockier still. §2's "not a crystal spike" is a proportion instruction
     before it is a shape instruction, and this is the proportion that answers it. The waist is what
     stops it reading as an extrusion: it draws IN through the lower third and flares out again into
     a capital, so the silhouette has a profile rather than an outline. */
  CORE: Object.freeze({
    SEAT_TIER: 2, R0: 150, R_WAIST: 104, WAIST_AT: 0.42, R_CAP: 158, CAP_AT: 0.93,
    N0: 3.2, N1: 4.2,               /* section exponent: rounder at the ground, squarer at the top */
    TWIST: 0.36,                    /* radians over the whole rise — the "living" quality, and it is
                                       deliberately small: a twist you can SEE is a novelty column */
    STATIONS: 112, RADIAL: 44
  }),

  /* PRIMARY TRUNKS — §3's top tier of the hierarchy. Six, on the collar, leaning gently OUTWARD so
     they land on the halo underside spread wider than the base: the ring is carried, not poked. */
  PRIMARY: Object.freeze({
    COUNT: 6, SEAT_TIER: 1, SEAT_R: 186, LAND_R: 430, LAND_VARY: 130, R0: 46, R1: 38, N: 3.6,
    PHASE: 12,                      /* degrees, so no trunk sits on a base corner */
    STATIONS: 72, RADIAL: 26
  }),

  /* RING NODES — §2's "reconnecting through rings/nodes". Three collars that tie the primaries and
     the tube families into one object. In silhouette they are what turns six verticals into a
     structure; without them the far view is a bundle of pipes, which §2 names as a failure. */
  RINGS: Object.freeze([
    { at: 0.26, r: 250, sec: 20, n: 4.0 },
    { at: 0.56, r: 322, sec: 17, n: 4.0 },
    { at: 0.82, r: 396, sec: 14, n: 4.0 }
  ]),

  /* TERTIARY CONNECTORS — §3's third tier, and the reason it exists is a sentence in §3 rather than
     a structural intuition: "Do not make every support identical." A complex with primaries and
     branches and nothing between them has TWO sizes of member, and two sizes is not a hierarchy.

     Each connector leaves a primary trunk and merges INWARD and UPWARD into the core, the way a
     limb rejoins a body. Two things keep this from becoming a wheel of spokes, which is what a
     radial connector wants to be: they sit at eight DIFFERENT heights that step around the complex,
     and they arrive at the core tangentially rather than pointing at its axis. A spoke says
     "machine"; a merge says "organism", and §2 asked for the second one by name.

     Widths are the hierarchy stated as numbers, and the gate below checks the ladder is strictly
     decreasing: core 150 > primary 46 > branch 33 > tertiary 22 > mahgic 3.4. */
  TERTIARY: Object.freeze({
    COUNT: 8, R0: 22, R1: 15, N: 3.4,
    LO: 0.14, HI: 0.78,       /* fraction of the rise: where the lowest and highest connector sit */
    TANGENT: 0.34,            /* how far off-axis it meets the core, as a fraction of the core radius */
    STATIONS: 28, RADIAL: 14
  }),

  /* FOBEAM / MAHGIC LINES — §3's fourth tier, "some carry MAHGIC/FOBEAM traffic".

     The GAUGE IS QUOTED FROM fobeam.js, not invented: that module's own rails run 0.085 to 0.46 m
     and its route gauges 0.46 to 0.78, and they read across kilometres because they are ADDITIVE
     EMISSIVE, not lit solids. A lit solid at that section would be L58's crawling hairline; an
     additive one glows wider than its geometry and is the world's established answer.

     v10 §13 is the other half of the brief here — "FOBEAM lines over-bright, arcs lattice the sky"
     — so there are six, they follow members that already exist, and they do not cross. A line that
     invents its own path is what turns a structure into a lattice.

     AND THEY CAME IN TOO BRIGHT ANYWAY, exactly as v10 §13 predicted. Measured on the first build, from
     the trunk-up camera: the rails rendered at luminance 191.7 against a trunk at 108.8 and a tube
     at 99.2 — eighty-three points brighter than the structure they exist to accent — and from the
     world camera at 254.8, past the sky's own 195.8 and into clipped white. A fourth tier that
     out-values the first three is not an accent, it is the subject.

     Opacity 0.42 -> 0.15 and the colour drops from energyLight (0xdff1ff, near-white) to energy
     (0x7fc6ff, the theme's actual blue). An accent has to be a COLOUR against the metal, not a
     brighter version of it; the gate below now holds the rails under the trunk they run on. */
  MAHGIC: Object.freeze({ COUNT: 6, R: 3.4, OFFSET: 1.30, OPACITY: 0.15, STATIONS: 64, RADIAL: 8 }),

  /* THE TUBE FAMILIES — §2: "some straight, some gently spiraling, some branch-like, some paired".
     Entropy in route variety is allowed; chaos is not. So the variety is enumerated, not random. */
  STRAIGHT: Object.freeze({ COUNT: 4, SEAT_TIER: 0, SEAT_R: 262, LAND_R: 300, R: 24, N: 3.4, PHASE: 45 }),
  SPIRAL: Object.freeze({ COUNT: 3, SEAT_TIER: 0, SEAT_R: 240, LAND_R: 380, R: 27, N: 3.2, TURNS: 1.15, PHASE: 20 }),
  BRANCH: Object.freeze({ COUNT: 6, SPLIT_AT: 0.44, SEAT_R: 96, LAND_R: 660, R0: 33, R1: 21, N: 3.4, PHASE: 30 }),
  TUBE_STATIONS: 80, TUBE_RADIAL: 20,

  /* THE TUBULAR DIAMOND ENTRY SYSTEM — §4, which is the most specified section in the whole master
     and describes a DOOR rather than a hole:

         large-radius rounded rectangular / rounded diamond mouth,   no razor corners,
         deep physical jamb,   crystal-clear or smoked transparent tube throat,
         platinum casing,   black-crystal recess,   square-diamond status node

     Every one of those is a piece of geometry here except the internal traveling light and the
     audio-reactive line group, which are motion and belong to PASS 10.

     THE MOUTH IS WIDER THAN TALL, and that is not a proportion I chose. §06 is a standing world law
     — square diamonds are WIDER THAN TALL — and it exists because a diamond taller than it is wide
     reads as a spike, which is the one silhouette §5 forbids by name. 46 x 34 is 1.35:1.

     The four rings are concentric and each is a rounded square of DECREASING exponent, so the mouth
     is squarest at the outside and rounds off as it goes in. That is the "deep physical jamb" as a
     sequence rather than as a single recessed box: the eye reads depth from the corner radius
     changing, not from the shadow. */
  PORTAL: Object.freeze({
    W: 46, H: 34,              /* §06: wider than tall, 1.35:1 */
    CASING: 7.0, CASING_N: 4.6,   /* the outer platinum frame: squarest, and the only bright ring */
    JAMB_IN: 6.5, JAMB_D: 15, JAMB: 5.0, JAMB_N: 3.8,   /* the deep recess, in black crystal */
    THROAT_D: 22, THROAT_N: 3.2,  /* the smoked tube throat the jamb leads into */
    NODE_W: 11, NODE_H: 7,     /* §4's square-diamond status node — wider than tall again */
    NODE_UP: 27, NODE_D: 2.6,
    SILL: 3.0                  /* §4's "clean floor transition": a low sill, not a step */
  }),

  /* CIVIC PETALS — §8. Blocked as masses this pass; they exist because they widen the base in the
     GROUND FAR silhouette and because §8 forbids them being floating islands: each is tied to the
     plinth by a neck.

     OUT and A are sized by the SITE, not by taste. The footprint probe returned relief 0.0 out to
     half-extent 400 m and 105.5 m at 500 m, so the whole complex has to close inside 400. The
     widest petal is OUT + A * 1.10 (the 1.10 is the top of the per-petal size sequence below) =
     310 + 79.2 = 389 m. Nothing in this module may reach past 400 without re-measuring the site.

     AND THEIR BEARINGS ARE NOT A PHASE OFFSET ANY MORE. The first §4 render showed a petal parked
     squarely in front of a tube entry, filling the lower half of the frame: petals on a 36 degree
     phase and straight tubes on 45 put one nine degrees off a door, and a petal is 158 m wide.
     §8's platforms were standing on §4's entrances.

     A fixed phase cannot express "not in front of a door", so it is replaced by a RULE: collect
     every tube bearing, find the angular gaps between them, and put the petals in the widest ones.
     It is deterministic, it needs no magic numbers, and it stays correct if the tube counts ever
     change — which a hand-tuned phase would not. */
  PETALS: Object.freeze({ COUNT: 5, OUT: 310, A: 72, H: 44, N: 4.0, SEAT_LO: 30, SEAT_VARY: 9 }),
  SITE_CLEAR_R: 400,        /* measured: relief 0.0 inside this, 105.5 m of rock outside it */

  LOD_NEAR: 1400, LOD_MID: 4200, LOD_FAR: 26000
});

/* WHERE THE PETALS STAND — one definition, because two would drift.

   §8's platforms may not block §4's doors, and a fixed phase offset cannot express that: the first
   build had petals on 36 degrees and straight tubes on 45, which put a 158 m wide platform nine
   degrees off a transport entry, filling the lower half of that portal's own proof frame.

   So the bearings are DERIVED. Collect every tube bearing, measure the angular gaps between
   consecutive ones around the circle, and hand the widest COUNT of them their midpoints. Nothing to
   tune, and it stays correct if a tube family ever changes count — which a hand-picked phase would
   silently not.

   The builder and nexusSurface both call this. When they each had their own copy of the placement,
   the walkable surface and the geometry were one edit away from disagreeing about where the ground
   was, which is L42's whole warning. */
export function petalBearings() {
  const doors = [];
  for (const FAM of [NEXUS.STRAIGHT, NEXUS.SPIRAL])
    for (let i = 0; i < FAM.COUNT; i++) doors.push((((FAM.PHASE + (360 / FAM.COUNT) * i) % 360) + 360) % 360);
  doors.sort((a, b) => a - b);
  const gaps = doors.map((d, i) => {
    const nxt = doors[(i + 1) % doors.length] + (i + 1 === doors.length ? 360 : 0);
    return { mid: ((d + nxt) / 2) % 360, span: nxt - d };
  }).sort((a, b) => b.span - a.span);
  return gaps.slice(0, NEXUS.PETALS.COUNT).map(g => g.mid).sort((a, b) => a - b);
}
/* the tube-entry bearings, exported for the same reason: a test that re-derives them is not
   testing the module, it is testing its own copy of the rule. */
export function doorBearings() {
  const doors = [];
  for (const FAM of [NEXUS.STRAIGHT, NEXUS.SPIRAL])
    for (let i = 0; i < FAM.COUNT; i++) doors.push((((FAM.PHASE + (360 / FAM.COUNT) * i) % 360) + 360) % 360);
  return doors.sort((a, b) => a - b);
}

/* halo.js's cross-section, quoted rather than re-derived — L42. The underside is the slab's
   lower face, and every trunk in this file terminates ON it. */
export function haloUnderY(x, z) {
  const d = Math.hypot(x, z), u = d - NEXUS.HALO_R_MID;
  return NEXUS.HALO_Y + (u * u) / (2 * NEXUS.HALO_R_DISH) - NEXUS.HALO_THICK / 2;
}

/* the complex's own centre in world coordinates */
export function nexusCentre() { return polar(NEXUS.BEARING, NEXUS.R); }

/* THE ROUNDED-SQUARE SECTION, and it is the only place the shape is defined.
   r(phi) = a / (|cos phi|^n + |sin phi|^n)^(1/n).  n=2 is a circle; n->inf is a square. */
function superR(phi, a, n) {
  const c = Math.abs(Math.cos(phi)), s = Math.abs(Math.sin(phi));
  return a / Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n);
}

/* ================================================================================================
   sweptTube — THE ONE MEMBER GENOME.

   Sweeps a rounded-square section along a curve. `radius`, `expo` and `twist` are functions of t in
   [0,1] so one call makes a tapering trunk, a constant tube or a flaring capital.

   The frame is PARALLEL TRANSPORT, not Frenet. A Frenet frame is undefined on a straight run — the
   binormal is the cross product of tangent and its derivative, and that derivative is zero — so a
   straight tube built on one flips its section wherever floating point decides the curvature sign.
   Parallel transport carries the previous frame forward and is stable through straight and curved
   runs alike, which is the only reason the straight family and the spiral family can share a genome.

   The geometry is INDEXED so computeVertexNormals gives SMOOTH normals. §5 asks for blended
   curvature; a non-indexed sweep would give flat facets, which is the shard language this section
   exists to keep out.
   ================================================================================================ */
function sweptTube(curve, stations, radial, radius, expo, twist, capStart, capEnd) {
  const S = stations, K = radial;
  const pos = new Float32Array((S + 1) * (K + 1) * 3);
  const idx = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3();
  const N = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
  let o = 0;

  /* seed a normal perpendicular to the first tangent */
  curve.getTangentAt(0, T).normalize();
  N.set(0, 1, 0);
  if (Math.abs(T.dot(N)) > 0.92) N.set(1, 0, 0);
  tmp.crossVectors(T, N).normalize();
  N.crossVectors(tmp, T).normalize();

  for (let i = 0; i <= S; i++) {
    const t = i / S;
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T).normalize();
    /* parallel transport: strip the component of the carried normal along the new tangent */
    N.addScaledVector(T, -N.dot(T));
    if (N.lengthSq() < 1e-8) { N.set(0, 1, 0); if (Math.abs(T.dot(N)) > 0.92) N.set(1, 0, 0); N.addScaledVector(T, -N.dot(T)); }
    N.normalize();
    B.crossVectors(T, N).normalize();

    const a = radius(t), n = expo(t), tw = twist(t);
    for (let k = 0; k <= K; k++) {
      const phi = (k / K) * TAU + tw;
      const r = superR(phi, a, n);
      const cx = Math.cos(phi) * r, cy = Math.sin(phi) * r;
      pos[o * 3]     = P.x + N.x * cx + B.x * cy;
      pos[o * 3 + 1] = P.y + N.y * cx + B.y * cy;
      pos[o * 3 + 2] = P.z + N.z * cx + B.z * cy;
      o++;
    }
  }
  for (let i = 0; i < S; i++) for (let k = 0; k < K; k++) {
    const a0 = i * (K + 1) + k, b0 = a0 + 1, c0 = a0 + (K + 1), d0 = c0 + 1;
    idx.push(a0, c0, b0, b0, c0, d0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();

  /* caps are a separate NON-indexed fan so the cap plane keeps its own hard normal and does not
     smear the smooth shading of the last ring into a dome */
  /* THE CAP ORIENTATION IS COMPUTED, NOT GUESSED.

     The first build hand-picked a winding for each end and the approach render came back showing
     the INSIDE of every trunk: six tubes with open elliptical mouths hanging in the air. A cap
     wound backwards is not subtly wrong — FrontSide culls it and the member becomes a pipe you can
     see up. Reasoning about a winding in a hand-built frame has now been wrong twice in this
     project (MAH HAVEN's water was the first, and it cost three rounds), so this one measures: it
     builds one triangle, takes its cross product, and flips the fan if the normal points the wrong
     way down the tangent. */
  const caps = [];
  const capAt = (row, outward) => {
    const base = row * (K + 1);
    let cxs = 0, cys = 0, czs = 0;
    for (let k = 0; k < K; k++) { cxs += pos[(base + k) * 3]; cys += pos[(base + k) * 3 + 1]; czs += pos[(base + k) * 3 + 2]; }
    cxs /= K; cys /= K; czs /= K;
    const a = new THREE.Vector3(pos[base * 3] - cxs, pos[base * 3 + 1] - cys, pos[base * 3 + 2] - czs);
    const b2 = new THREE.Vector3(pos[(base + 1) * 3] - cxs, pos[(base + 1) * 3 + 1] - cys, pos[(base + 1) * 3 + 2] - czs);
    const nrm = new THREE.Vector3().crossVectors(a, b2);
    curve.getTangentAt(row === 0 ? 0 : 1, T).normalize();
    /* the START cap must face against the tangent, the END cap along it */
    const want = outward ? 1 : -1;
    const flip = Math.sign(nrm.dot(T)) !== want;
    for (let k = 0; k < K; k++) {
      const p0 = base + k, p1 = base + k + 1;
      caps.push(flip
        ? [cxs, cys, czs, pos[p1 * 3], pos[p1 * 3 + 1], pos[p1 * 3 + 2], pos[p0 * 3], pos[p0 * 3 + 1], pos[p0 * 3 + 2]]
        : [cxs, cys, czs, pos[p0 * 3], pos[p0 * 3 + 1], pos[p0 * 3 + 2], pos[p1 * 3], pos[p1 * 3 + 1], pos[p1 * 3 + 2]]);
    }
  };
  if (capStart) capAt(0, false);
  if (capEnd) capAt(S, true);
  if (!caps.length) return g;

  const cg = new THREE.BufferGeometry();
  const cp = new Float32Array(caps.length * 9);
  for (let i = 0; i < caps.length; i++) cp.set(caps[i], i * 9);
  cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
  cg.computeVertexNormals();
  return [g, cg];
}

/* a rounded-square PRISM — the base tiers. Built as a sweep along a vertical line so the tiers and
   the trunks are literally the same code path, which is what keeps their corner radii in family. */
function tierSolid(a, y0, y1, n, chamfer) {
  const curve = new THREE.LineCurve3(new THREE.Vector3(0, y0, 0), new THREE.Vector3(0, y1, 0));
  const h = y1 - y0, c = Math.min(chamfer, h * 0.42) / h;
  /* the chamfer is a BROAD one — §5 asks for broad bevels, and a 0.4 m arris on a 26 m tier is a
     razor at 900 m. This one is metres deep and eased, so it reads as a turn of the surface. */
  const rad = t => {
    const eIn = t < c ? t / c : 1, eOut = t > 1 - c ? (1 - t) / c : 1;
    const e = Math.min(eIn, eOut);
    return a * (0.955 + 0.045 * (e * e * (3 - 2 * e)));
  };
  return sweptTube(curve, 26, 64, rad, () => n, () => 0, true, true);
}

/* EVERY MEMBER MEETS THE CEILING SQUARE.

   The first build put the top vertex at 1821 while the halo's upper surface is at 1810: branches
   that lean INWARD land on a ceiling that rises toward the hole, and arriving at an angle drove
   the tilted end cap 11 m through the walking deck. §3 asks these to connect into the underside,
   not to spear it, and a landing that emerges on the floor above is a defect anyone standing on
   the ring would see.

   So the last stretch of every landing member is VERTICAL. The sweep's section is perpendicular to
   the tangent, so a vertical tangent gives a horizontal end cap, which lies flat on the underside
   by construction rather than by an inset fudged to hide the overshoot. */
function landVertical(pts, lx, ly, lz, tail) {
  pts[pts.length - 1] = new THREE.Vector3(lx, ly - tail, lz);
  pts.push(new THREE.Vector3(lx, ly, lz));
  return pts;
}
const LAND_TAIL = 90;

export function buildMahNexus(ctx, opts = {}) {
  const M = (ctx && ctx.M) || {};
  const theme = (ctx && ctx.theme) || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'mah-nexus';
  const owned = { geometries: [], materials: [] };
  const stats = { parts: {}, draws: 0, triangles: 0 };

  const [CX, CZ] = nexusCentre();
  const groundY = opts.groundY == null ? NEXUS.GROUND_Y : opts.groundY;
  group.position.set(CX, groundY, CZ);

  /* the ceiling this complex must reach, measured at the complex's own centre */
  const capY = haloUnderY(CX, CZ) - groundY;
  const rise = capY - NEXUS.SPRING_Y;
  stats.haloUnderY = +capY.toFixed(1);
  stats.rise = +rise.toFixed(1);
  stats.centre = [+CX.toFixed(1), +CZ.toFixed(1)];

  /* ---- MATERIALS -------------------------------------------------------------------------------
     LAW 1 decides every assignment here and nothing else does. A metal takes no diffuse light; it
     is lit only by the environment, and a horizontal high-metalness face reflects the near-black
     zenith and renders BLACK. So:
       VERTICAL and TILTED surfaces  -> the higher metalness, which sees the bright horizon band
       HORIZONTAL decks             -> low metalness, which still takes the lamps
     §07 states the same law as an art direction: platinum is for VERTICALS and EDGES.

     THE FIRST BUILD MADE THE WHOLE COMPLEX A PURE METAL AND IT WENT DARK. Measured against the
     world it stands in, at 09:20 from the approach camera:

         nexus-trunk    median  89.6      nexus-shell  36.7      nexus-recess  23.8
         crown-plat     #b6c4d6  metalness 0.38  env 1.55        halo-rims  the same

     So MAHWORLD's brightest architecture — MAH CROWN's elevations and the halo rims — carries its
     primary surfaces at metalness 0.38, not 0.94, and reserves the high metalness for EDGES. That
     is LAW 1 read correctly: a metal takes no diffuse light, so a broad surface made entirely of
     metal can only be as bright as whatever it happens to reflect, and most of a complex this size
     is not pointing at the horizon band. My shell at metalness 0.95 was a mirror aimed at nothing.

     The finish shader is where the split belongs, and it already takes the numbers as options:
     mEdge is what a VERTICAL face gets and mFlat what a HORIZONTAL one gets. Verticals stay
     properly metallic so the horizon band still rakes across them; the flats drop far enough to
     take diffuse light instead of reflecting the near-black zenith.

     nexus-recess held the STRAIGHT and SPIRAL tube families, which is why seven of the thirteen
     tubes measured 23.8 — graphiteDark is a recess material and those are not recesses. §4 calls
     every tube a premium destination portal with a PLATINUM CASING, so they get one. */
  const mkMat = (src, over) => { const m = (src || new THREE.MeshStandardMaterial()).clone(); Object.assign(m, over || {}); owned.materials.push(m); return m; };
  const shellMat = mkMat(M.platinumMid || M.platinum, { name: 'nexus-shell', color: new THREE.Color(0xb6c4d6), envMapIntensity: 1.62, roughness: 0.30, metalness: 0.42 });
  applyPlatinumFinish(shellMat, { mFlat: 0.30, mEdge: 0.58, rFlat: 0.36, rEdge: 0.26, breakUp: 0.070 });
  const trunkMat = mkMat(M.platinumMidBrushed || M.platinumBrushed || M.platinumMid, { name: 'nexus-trunk', color: new THREE.Color(0xaebbd0), envMapIntensity: 1.72, roughness: 0.28, metalness: 0.50 });
  applyPlatinumFinish(trunkMat, { mFlat: 0.32, mEdge: 0.66, rFlat: 0.34, rEdge: 0.24, breakUp: 0.062 });
  /* §4: platinum casing, and a tube is mostly vertical so it earns a higher edge metalness than
     the base does — this is the grade that separates the tube family from the mass it climbs. */
  const tubeMat = mkMat(M.platinum || M.platinumMid, { name: 'nexus-tube', color: new THREE.Color(0xa9b8cd), envMapIntensity: 1.85, roughness: 0.22, metalness: 0.58 });
  applyPlatinumFinish(tubeMat, { mFlat: 0.34, mEdge: 0.74, rFlat: 0.32, rEdge: 0.19, breakUp: 0.055 });
  const deckMat = mkMat(M.paving || M.graphiteDark, { name: 'nexus-deck', envMapIntensity: 1.35 });
  const recessMat = mkMat(M.graphiteDark || M.structural, { name: 'nexus-recess', roughness: 0.54, metalness: 0.72, envMapIntensity: 1.2 });
  /* §3 tier 4. ADDITIVE and unlit, which is fobeam.js's convention for every energy line in this
     world: a lit solid at this section would be L58's crawling hairline, an additive one glows
     wider than its geometry. depthWrite off so it never punches a hole in the metal behind it. */
  const mahgicMat = new THREE.MeshBasicMaterial({
    name: 'nexus-mahgic', color: theme.energy, transparent: true, opacity: NEXUS.MAHGIC.OPACITY,
    blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true
  });
  owned.materials.push(mahgicMat);

  /* ---- ACCUMULATORS. One merge per material, so this whole complex is four draws at full detail. */
  const bins = { shell: [], trunk: [], tube: [], deck: [], recess: [], mahgic: [] };
  /* every member that is supposed to REACH the ceiling records where it claims to land, so §3 can
     be checked against the intent and not against whatever vertex happens to be near the top */
  const landings = [];
  const land = (id, x, y, z) => { landings.push({ id, x, y, z }); return y; };
  const push = (bin, geo) => { if (Array.isArray(geo)) { for (const g of geo) bins[bin].push(g); } else bins[bin].push(geo); };
  const at = (geo, x, y, z) => { const m = new THREE.Matrix4().makeTranslation(x, y, z); geo.applyMatrix4(m); return geo; };

  /* ================================ THE BASE ================================================== */
  for (const Tr of NEXUS.TIERS) {
    push(Tr.mat === 'deck' ? 'shell' : 'trunk', tierSolid(Tr.a, Tr.y0, Tr.y1, Tr.n, 4.2));
    /* the deck ON TOP of each tier is a separate horizontal plate at low metalness — the LAW 1 split
       made geometric instead of made in a shader, because these are two different surfaces. */
    const capCurve = new THREE.LineCurve3(new THREE.Vector3(0, Tr.y1 - 0.9, 0), new THREE.Vector3(0, Tr.y1 + 0.35, 0));
    push('deck', sweptTube(capCurve, 2, 64, () => Tr.a * 0.9585, () => Tr.n, () => 0, false, true));
  }
  stats.parts.tiers = NEXUS.TIERS.length;

  /* ---- CIVIC PETALS (§8): tied to the plinth by a neck, never floating. --------------------- */
  {
    const P = NEXUS.PETALS;
    /* the shared rule, not a second copy of it */
    const bearings = petalBearings(), doors = doorBearings();
    stats.petalBearings = bearings.map(b2 => +b2.toFixed(1));
    stats.doorBearings = doors;
    /* the closest any petal comes to any door, published so a test can hold it open */
    let minSep = 360;
    for (const b2 of bearings) for (const d of doors) {
      const raw = Math.abs(b2 - d) % 360;
      minSep = Math.min(minSep, Math.min(raw, 360 - raw));
    }
    stats.petalDoorSep = +minSep.toFixed(1);
    for (let i = 0; i < P.COUNT; i++) {
      const aDeg = bearings[i];
      const [px, pz] = polar(aDeg, P.OUT);
      const y = P.SEAT_LO + P.SEAT_VARY * gold(i + 3);
      const petal = tierSolid(P.A * (0.82 + 0.28 * frac(i + 1)), y, y + P.H, P.N, 3.0);
      for (const g of (Array.isArray(petal) ? petal : [petal])) push('shell', at(g, px, 0, pz));
      /* THE NECK. §8: "They are not floating random islands." So there is a member, and it is not
         a strut — it is the same swept genome, thick, short and clearly structural. */
      const inR = NEXUS.TIERS[0].a * 0.94;
      const [nx, nz] = polar(aDeg, inR);
      const neck = new THREE.CatmullRomCurve3([
        new THREE.Vector3(nx, y + P.H * 0.52, nz),
        new THREE.Vector3((nx + px) / 2, y + P.H * 0.60, (nz + pz) / 2),
        new THREE.Vector3(px, y + P.H * 0.55, pz)
      ]);
      push('trunk', sweptTube(neck, 14, 16, t => 15 - 4 * Math.sin(t * Math.PI), () => 3.6, () => 0, true, true));
    }
    stats.parts.petals = P.COUNT;
  }

  /* ================================ THE CORE TRUNK ============================================
     One member, ground collar to halo underside. The waist and the capital are what make it a
     PROFILE rather than an extrusion — §2's "not a generic tower" lives entirely in this function. */
  const CORE_Y0 = NEXUS.SEAT_Y[NEXUS.CORE.SEAT_TIER];
  const CORE_RUN = capY - CORE_Y0;
  /* THE CORE'S PROFILE, HOISTED. The tertiary connectors have to arrive ON the trunk's surface, and
     a connector that guesses the radius it is merging into either floats off it or buries itself in
     it. There is one profile function and both callers use it — L42, applied before it can bite. */
  const coreRadiusAt = t => {
    const C = NEXUS.CORE;
    if (t <= C.WAIST_AT) { const u = t / C.WAIST_AT, e = u * u * (3 - 2 * u); return C.R0 + (C.R_WAIST - C.R0) * e; }
    if (t <= C.CAP_AT) { const u = (t - C.WAIST_AT) / (C.CAP_AT - C.WAIST_AT), e = u * u * (3 - 2 * u); return C.R_WAIST + (C.R_CAP - C.R_WAIST) * e * 0.62; }
    const u = (t - C.CAP_AT) / (1 - C.CAP_AT), e = u * u * (3 - 2 * u);
    return C.R_WAIST + (C.R_CAP - C.R_WAIST) * (0.62 + 0.38 * e);
  };
  {
    const C = NEXUS.CORE;
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(0, CORE_Y0 + CORE_RUN * (i / 8), 0));
    land('core', 0, capY, 0);
    const curve = new THREE.CatmullRomCurve3(pts);
    push('trunk', sweptTube(curve, C.STATIONS, C.RADIAL, coreRadiusAt,
      t => C.N0 + (C.N1 - C.N0) * t, t => C.TWIST * t, true, true));
    stats.parts.core = 1;
    stats.coreR0 = C.R0; stats.coreCap = C.R_CAP;
    stats.coreAspect = +(rise / (C.R0 * 2)).toFixed(2);
  }

  /* ================================ PRIMARY TRUNKS (§3 tier 1) ================================ */
  {
    const P = NEXUS.PRIMARY;
    for (let i = 0; i < P.COUNT; i++) {
      const aDeg = P.PHASE + (360 / P.COUNT) * i;
      const [sx, sz] = polar(aDeg, P.SEAT_R);
      /* the landings are NOT a uniform ring. Six trunks arriving at one radius read as a cage
         clamped round the core; spreading them keeps §3's hierarchy legible from underneath. */
      const [lx, lz] = polar(aDeg, P.LAND_R + P.LAND_VARY * (gold(i + 1) - 0.5) * 2);
      const y0 = NEXUS.SEAT_Y[P.SEAT_TIER];
      /* land ON the underside, measured at the landing point's own world position */
      const ly = land('primary-' + i, lx, haloUnderY(CX + lx, CZ + lz) - groundY, lz);
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6, e = t * t * (3 - 2 * t);           /* eased lean: vertical at the seat */
        pts.push(new THREE.Vector3(sx + (lx - sx) * e, y0 + (ly - y0) * t, sz + (lz - sz) * e));
      }
      const curve = new THREE.CatmullRomCurve3(landVertical(pts, lx, ly, lz, LAND_TAIL));
      push('trunk', sweptTube(curve, P.STATIONS, P.RADIAL,
        t => P.R0 + (P.R1 - P.R0) * t, () => P.N, t => 0.18 * t, true, true));
    }
    stats.parts.primary = P.COUNT;
    stats.primaryAspect = +(rise / (P.R0 * 2)).toFixed(1);
  }

  /* ================================ TERTIARY CONNECTORS (§3 tier 3) ===========================
     Eight members, each leaving a primary trunk and merging inward and upward into the core.

     Two decisions stop this reading as a wheel of spokes, which is the shape a radial connector
     naturally wants to be and which would say "machine" where §2 asked for "organism":

       · the heights STEP around the complex rather than repeating at ring level, so no two
         connectors are ever seen as a pair, and
       · each arrives TANGENTIALLY — offset sideways from the core's axis by a third of its radius —
         so it merges into the trunk's flank the way a limb rejoins a body, instead of pointing at
         the centre like a strut.

     The arrival radius comes from coreRadiusAt, the same function the core itself is swept with,
     because a connector that guesses the trunk's width either floats off it or buries itself. */
  {
    const K = NEXUS.TERTIARY, P = NEXUS.PRIMARY;
    for (let i = 0; i < K.COUNT; i++) {
      /* the connector belongs to a primary, but there are 8 of these and 6 of those, so they
         precess: no primary carries the same number, and the pattern never closes on itself. */
      const host = i % P.COUNT;
      const aDeg = P.PHASE + (360 / P.COUNT) * host;
      const t = K.LO + (K.HI - K.LO) * (i / (K.COUNT - 1));
      const y = CORE_Y0 + CORE_RUN * t;
      /* where the host primary actually is at this height — its own eased lean, quoted */
      const e = t * t * (3 - 2 * t);
      const hostR = P.SEAT_R + (P.LAND_R + P.LAND_VARY * (gold(host + 1) - 0.5) * 2 - P.SEAT_R) * e;
      const [hx, hz] = polar(aDeg, hostR - P.R0 * 0.45);
      /* and where it meets the core: on the surface, offset off-axis, and slightly higher — the
         rise across the merge is what makes it read as growth rather than as bracing. */
      const tEnd = Math.min(0.98, t + 0.052);
      const yEnd = CORE_Y0 + CORE_RUN * tEnd;
      const cR = coreRadiusAt(tEnd) * 0.86;
      const tanDeg = aDeg + (i % 2 ? K.TANGENT : -K.TANGENT) * 57.3;
      const [cx2, cz2] = polar(tanDeg, cR);
      const pts = [
        new THREE.Vector3(hx, y, hz),
        new THREE.Vector3(hx + (cx2 - hx) * 0.34, y + (yEnd - y) * 0.22, hz + (cz2 - hz) * 0.34),
        new THREE.Vector3(hx + (cx2 - hx) * 0.72, y + (yEnd - y) * 0.66, hz + (cz2 - hz) * 0.72),
        new THREE.Vector3(cx2, yEnd, cz2)
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      push('trunk', sweptTube(curve, K.STATIONS, K.RADIAL,
        u => K.R0 + (K.R1 - K.R0) * (u * u * (3 - 2 * u)), () => K.N, () => 0, true, true));
    }
    stats.parts.tertiary = K.COUNT;
  }

  /* ================================ §4 — THE TUBE ENTRIES ======================================
     One portal at the foot of every transport tube. §7's distal detail law is the reason this is
     built now rather than later: "Even a simple door" is a quality gate, and until this pass every
     tube in the complex met the deck as a bare cylinder ending in a cap.

     THE FRAME IS THE SAME GENOME AS EVERYTHING ELSE. A rounded-diamond picture frame is a closed
     superellipse curve swept with a small section — which is exactly sweptTube with the curve lying
     in a vertical plane instead of climbing. No second way to make a rounded shape exists in this
     file, which is the whole point of L42.

     `bearing` faces the frame outward; `oval(w, h, n)` returns the closed curve in that plane. */
  const portalAt = (px, py, pz, aDeg, scale) => {
    const P = NEXUS.PORTAL, s = scale == null ? 1 : scale;
    /* the outward normal and the two in-plane axes: U across the door, V up it */
    const ux = Math.cos(aDeg * DEG), uz = -Math.sin(aDeg * DEG);
    const tx = -uz, tz = ux;
    const oval = (w, h, n, depth) => {
      const pts = [], STEPS = 40;
      for (let i = 0; i < STEPS; i++) {
        const phi = (i / STEPS) * TAU;
        const rr = superR(phi, 1, n);
        const a = Math.cos(phi) * rr * w * 0.5, b2 = Math.sin(phi) * rr * h * 0.5;
        pts.push(new THREE.Vector3(
          px + tx * a + ux * depth, py + b2, pz + tz * a + uz * depth));
      }
      return new THREE.CatmullRomCurve3(pts, true);
    };
    /* 1. CASING — the outer platinum frame. The only bright ring, per §4 "platinum casing". */
    push('tube', sweptTube(oval(P.W * s, P.H * s, P.CASING_N, 0), 92, 12,
      () => P.CASING * s * 0.5, () => 3.6, () => 0, false, false));
    /* 2. JAMB — inset and set BACK, in the recess material. §4 "deep physical jamb" plus
          "black-crystal recess": one member does both because the depth is what makes it read. */
    push('recess', sweptTube(oval((P.W - P.JAMB_IN * 2) * s, (P.H - P.JAMB_IN * 2) * s, P.JAMB_N, -P.JAMB_D * s * 0.5), 92, 10,
      () => P.JAMB * s * 0.5, () => 3.4, () => 0, false, false));
    /* 3. THROAT — deeper still and rounder, the smoked tube the jamb leads into. Rounder on
          purpose: the sequence 4.6 -> 3.8 -> 3.2 is the eye reading depth off the corner radius
          rather than off a shadow, which is what makes a shallow door look deep. */
    push('recess', sweptTube(oval((P.W - P.JAMB_IN * 3.4) * s, (P.H - P.JAMB_IN * 3.4) * s, P.THROAT_N, -P.THROAT_D * s), 60, 10,
      () => P.JAMB * s * 0.36, () => 3.2, () => 0, false, false));
    /* 4. STATUS NODE — §4's square diamond, and §06's law applies to it too: wider than tall. */
    {
      const ny = py + P.NODE_UP * s;
      const c = oval(P.NODE_W * s, P.NODE_H * s, 2.6, 0);
      push('tube', sweptTube(c, 34, 8, () => P.NODE_D * s * 0.5, () => 3.0, () => 0, false, false));
    }
    /* 5. SILL — §4's "clean floor transition", and the first version of it was a BLACK BLOCK IN THE
       DOORWAY. I swept it along the door's depth with a section radius of P.W * 0.34, which is
       15.6 m on a 34 m opening — the member filled the entire lower half of the portal — and put it
       in `deck`, which is paving at 0x0b0f16. The proof frame showed a solid black wedge where the
       threshold should be. Two mistakes in one line: a section sized off the wrong dimension, and a
       floor material used for a piece of the door.

       A threshold runs ACROSS an opening, not into it. So it sweeps along the door's width with a
       small section, and it belongs to the portal's own platinum family, which makes it the bright
       line under a dark throat instead of a mass blocking it. */
    {
      const halfW = (P.W * s - P.CASING * s) * 0.5;
      const yb = py - P.H * s * 0.5 + P.SILL * s * 0.5;
      const a = new THREE.Vector3(px - tx * halfW + ux * P.CASING * s * 0.3, yb, pz - tz * halfW + uz * P.CASING * s * 0.3);
      const b2 = new THREE.Vector3(px + tx * halfW + ux * P.CASING * s * 0.3, yb, pz + tz * halfW + uz * P.CASING * s * 0.3);
      push('tube', sweptTube(new THREE.LineCurve3(a, b2), 6, 10,
        () => P.SILL * s * 0.5, () => 4.0, () => 0, true, true));
    }
  };
  {
    let n = 0;
    /* every straight and spiral tube gets one, at its own seat, facing out along its own bearing */
    for (const [FAM, tag] of [[NEXUS.STRAIGHT, 'straight'], [NEXUS.SPIRAL, 'spiral']]) {
      for (let i = 0; i < FAM.COUNT; i++) {
        const aDeg = FAM.PHASE + (360 / FAM.COUNT) * i;
        const [sx, sz] = polar(aDeg, FAM.SEAT_R);
        const y0 = NEXUS.SEAT_Y[FAM.SEAT_TIER];
        portalAt(sx, y0 + NEXUS.PORTAL.H * 0.5 + 1.5, sz, aDeg, 1);
        n++;
      }
    }
    /* and the MAIN ENTRANCE — §10's "Entry: premium door/portal", on the plinth's outward face,
       facing back down the pass toward the city. It is the same door at 2.4x, because a civic
       entrance and a platform gate should be recognisably the same object at different scales. */
    {
      const aDeg = NEXUS.BEARING + 180;      /* faces the approach, which comes from the world centre */
      const [ex, ez] = polar(aDeg, NEXUS.TIERS[0].a * 0.985);
      portalAt(ex, NEXUS.PORTAL.H * 1.25 + 4, ez, aDeg, 2.4);
      n++;
    }
    stats.parts.portals = n;
  }

  /* ================================ RING NODES (§2) ===========================================
     Three collars. Each is a closed sweep around the core at its own radius — a rounded-square ring,
     not a torus, so it belongs to the same section family as everything it ties together. */
  {
    for (const R of NEXUS.RINGS) {
      const y = NEXUS.SPRING_Y + rise * R.at;
      const pts = [];
      const STEPS = 48;
      for (let i = 0; i < STEPS; i++) {
        const phi = (i / STEPS) * TAU;
        const rr = superR(phi, R.r, R.n);
        pts.push(new THREE.Vector3(Math.cos(phi) * rr, y, Math.sin(phi) * rr));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      push('shell', sweptTube(curve, 152, 14, () => R.sec, () => 3.4, () => 0, false, false));
    }
    stats.parts.rings = NEXUS.RINGS.length;
  }

  /* ================================ THE TUBE FAMILIES (§2) ====================================
     "Entropy is allowed in route variety. Chaos is not allowed." Three enumerated families, each
     with a stated rule, and no member of any family is placed by a random number. */

  /* STRAIGHT — the plain vertical run. Every family needs a member that does the obvious thing, or
     the varied ones have nothing to be varied against. */
  {
    const S = NEXUS.STRAIGHT;
    for (let i = 0; i < S.COUNT; i++) {
      const aDeg = S.PHASE + (360 / S.COUNT) * i;
      const [sx, sz] = polar(aDeg, S.SEAT_R);
      const [lx, lz] = polar(aDeg, S.LAND_R);
      const ly = land('straight-' + i, lx, haloUnderY(CX + lx, CZ + lz) - groundY, lz);
      const y0 = NEXUS.SEAT_Y[S.SEAT_TIER];
      const curve = new THREE.CatmullRomCurve3(landVertical([
        new THREE.Vector3(sx, y0, sz),
        new THREE.Vector3(sx + (lx - sx) * 0.35, y0 + (ly - y0) * 0.5, sz + (lz - sz) * 0.35),
        new THREE.Vector3(lx, ly, lz)
      ], lx, ly, lz, LAND_TAIL));
      push('tube', sweptTube(curve, NEXUS.TUBE_STATIONS, NEXUS.TUBE_RADIAL, () => S.R, () => S.N, () => 0, true, true));
    }
    stats.parts.straight = S.COUNT;
  }

  /* SPIRAL — §2's "gently spiraling", and GENTLY is the operative word: 1.15 turns over 1730 m is a
     pitch of 1500 m, which reads as a lean that changes as you walk round it rather than as a
     helix. A tight helix would be a novelty; this is a route. */
  {
    const S = NEXUS.SPIRAL;
    for (let i = 0; i < S.COUNT; i++) {
      const a0 = S.PHASE + (360 / S.COUNT) * i;
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const aDeg = a0 + S.TURNS * 360 * t;
        const rr = S.SEAT_R + (S.LAND_R - S.SEAT_R) * (t * t * (3 - 2 * t));
        const [x, z] = polar(aDeg, rr);
        const ly = haloUnderY(CX + x, CZ + z) - groundY;
        if (k === 12) land('spiral-' + i, x, ly, z);
        const y0 = NEXUS.SEAT_Y[S.SEAT_TIER];
        pts.push(new THREE.Vector3(x, y0 + (ly - y0) * t, z));
      }
      const last = pts[pts.length - 1];
      const curve = new THREE.CatmullRomCurve3(landVertical(pts, last.x, last.y, last.z, LAND_TAIL));
      push('tube', sweptTube(curve, NEXUS.TUBE_STATIONS + 24, NEXUS.TUBE_RADIAL, () => S.R, () => S.N, () => 0, true, true));
    }
    stats.parts.spiral = S.COUNT;
  }

  /* BRANCH — §2's "branch-like", and this is where the word ORGANISM has to be earned. Each branch
     leaves the core at the same height, then diverges: they do not fan symmetrically, because a
     symmetric fan is a chandelier. The divergence is set by the golden sequence so it is varied and
     deterministic, and every one still LANDS, which is the difference between a branch and a spike. */
  {
    const B = NEXUS.BRANCH;
    const splitY = NEXUS.SPRING_Y + rise * B.SPLIT_AT;
    for (let i = 0; i < B.COUNT; i++) {
      const aDeg = B.PHASE + (360 / B.COUNT) * i + 16 * (gold(i + 2) - 0.5);
      const [sx, sz] = polar(aDeg, B.SEAT_R);
      const outR = B.LAND_R * (0.66 + 0.44 * frac(i + 4));
      const [lx, lz] = polar(aDeg + 22 * (gold(i + 5) - 0.5), outR);
      const ly = land('branch-' + i, lx, haloUnderY(CX + lx, CZ + lz) - groundY, lz);
      const pts = [
        new THREE.Vector3(sx * 0.55, NEXUS.SPRING_Y + rise * 0.10, sz * 0.55),
        new THREE.Vector3(sx, splitY * 0.72, sz),
        new THREE.Vector3(sx + (lx - sx) * 0.22, splitY, sz + (lz - sz) * 0.22),
        new THREE.Vector3(sx + (lx - sx) * 0.68, splitY + (ly - splitY) * 0.55, sz + (lz - sz) * 0.68),
        new THREE.Vector3(lx, ly, lz)
      ];
      const curve = new THREE.CatmullRomCurve3(landVertical(pts, lx, ly, lz, LAND_TAIL));
      push('trunk', sweptTube(curve, NEXUS.TUBE_STATIONS + 16, NEXUS.TUBE_RADIAL + 4,
        t => B.R0 + (B.R1 - B.R0) * (t * t * (3 - 2 * t)), () => B.N, () => 0, true, true));
    }
    stats.parts.branch = B.COUNT;
  }

  /* ================================ MAHGIC LINES (§3 tier 4) ==================================
     "some carry MAHGIC/FOBEAM traffic." Six rails, each running the full height ALONGSIDE a
     primary trunk it already belongs to.

     Two laws govern this and they pull against each other. L58 says a repeated element takes its
     section from its height, and 1586 m of rise on a 3.4 m rail is 466:1 — a crawling hairline if
     it were a lit solid. It is not a lit solid: fobeam.js runs the whole world's energy on rails of
     0.085 to 0.46 m, and they read across kilometres because ADDITIVE EMISSIVE glows wider than its
     geometry. This gauge is quoted from that module rather than invented, and it is seven times
     heavier than fobeam's own because it is seen against a bright metal flank rather than sky.

     The other law is v10 §13 — "FOBEAM lines over-bright, arcs lattice the sky" — which is why
     there are six rather than sixty, why every one FOLLOWS a member that already exists instead of
     inventing a path, and why the opacity is 0.42 and not 1. A line with its own route is what
     turns a structure into a lattice. */
  {
    const G = NEXUS.MAHGIC, P = NEXUS.PRIMARY;
    for (let i = 0; i < G.COUNT; i++) {
      const aDeg = P.PHASE + (360 / P.COUNT) * i;
      const landR = P.LAND_R + P.LAND_VARY * (gold(i + 1) - 0.5) * 2;
      const y0 = NEXUS.SEAT_Y[P.SEAT_TIER];
      const [lx, lz] = polar(aDeg, landR);
      const ly = haloUnderY(CX + lx, CZ + lz) - groundY;
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10, e = t * t * (3 - 2 * t);
        /* the primary's own centreline, pushed out to its flank so the rail lies ON the trunk */
        const rr = (P.SEAT_R + (landR - P.SEAT_R) * e) + (P.R0 + (P.R1 - P.R0) * t) * G.OFFSET;
        const [x, z] = polar(aDeg + 3.5, rr);
        pts.push(new THREE.Vector3(x, y0 + (ly - y0) * t, z));
      }
      push('mahgic', sweptTube(new THREE.CatmullRomCurve3(pts), G.STATIONS, G.RADIAL,
        () => G.R, () => 2.6, () => 0, false, false));
    }
    stats.parts.mahgic = G.COUNT;
  }

  /* ---- MERGE. One draw per material family. ---------------------------------------------------- */
  const matFor = { shell: shellMat, trunk: trunkMat, tube: tubeMat, deck: deckMat, recess: recessMat, mahgic: mahgicMat };
  for (const key of Object.keys(bins)) {
    const list = bins[key]; if (!list.length) continue;
    const merged = mergeGeoms(list);
    for (const g of list) g.dispose();
    owned.geometries.push(merged);
    const mesh = new THREE.Mesh(merged, matFor[key]);
    mesh.name = 'nexus-' + key;
    mesh.castShadow = false; mesh.receiveShadow = false;
    group.add(mesh);
    stats.draws++;
    stats.triangles += merged.attributes.position.count / 3;
  }
  stats.triangles = Math.round(stats.triangles);

  /* ---- THE §3 GATE, asserted here rather than believed. --------------------------------------
     "The upward MAH NEXUS trunks connect PHYSICALLY into the underside." A number in stats is a
     claim a test can fail; a comment is not.

     THE FIRST VERSION OF THIS GATE WAS WRONG AND SAID SO LOUDLY: it reported a 135 m gap by
     scanning every vertex within 120 m of the cap and calling the lowest one a landing. A point on
     the SIDE of a trunk 120 m below its top is not a landing; it is the trunk. A gate that measures
     a superset of what it is checking reports a failure that is not there, which is exactly as
     useless as one that misses a failure that is.

     So each member now DECLARES where it lands as it is built, and the gate checks those points
     against the underside directly above them. One truth, recorded at the moment it is decided. */
  {
    let worst = 0, worstAt = null;
    for (const L of landings) {
      const gap = Math.abs((haloUnderY(CX + L.x, CZ + L.z) - groundY) - L.y);
      if (gap > worst) { worst = gap; worstAt = L.id; }
    }
    /* and the independent check: the highest vertex anywhere in the complex must reach the ceiling.
       The declared landings could all be right and the geometry still stop short of them. */
    let top = -1e9;
    for (const key of ['trunk', 'tube', 'shell']) {
      const mesh = group.children.find(c => c.name === 'nexus-' + key);
      if (!mesh) continue;
      const P = mesh.geometry.attributes.position;
      for (let i = 0; i < P.count; i++) if (P.getY(i) > top) top = P.getY(i);
    }
    stats.landings = landings.length;
    stats.landingGap = +worst.toFixed(2);
    stats.landingWorstIn = worstAt;
    stats.topY = +top.toFixed(1);
    stats.topGap = +(capY - top).toFixed(1);
    stats.reachesHalo = worst < 1.0 && Math.abs(capY - top) < 40;
  }

  /* ---- THE FOOTPRINT GATE. ---------------------------------------------------------------------
     The site is flat to 400 m and carries 105 m of rock past it. That measurement is the reason
     every ground-level number in this module is what it is, and a number nudged later would break
     it silently — the complex would grow one petal into a mountain and nothing would say so. So the
     ground reach is measured off the built geometry, not asserted. */
  {
    let reach = 0;
    for (const key of ['shell', 'trunk', 'deck']) {
      const mesh = group.children.find(c => c.name === 'nexus-' + key);
      if (!mesh) continue;
      const P = mesh.geometry.attributes.position;
      for (let i = 0; i < P.count; i++) {
        if (P.getY(i) > 140) continue;               /* only what stands on the ground */
        const d = Math.hypot(P.getX(i), P.getZ(i));
        if (d > reach) reach = d;
      }
    }
    stats.groundReach = +reach.toFixed(1);
    stats.siteClearR = NEXUS.SITE_CLEAR_R;
    stats.footprintOK = reach <= NEXUS.SITE_CLEAR_R;
  }

  /* ---- THE SEAT GATE. Every family stands on a deck wide enough to hold it. -------------------
     The first build failed this and the render is what caught it: six primary trunks seated at
     r 196 on a collar of half-extent 168, feet hanging over air. It is pure arithmetic, so it
     should never have needed a render — SEAT_R + R0 <= the tier's half-extent. */
  {
    const seats = [
      { id: 'core', tier: NEXUS.CORE.SEAT_TIER, r: 0, w: NEXUS.CORE.R0 },
      { id: 'primary', tier: NEXUS.PRIMARY.SEAT_TIER, r: NEXUS.PRIMARY.SEAT_R, w: NEXUS.PRIMARY.R0 },
      { id: 'straight', tier: NEXUS.STRAIGHT.SEAT_TIER, r: NEXUS.STRAIGHT.SEAT_R, w: NEXUS.STRAIGHT.R },
      { id: 'spiral', tier: NEXUS.SPIRAL.SEAT_TIER, r: NEXUS.SPIRAL.SEAT_R, w: NEXUS.SPIRAL.R }
    ];
    const bad = [];
    for (const S2 of seats) {
      const T2 = NEXUS.TIERS[S2.tier];
      /* THE NARROWEST REACH IS THE EDGE MIDPOINT, NOT THE DIAGONAL. A superellipse is
         r(phi) = a / (|cos|^n + |sin|^n)^(1/n): at phi 0 that is exactly `a`, and at phi PI/4 with
         n 6 it is 1.26a. The corners of a rounded square sit FURTHER out than its flats — that is
         what makes it look like a square. The first gate checked the diagonal and called it the
         narrow point. It passed anyway, which is the dangerous kind of wrong. */
      const narrow = T2.a;
      if (S2.r + S2.w > narrow) bad.push(S2.id + ' needs ' + (S2.r + S2.w).toFixed(0) + ' has ' + narrow.toFixed(0));
    }
    stats.seatsOK = bad.length === 0;
    stats.seatFaults = bad;
  }

  /* ---- THE §3 HIERARCHY GATE. "Do not make every support identical." -------------------------
     A hierarchy is not a list of names, it is a ladder of sizes, so it gets checked as one. Each
     tier must be strictly narrower than the one above it — and the ratios matter as much as the
     order: two tiers within a few per cent of each other are the same tier wearing two labels,
     which is exactly the failure §3 is warning about. */
  {
    const ladder = [
      { id: 'core', w: NEXUS.CORE.R0 },
      { id: 'primary', w: NEXUS.PRIMARY.R0 },
      { id: 'branch', w: NEXUS.BRANCH.R0 },
      { id: 'tertiary', w: NEXUS.TERTIARY.R0 },
      { id: 'mahgic', w: NEXUS.MAHGIC.R }
    ];
    const faults = [];
    for (let i = 1; i < ladder.length; i++) {
      const a = ladder[i - 1], b2 = ladder[i];
      if (b2.w >= a.w) faults.push(b2.id + ' >= ' + a.id);
      else if (b2.w > a.w * 0.88) faults.push(b2.id + ' is only ' + Math.round(100 * b2.w / a.w) + '% of ' + a.id);
    }
    stats.hierarchy = ladder.map(l => l.id + ':' + l.w).join(' > ');
    stats.hierarchyOK = faults.length === 0;
    stats.hierarchyFaults = faults;
  }

  /* ---- CONTRACT ------------------------------------------------------------------------------- */
  let detail = 1;
  const api = {
    group, stats,
    setTime() {},
    setTheme(t) { if (t) { /* the complex is platinum and takes its colour from the environment */ } },
    update() {},
    setQuality() {},
    setDetail(distance) {
      const d = distance == null ? 0 : distance;
      const next = d > NEXUS.LOD_MID ? 0.34 : d > NEXUS.LOD_NEAR ? 0.7 : 1;
      if (next === detail) return;
      detail = next;
      group.visible = d < NEXUS.LOD_FAR;
    },
    navSites() {
      const [x, z] = nexusCentre();
      return [{ id: 'mah-nexus', label: 'MAH NEXUS', x, z, y: groundY + NEXUS.SPRING_Y + 4, kind: 'transport' }];
    },
    dispose() {
      for (const g of owned.geometries) g.dispose();
      for (const m of owned.materials) m.dispose();
      group.clear();
    }
  };
  return api;
}

/* the roam surface: the three base tiers and the petals are walkable, everything else is not.
   f(x,z) -> y | null, which is roam.js's contract. */
export function nexusSurface(x, z) {
  const [CX, CZ] = nexusCentre();
  const lx = x - CX, lz = z - CZ;
  const d = Math.hypot(lx, lz);
  if (d > NEXUS.PETALS.OUT + NEXUS.PETALS.A * 1.2) return null;
  const phi = Math.atan2(lz, lx);
  for (let i = NEXUS.TIERS.length - 1; i >= 0; i--) {
    const T = NEXUS.TIERS[i];
    if (d <= superR(phi, T.a * 0.9585, T.n)) return NEXUS.GROUND_Y + T.y1 + 0.35;
  }
  const P = NEXUS.PETALS;
  for (let i = 0; i < P.COUNT; i++) {
    const aDeg = petalBearings()[i];
    const [px, pz] = polar(aDeg, P.OUT);
    const ex = lx - px, ez = lz - pz;
    const a = P.A * (0.82 + 0.28 * frac(i + 1)) * 0.9585;
    if (superR(Math.atan2(ez, ex), a, P.N) >= Math.hypot(ex, ez)) return NEXUS.GROUND_Y + P.SEAT_LO + P.SEAT_VARY * gold(i + 3) + P.H + 0.35;
  }
  return null;
}

/* the same merge every module in this world hand-rolls, because there are no addons. Positions and
   normals only — this complex is one colour family and vertex colour would be four wasted floats. */
function mergeGeoms(list) {
  let n = 0;
  for (const g of list) n += g.index ? g.index.count : g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    const P = g.attributes.position, N = g.attributes.normal;
    const idx = g.index ? g.index.array : null;
    const take = i => {
      pos[o * 3] = P.getX(i); pos[o * 3 + 1] = P.getY(i); pos[o * 3 + 2] = P.getZ(i);
      nor[o * 3] = N.getX(i); nor[o * 3 + 1] = N.getY(i); nor[o * 3 + 2] = N.getZ(i);
      o++;
    };
    if (idx) { for (let i = 0; i < idx.length; i++) take(idx[i]); }
    else { for (let i = 0; i < P.count; i++) take(i); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 3), 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, o * 3), 3));
  return out;
}

/* ================================================================================================
   CARRY-OVER — what this pass deliberately did not build, so the next one does not have to guess.

     §4  TUBULAR DIAMOND ENTRY SYSTEM   portal mouths, deep jambs, smoked throats, status nodes
     §7  DISTAL DETAIL LAW              "even a simple door" — none of the doors exist yet
     §8  PETAL PURPOSE                  each petal has a blocked mass and no recognizable function
     §9  INTERIOR FOUNDATION            concourse, atrium, tube selection, sight lines
     §10 MOVEMENT                       approach convergence, boarding, travel, dock
   ================================================================================================ */

export default { buildMahNexus, NEXUS, nexusSurface, nexusCentre, haloUnderY, petalBearings, doorBearings };
