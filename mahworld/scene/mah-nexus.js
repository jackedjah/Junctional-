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
import { applyPlatinumFinish, applyDistanceDim } from './materials.js';
import { createVehicle, SHUTTLE } from './flora-and-vehicles.js';

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
    COUNT: 6, SEAT_TIER: 1, SEAT_R: 156, LAND_R: 980, LAND_VARY: 240, R0: 76, R1: 58, N: 3.6,
    PHASE: 12,                      /* degrees, so no trunk sits on a base corner */
    FLARE: 2.4,                     /* see below: the exponent that makes this a tree */
    /* THE CAPITAL (R170 §14). The branch TAPERS as it climbs — 76 m at the seat, 58 m at the top —
       so it arrived at the halo underside as its own thinnest section butting a slab. Geometrically
       it touched (the gate measures a 17 m overlap and has always passed); compositionally it read
       as attached afterward, which is the one thing §14 forbids.
       Every column that has ever carried a ceiling widens before it gets there. CAP_GAIN is how many
       times its own radius the branch opens to at the very top, CAP_RUN the fraction of the climb
       that opening happens over. u^2 makes the onset imperceptible and the arrival decisive — a
       fillet, not a cone — so what you see is a branch that BECOMES structure rather than a tube
       with a trumpet stuck on it. 58 x 2.05 = 119 m across 206 m of run at this scale. */
    CAP_GAIN: 2.05, CAP_RUN: 0.13,
    STATIONS: 72, RADIAL: 26
  }),
  /* R7 §5 / §2 — THE PRIMARIES ARE THE TREE, AND THEY WERE A CAGE.

     R6 built six trunks of equal section leaning evenly outward on a smoothstep, tied by three ring
     collars. Measured, everything passed; looked at against the R7 key art, it is plainly the wrong
     object. The art shows a TREE: a trunk that goes up and then MUSHROOMS, on a few branches thick
     enough to be structure rather than scaffolding, with the flare concentrated high. R7 §3 asks for
     "smooth tubular branches" and "large-radius curves"; §5 asks that a route "look traversable from
     the inside" and "contain sufficient internal diameter".

     Three numbers carry that whole change:

       R0  46 -> 76   a branch as thick as a building, not a mast. 152 m of internal diameter is a
                      route you can believe MAHBEINGS and FOB pods move through, which §5 requires.
       SEAT_R 186 -> 156   they now spring from INSIDE the collar's shadow rather than standing off
                      it, so low down they read as one mass with the core — the trunk of the tree —
                      and only separate as they climb.
       FLARE  smoothstep -> t^2.4   this is the tree. A smoothstep spreads the lean evenly over the
                      rise, which is a cage splaying; t^2.4 holds the branches close through the
                      lower half and throws them outward in the top third, which is a canopy.

     The seat arithmetic still has to hold: 156 + 76 = 232 against the concourse's 236 m half-extent.
     Four metres of margin, and the gate checks it rather than this comment. */

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
    COUNT: 8, R0: 26, R1: 18, N: 3.4,
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

  /* R7 §5 / PASS 4 — THE ROUTES HAVE TO BE TRAVERSABLE FROM THE INSIDE.

     "Each route must look traversable from the inside, contain sufficient internal diameter for
     MAHBEINGS / transport." Up to this pass every route was a SOLID swept member: §26's tube-interior
     proof camera had nothing to photograph, because there was no inside. A transport network whose
     tubes are solid is a sculpture of a transport network.

     WALL 4.2 m on a 24 m member leaves a 39.6 m bore, and on the 27 m spiral a 45.6 m one. For
     scale, that is wider than the whole MAH MATCH approach corridor, so "sufficient for MAHBEINGS
     and pods" is not a claim here, it is a published number the gate reads.

     RIBS every 58 m are structure AND they are the only thing that gives a smooth vertical bore a
     sense of speed and scale — a featureless tunnel reads as a still image however fast you move
     through it. AUDIO groups are §20's miniature vertical music-line motif, placed rather than
     invented: six groups per route, five bars each, on the established FOBEAM language. */
  BORE: Object.freeze({
    WALL: 4.2, RIB_EVERY: 58, RIB_SEC: 1.9, RIB_PROUD: 1.5,
    AUDIO_GROUPS: 6, AUDIO_BARS: 5, AUDIO_H: 7.5, AUDIO_R: 0.5, AUDIO_SPREAD: 3.4,
    STATIONS: 96, RADIAL: 18
  }),

  /* THE TUBE FAMILIES — §2: "some straight, some gently spiraling, some branch-like, some paired".
     Entropy in route variety is allowed; chaos is not. So the variety is enumerated, not random. */
  STRAIGHT: Object.freeze({ COUNT: 4, SEAT_TIER: 0, SEAT_R: 262, LAND_R: 300, R: 24, N: 3.4, PHASE: 45 }),
  SPIRAL: Object.freeze({ COUNT: 3, SEAT_TIER: 0, SEAT_R: 240, LAND_R: 380, R: 27, N: 3.2, TURNS: 1.15, PHASE: 20 }),
  BRANCH: Object.freeze({ COUNT: 6, SPLIT_AT: 0.44, SEAT_R: 96, LAND_R: 660, R0: 44, R1: 28, N: 3.4, PHASE: 30 }),
  TUBE_STATIONS: 80, TUBE_RADIAL: 20,

  /* R7 §7 — WHERE A ROUTE ARRIVES. Every number here is a fraction of the branch it terminates, so
     the terminal scales with its route instead of being a fixed fitting bolted onto varying tubes. */
  ENTRY: Object.freeze({
    COLLAR_DROP: 46, COLLAR_R: 1.34, COLLAR_SEC: 11,   /* the gripping ring, wider than the branch */
    TERRACE_DROP: 96, TERRACE_R: 2.15,                 /* the deck you arrive onto */
    DOOR_DROP: 78, DOOR_SCALE: 0.72                    /* the threshold, on the terrace's outer edge */
  }),

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
  LAND_MARGIN: 140,         /* how far inside the halo annulus a landing must stay to have ceiling */

  /* R7 §5 — the craft are the EXISTING genome, placed. Three abreast because one 8.6 m shuttle in
     a 39.6 m bore is a speck, and a subway-scale network runs groups. */
  VEHICLES: Object.freeze({ CLUSTERS: 3, ABREAST: 3, SPACING: 11.5, STAGGER: 7, LO: 0.18, HI: 0.82, DOCKED: 2, DOCK_LIFT: 5 }),
  LOD_INTERIOR: 460,   /* the bores draw only when a viewer could plausibly be inside one */
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
/* A PRIMARY'S RADIUS AT FRACTION t OF ITS CLIMB — the taper, then the capital (see PRIMARY.CAP_*).
   EXPORTED AND USED BY EVERY CONSUMER, because the halo entry fittings sit in the top 96 m of the
   run and that is exactly where the capital opens: a collar sized off the old constant R1 would now
   be INSIDE the branch it is supposed to grip, and would simply vanish. One radius, one source —
   this is the L42 rule, and the entry fittings are precisely the second table that would have
   drifted. */
export function primaryR(t) {
  const P = NEXUS.PRIMARY;
  const r = P.R0 + (P.R1 - P.R0) * t;
  const lo = 1 - P.CAP_RUN;
  if (t <= lo) return r;
  const u = (t - lo) / P.CAP_RUN;
  return r * (1 + (P.CAP_GAIN - 1) * u * u);
}

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
  /* ---- THE CHROMIUM PASS (R170 §12, §29) -------------------------------------------------------
     DIRECTION: the MAH TREE's material must become "one of the most premium materials in the entire
     world — deep chromium / silver metallic body, dark environmental reflections, bright clean
     highlight streaks... museum-grade concept-car chrome, not cheap chrome shader."

     WHAT WAS HERE WAS SATIN, AND THE NUMBERS SAY SO PLAINLY. applyPlatinumFinish's own default —
     the palette's considered chromium — is mEdge 0.94 / rEdge 0.22. This module overrode it DOWN,
     to 0.58 / 0.66 / 0.74 on the three grades. At metalness 0.66 a surface is still taking most of
     its value from diffuse light, and diffuse light on a 1586 m trunk at night is a flat grey wash:
     no environment folded in it, no highlight that travels as you move, nothing to reflect the city
     it rises out of. That is exactly the "cheap chrome shader" read, and it was a choice, not a
     limitation.

     THE HIERARCHY IS THE POINT, NOT THE SHINE. §8: "if everything is equally reflective, nothing
     feels special." So the three grades now SEPARATE instead of clustering:
       SHELL  the civic base mass — barely moved. It is the quiet dark alloy the trunk stands out
              against, and making it shinier would cost the trunk its authority.
       TRUNK  near-mirror on its verticals. This is the hero surface.
       TUBE   the transport casing, one step tighter again, so the tubes read as machined against
              the sculpted mass they climb.
     mFlat stays LOW on all three, and that is LAW 1 doing its job: a metal takes no diffuse light,
     so a horizontal face at 0.94 renders black under a dark zenith. The whole reason this world has
     a per-fragment platinum finish is so a vertical can be a mirror while the cap above it is not.

     COLOUR: pulled off the blue axis and UP. 0xaebbd0 is a dark blue-grey — before the environment
     contributes anything, the body is already three stops down and tinted. Chromium is a bright
     near-neutral; the theme's influence belongs in what it REFLECTS, which is a world already full
     of the theme's own light. §12's "subtle theme-color influence", not a blue trunk. */
  const shellMat = mkMat(M.platinumMid || M.platinum, { name: 'nexus-shell', color: new THREE.Color(0xb9bec6), envMapIntensity: 1.75, roughness: 0.30, metalness: 0.42 });
  applyPlatinumFinish(shellMat, { mFlat: 0.30, mEdge: 0.62, rFlat: 0.36, rEdge: 0.24, breakUp: 0.070 });
  const trunkMat = mkMat(M.platinumMidBrushed || M.platinumBrushed || M.platinumMid, { name: 'nexus-trunk', color: new THREE.Color(0xc6cad0), envMapIntensity: 2.60, roughness: 0.28, metalness: 0.50 });
  applyPlatinumFinish(trunkMat, { mFlat: 0.32, mEdge: 0.94, rFlat: 0.32, rEdge: 0.085, breakUp: 0.040 });
  /* §4: platinum casing, and a tube is mostly vertical so it earns a higher edge metalness than
     the base does — this is the grade that separates the tube family from the mass it climbs. */
  const tubeMat = mkMat(M.platinum || M.platinumMid, { name: 'nexus-tube', color: new THREE.Color(0xcfd2d6), envMapIntensity: 2.85, roughness: 0.22, metalness: 0.58 });
  applyPlatinumFinish(tubeMat, { mFlat: 0.34, mEdge: 0.96, rFlat: 0.30, rEdge: 0.070, breakUp: 0.034 });

  /* ---- THE HERO WAS INVISIBLE FROM THE WORLD'S OWN CAMERA (R170 §2, §25, §32) -------------------
     Rendered from the plaza, this 1586 m tree was a barely-perceptible ghost — a faint arc high in
     the frame and nothing else. Not because it is small or badly shaped, but because it stands 1750 m
     away and mahplaza.js's fog runs to 2350 m at night: at that range the fog has taken about 77% of
     it, and 77% of a silhouette is a rumour. It is the same defect the HALO dome had, one order of
     magnitude closer, and it is the reason the note keeps asking for MAH TREE AUTHORITY — the
     authority was authored, and the atmosphere was eating it.

     THE FIX IS AERIAL PERSPECTIVE INSTEAD OF FOG, which is what terrain.js has always done for the
     mountains standing right behind this thing. Fog off, and applyDistanceDim's `air` mode mixes the
     fragment toward the night horizon key with distance instead of toward the fog colour — so the
     tree still RECEDES (§32: background is quiet, atmospheric, silhouette-driven) but arrives at a
     quiet silhouette rather than at nothing.

     THE NUMBERS ARE THE OBJECT'S OWN. NEAR 600 is past the whole city, so nothing changes for a
     camera anywhere near the trunk; FAR 2600 is beyond the far side of the world; 0.62 leaves 38%
     of the material's own value at maximum distance, which against a 0x1d3d6e sky is a legible dark
     mass with its chromium catches surviving on the lit flank. Because the mix runs on view depth
     rather than on a per-object switch, the SAME material reads as full chromium at the base and as
     a silhouette from the plaza, which is what a real 1.5 km object does. */
  const NEXUS_AIR = 0x1d3d6e;
  [shellMat, trunkMat, tubeMat].forEach(m => {
    m.fog = false;
    applyDistanceDim(m, 600, 2600, 0.62, NEXUS_AIR);
  });
  /* R7 §15 — BLACK CRYSTAL, and the render is what caught this one. The halo landing terraces came
     back as DEAD BLACK DISCS hanging under the ceiling, because `deck` was M.paving: colour
     0x0b0f16 at metalness 0.40, which is the world's FLOOR material and is meant to be near-black.
     §15 is explicit that black crystal is "deep, reflective / clearcoat, readable, NEVER dead
     black", and a horizontal plate of near-black paving 1700 m up with nothing to reflect but the
     ground is exactly dead black.

     Clearcoat is the difference. A clearcoat layer gives a dark surface a bright specular skin that
     survives when the diffuse term is almost nothing, so the terrace reads as polished stone rather
     than a hole. The albedo also comes up off pure black and onto the world's blue axis, so it
     belongs to the same family as the platinum it sits against. */
  const deckMat = mkMat(M.paving || M.graphiteDark, {
    name: 'nexus-black-crystal', color: new THREE.Color(0x0e1622),
    roughness: 0.16, metalness: 0.38, envMapIntensity: 1.95
  });
  if ('clearcoat' in deckMat) { deckMat.clearcoat = 1.0; deckMat.clearcoatRoughness = 0.09; }
  /* R7 §15 — LIQUID DARK METAL: "smooth premium black-chrome for joints / recesses". The jambs and
     throats were graphiteDark at roughness 0.54, which is a matte structural grade — it read as
     unlit cavity rather than as a machined recess. Black chrome is dark AND sharp. */
  const recessMat = mkMat(M.graphiteDark || M.structural, {
    name: 'nexus-liquid-dark', color: new THREE.Color(0x131b28),
    roughness: 0.13, metalness: 0.93, envMapIntensity: 2.15
  });
  /* R7 §15 / §5 — CLEAR DIAMOND GLASS, "transparent, real thickness, clean edge response". §5 asks
     that a route have "glass / crystal enclosure where appropriate"; the deepest ring of every
     portal is that enclosure, so looking into a door now shows crystal depth instead of a hole. */
  /* the bore is seen FROM WITHIN, so it renders BackSide — the faces pointing away from a traveller
     are the ones that surround them. Liquid dark metal, per §15, so a tunnel reads as machined
     rather than as a cave. */
  /* THE BORE IS DOUBLE-SIDED, AND FINDING OUT WHY COST TWO WRONG DIAGNOSES.

     The interior render came back showing open sky. I called it a mirror — §15's liquid dark metal
     at metalness 0.88 seemed an obvious culprit for a 40 m tube returning the environment whole —
     dropped it to satin, and THE FRAME DID NOT MOVE. A mirror would have moved. Two attempts on one
     defect with no improvement is the point at which the method is wrong, not the value.

     So the pixels got named instead. The probe: `nexus-bore-interior` exists, is visible, carries
     24192 triangles and side 1 — it built fine — and 87 of 100 rays from inside the shaft hit
     `nexus-tube`, the solid outer member, while ZERO hit the bore.

     BackSide was the assumption. This file's sweep winds so that the OUTWARD face is the back face,
     which means BackSide renders the bore only into the solid it sits inside, and a traveller sees
     straight through it. Exactly the portal-cap bug in a new place, and there I already learned the
     answer: do not reason about a winding in a hand-built frame, decide it by measurement or make
     the question moot. DoubleSide makes it moot. It costs backface culling on 24k interior-tier
     triangles, which is nothing, and it cannot be wrong in either winding.

     The satin grade stays, on its own merits: §16 asks for dark-but-readable recesses and §17 for
     tube reflections tuned rather than maximal. */
  const boreMat = mkMat(M.graphiteDark || M.structural, {
    name: 'nexus-bore', color: new THREE.Color(0x1a2432),
    roughness: 0.38, metalness: 0.40, envMapIntensity: 0.85, side: THREE.DoubleSide
  });
  const glassMat = mkMat(M.crystalGlass, {
    name: 'nexus-diamond-glass', color: new THREE.Color(0x20355c),
    roughness: 0.05, metalness: 0.18, transparent: true, opacity: 0.38, envMapIntensity: 2.3
  });
  /* §3 tier 4. ADDITIVE and unlit, which is fobeam.js's convention for every energy line in this
     world: a lit solid at this section would be L58's crawling hairline, an additive one glows
     wider than its geometry. depthWrite off so it never punches a hole in the metal behind it. */
  const mahgicMat = new THREE.MeshBasicMaterial({
    name: 'nexus-mahgic', color: theme.energy, transparent: true, opacity: NEXUS.MAHGIC.OPACITY,
    blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, fog: true
  });
  owned.materials.push(mahgicMat);

  /* ---- ACCUMULATORS. One merge per material, so this whole complex is four draws at full detail. */
  const bins = { shell: [], trunk: [], tube: [], bore: [], deck: [], recess: [], glass: [], mahgic: [] };
  /* every member that is supposed to REACH the ceiling records where it claims to land, so §3 can
     be checked against the intent and not against whatever vertex happens to be near the top */
  const landings = [];
  /* every route's curve and section radius, kept so PASS 5 can place craft along them */
  const routeCurves = [];
  let vehicleMesh = null;
  const land = (id, x, y, z) => { landings.push({ id, x, y, z }); return y; };
  /* R7 §24 — TWO TIERS OF GEOMETRY, NOT ONE.

     The §15 material closure and the §7 halo entries took this complex from 130k triangles in four
     draws to 235k in seven, and the module's own budget gate failed — correctly. §24 does not ask
     for a bigger budget, it asks for "high detail near player, clean silhouette at distance" and
     names far-branch simplification specifically.

     So every push declares whether it is SILHOUETTE or DETAIL. Silhouette is what the object is at
     any range: base, core, primaries, rings, the three route families. Detail is what only exists
     when you are close enough to resolve it: the eight portals, the six halo terminals, the tertiary
     connectors, the MAHGIC rails. The detail meshes merge separately and setDetail simply stops
     drawing them, which is also the prefilter law — a portal 4 km away is not detail, it is noise
     that costs 80k triangles to draw. */
  const bins2 = { shell: [], trunk: [], tube: [], bore: [], deck: [], recess: [], glass: [], mahgic: [] };
  /* A THIRD TIER, because a bore is invisible from outside its own tube.

     PASS 4's interiors took the detail tier from 105k triangles to 288k and blew §24's near budget
     at 418k. Raising the budget would be the wrong answer twice over: the cost is real, and the
     geometry is unresolvable from anywhere except INSIDE the member — which is a far tighter range
     than LOD_NEAR's 1400 m. This is the prefilter law at its most literal: a tunnel wall you are
     not in is not detail at any distance, it is occluded. */
  const bins3 = { shell: [], trunk: [], tube: [], bore: [], deck: [], recess: [], glass: [], mahgic: [] };
  let TIER = 0;
  const push = (bin, geo) => {
    const target = TIER === 2 ? bins3[bin] : TIER === 1 ? bins2[bin] : bins[bin];
    if (Array.isArray(geo)) { for (const g of geo) target.push(g); } else target.push(geo);
  };
  const detail = (fn) => { const p0 = TIER; TIER = 1; try { fn(); } finally { TIER = p0; } };
  const interior = (fn) => { const p0 = TIER; TIER = 2; try { fn(); } finally { TIER = p0; } };
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
      /* THE CANOPY REACH, AND THE CEILING DECIDES IT.

         At LAND_R 430 the branches ran 274 m out over a 1586 m rise — a ten degree lean, which is a
         bundle leaning, not a tree opening. The key art's canopy is nearer forty. So the reach goes
         to 980, and that immediately runs into a hard geometric fact: MAH HALO's hole is r 700, and
         this complex stands at r 1750, so a branch thrown 1200 m INWARD lands at world r 550 — over
         open sky, with no ceiling to meet at all. §3's "connect physically" would fail silently and
         the render would show a branch ending in air.

         So the reach is CLAMPED by the ceiling rather than chosen: the landing's world radius is
         held inside the halo annulus with a margin, and the local radius is recovered from that.
         The canopy therefore leans OUTWARD — branches facing away from the world centre reach far,
         branches facing back toward the plaza are pulled in — which is not a compromise but the
         truer shape: a tree growing under a ring reaches where the ring actually is. */
      const wantR = P.LAND_R + P.LAND_VARY * (gold(i + 1) - 0.5) * 2;
      let [lx, lz] = polar(aDeg, wantR);
      {
        const wr = Math.hypot(CX + lx, CZ + lz);
        const lo = NEXUS.HALO_R_IN + NEXUS.LAND_MARGIN, hi = NEXUS.HALO_R_OUT - NEXUS.LAND_MARGIN;
        if (wr < lo || wr > hi) {
          const want = Math.min(hi, Math.max(lo, wr));
          /* walk the local radius until the world radius lands in band — one bisection, no guessing */
          let a2 = 0, b2 = wantR;
          for (let k = 0; k < 28; k++) {
            const m2 = (a2 + b2) * 0.5, [mx, mz] = polar(aDeg, m2);
            if (Math.hypot(CX + mx, CZ + mz) < want) a2 = m2; else b2 = m2;
          }
          [lx, lz] = polar(aDeg, (a2 + b2) * 0.5);
        }
      }
      const y0 = NEXUS.SEAT_Y[P.SEAT_TIER];
      /* land ON the underside, measured at the landing point's own world position */
      const ly = land('primary-' + i, lx, haloUnderY(CX + lx, CZ + lz) - groundY, lz);
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        /* THE FLARE. t^2.4 holds the branch in close through the lower half and throws it outward
           in the top third — a canopy. The smoothstep this replaces spread the lean evenly, which
           is what made six trunks read as a cage splaying rather than a tree opening. */
        const t = k / 10, e = Math.pow(t, P.FLARE);
        pts.push(new THREE.Vector3(sx + (lx - sx) * e, y0 + (ly - y0) * t, sz + (lz - sz) * e));
      }
      const curve = new THREE.CatmullRomCurve3(landVertical(pts, lx, ly, lz, LAND_TAIL));
      push('trunk', sweptTube(curve, P.STATIONS, P.RADIAL,
        t => primaryR(t), () => P.N, t => 0.18 * t, true, true));
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
  detail(() => {
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
  });

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
    push('glass', sweptTube(oval((P.W - P.JAMB_IN * 3.4) * s, (P.H - P.JAMB_IN * 3.4) * s, P.THROAT_N, -P.THROAT_D * s), 60, 10,
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
  detail(() => {
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
  });

  /* R7 §5 / PASS 4 — THE INSIDE OF A ROUTE.

     Four things, and each earns its place against a stated clause rather than being tunnel dressing:

       BORE    §5 "sufficient internal diameter" — the shell a traveller is actually inside of,
               rendered BackSide because the faces pointing away are the ones that surround them.
       RIBS    §5 "clear directionality" and §3's engineered read. They are also the only thing that
               gives a smooth vertical bore any sense of speed: a featureless tunnel is a still
               image no matter how fast you move through it.
       ROUTE   §6 "route lights, directional MAHGIC" — one line down the bore, not a light show.
       AUDIO   §20's miniature vertical music-line motif, which every FOBEAM family keeps. Placed
               on the established language, not reinvented: six groups, five bars, sparse.

     All of it is DETAIL tier. A bore is invisible from outside the tube by definition, so drawing
     it at range is the prefilter law's exact failure case. */
  const boreOf = (curve, outerR, sectionN) => {
    const B = NEXUS.BORE, inner = outerR - B.WALL;
    push('bore', sweptTube(curve, B.STATIONS, B.RADIAL, () => inner, () => sectionN, () => 0, false, false));
    /* RIBS — proud of the bore wall, spaced by arc length so a spiral gets the same rhythm as a
       straight run rather than a compressed one. */
    const len = curve.getLength();
    const ribs = Math.max(4, Math.round(len / B.RIB_EVERY));
    for (let k = 1; k < ribs; k++) {
      const t = k / ribs;
      const P0 = curve.getPointAt(t), T0 = curve.getTangentAt(t).normalize();
      let N0 = new THREE.Vector3(0, 1, 0);
      if (Math.abs(T0.dot(N0)) > 0.92) N0.set(1, 0, 0);
      const B0 = new THREE.Vector3().crossVectors(T0, N0).normalize();
      N0.crossVectors(B0, T0).normalize();
      const pts = [], STEPS = 22, rr = inner + B.RIB_PROUD;
      for (let i = 0; i < STEPS; i++) {
        const phi = (i / STEPS) * TAU, r2 = superR(phi, rr, sectionN);
        pts.push(new THREE.Vector3(
          P0.x + N0.x * Math.cos(phi) * r2 + B0.x * Math.sin(phi) * r2,
          P0.y + N0.y * Math.cos(phi) * r2 + B0.y * Math.sin(phi) * r2,
          P0.z + N0.z * Math.cos(phi) * r2 + B0.z * Math.sin(phi) * r2));
      }
      push('tube', sweptTube(new THREE.CatmullRomCurve3(pts, true), 40, 7,
        () => B.RIB_SEC, () => 3.2, () => 0, false, false));
    }
    /* ROUTE LINE — one, down the bore's flank, following the route rather than inventing a path */
    {
      const pts = [];
      for (let k = 0; k <= 14; k++) {
        const t = k / 14, P0 = curve.getPointAt(t), T0 = curve.getTangentAt(t).normalize();
        let N0 = new THREE.Vector3(0, 1, 0);
        if (Math.abs(T0.dot(N0)) > 0.92) N0.set(1, 0, 0);
        const B0 = new THREE.Vector3().crossVectors(T0, N0).normalize();
        pts.push(new THREE.Vector3(P0.x + B0.x * inner * 0.88, P0.y + B0.y * inner * 0.88, P0.z + B0.z * inner * 0.88));
      }
      push('mahgic', sweptTube(new THREE.CatmullRomCurve3(pts), 60, 6, () => 1.5, () => 2.6, () => 0, false, false));
    }
    /* AUDIO — §20, and it stays miniature. Vertical bars in a group, in the route's own frame. */
    for (let g = 0; g < B.AUDIO_GROUPS; g++) {
      const t = 0.12 + 0.76 * (g / (B.AUDIO_GROUPS - 1));
      const P0 = curve.getPointAt(t), T0 = curve.getTangentAt(t).normalize();
      let N0 = new THREE.Vector3(0, 1, 0);
      if (Math.abs(T0.dot(N0)) > 0.92) N0.set(1, 0, 0);
      const B0 = new THREE.Vector3().crossVectors(T0, N0).normalize();
      N0.crossVectors(B0, T0).normalize();
      for (let k = 0; k < B.AUDIO_BARS; k++) {
        const off = (k - (B.AUDIO_BARS - 1) / 2) * B.AUDIO_SPREAD;
        const h = B.AUDIO_H * (0.45 + 0.55 * gold(g * 7 + k * 3));
        const base = new THREE.Vector3(
          P0.x - N0.x * inner * 0.9 + B0.x * off, P0.y - N0.y * inner * 0.9 + B0.y * off,
          P0.z - N0.z * inner * 0.9 + B0.z * off);
        const tip = base.clone().addScaledVector(N0, h);
        push('mahgic', sweptTube(new THREE.LineCurve3(base, tip), 2, 5,
          () => B.AUDIO_R, () => 3.0, () => 0, true, true));
      }
    }
  };

  /* ================================ R7 §7 — THE HALO ENTRY POINTS =============================
     "Each dome entry needs: physical docking collar, threshold frame, square-diamond node, local
     landing terrace, clean backside."

     MAH NEXUS stands at r 1750, under MAH HALO — the DOME springs at r 3434, which is MAH ASCENT's
     territory, not this module's. So these are HALO entries, and R7 §5's requirement that a route
     "terminate at a real dome / HALO entry point" is satisfied at the ceiling this complex actually
     touches. Before this pass every branch simply ended flush against the underside: a 152 m tube
     meeting a slab with nothing to say it was a destination.

     Every part of the entry is geometry that already exists in this file. The collar is the ring
     genome; the threshold and its node are portalAt, rotated to face DOWN. R7 §14 asks that a
     junction look manufactured and load-bearing, and the cheapest way to be sure of that is to make
     it out of the same parts as everything else rather than inventing a fitting. */
  detail(() => {
    const P = NEXUS.PRIMARY;
    let entries = 0;
    for (const L of landings) {
      if (L.id.indexOf('primary-') !== 0) continue;   /* the six big routes get real terminals */
      const rr = Math.hypot(L.x, L.z) || 1;
      const aDeg = Math.atan2(-L.z, L.x) / DEG;
      /* THE FITTINGS RIDE THE CAPITAL. Each sits a known DROP below the ceiling, so its own t is
         1 - drop/run, and its size comes from primaryR at that t. Before the capital existed these
         were all sized off the constant P.R1 and it made no difference; with a branch that opens
         to 2.05x in its last 206 m, a collar sized off R1 would be buried inside the flare. */
      /* the PRIMARY's own base, not the core's — they sit on different seat tiers, and using the
         core's would put every fitting at the wrong t on a taller run. */
      const runM = Math.max(1, L.y - NEXUS.SEAT_Y[P.SEAT_TIER]);
      const tAt = d => Math.max(0, Math.min(1, 1 - d / runM));
      const rAt = d => primaryR(tAt(d));
      /* 1. THE DOCKING COLLAR — a ring around the branch just under the ceiling, thicker than the
            branch it grips, which is what makes it read as a fitting and not a stripe. */
      {
        const cy = L.y - NEXUS.ENTRY.COLLAR_DROP;
        const pts = [], STEPS = 30;
        for (let i = 0; i < STEPS; i++) {
          const phi = (i / STEPS) * TAU, cr = superR(phi, rAt(NEXUS.ENTRY.COLLAR_DROP) * NEXUS.ENTRY.COLLAR_R, 3.6);
          pts.push(new THREE.Vector3(L.x + Math.cos(phi) * cr, cy, L.z + Math.sin(phi) * cr));
        }
        push('tube', sweptTube(new THREE.CatmullRomCurve3(pts, true), 64, 10,
          () => NEXUS.ENTRY.COLLAR_SEC, () => 3.4, () => 0, false, false));
      }
      /* 2. THE LANDING TERRACE — §7's "local landing terrace", a low deck ringing the branch where
            it meets the ceiling, so an arrival has somewhere to stand before it is anywhere. */
      {
        const ty = L.y - NEXUS.ENTRY.TERRACE_DROP;
        const inner = new THREE.Vector3(L.x, ty, L.z);
        const outer = new THREE.Vector3(L.x, ty + 1.2, L.z);
        push('deck', sweptTube(new THREE.LineCurve3(inner, outer), 2, 44,
          () => rAt(NEXUS.ENTRY.TERRACE_DROP) * NEXUS.ENTRY.TERRACE_R, () => 3.2, () => 0, true, true));
      }
      /* 3. THE THRESHOLD — portalAt facing DOWN and outward along the branch's own bearing, so the
            arrival reads as the same door family as the ground entries. One genome, two ends. */
      portalAt(L.x + Math.cos(aDeg * DEG) * (rAt(NEXUS.ENTRY.TERRACE_DROP) * NEXUS.ENTRY.TERRACE_R * 0.86),
        L.y - NEXUS.ENTRY.DOOR_DROP,
        L.z - Math.sin(aDeg * DEG) * (rAt(NEXUS.ENTRY.TERRACE_DROP) * NEXUS.ENTRY.TERRACE_R * 0.86),
        aDeg, NEXUS.ENTRY.DOOR_SCALE);
      entries++;
    }
    stats.parts.haloEntries = entries;
  });

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
      interior(() => boreOf(curve, S.R, S.N));
      routeCurves.push({ curve, r: S.R });
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
      interior(() => boreOf(curve, S.R, S.N));
      routeCurves.push({ curve, r: S.R });
    }
    stats.parts.spiral = S.COUNT;
    stats.boreStraight = +((NEXUS.STRAIGHT.R - NEXUS.BORE.WALL) * 2).toFixed(1);
    stats.boreSpiral = +((NEXUS.SPIRAL.R - NEXUS.BORE.WALL) * 2).toFixed(1);
    stats.boreMin = Math.min(stats.boreStraight, stats.boreSpiral);
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
  detail(() => {
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
        const rr = (P.SEAT_R + (landR - P.SEAT_R) * e) + primaryR(t) * G.OFFSET;
        const [x, z] = polar(aDeg + 3.5, rr);
        pts.push(new THREE.Vector3(x, y0 + (ly - y0) * t, z));
      }
      push('mahgic', sweptTube(new THREE.CatmullRomCurve3(pts), G.STATIONS, G.RADIAL,
        () => G.R, () => 2.6, () => 0, false, false));
    }
    stats.parts.mahgic = G.COUNT;
  });

  /* PLACED LAST, AND THE COUNT IS WHY. This block first sat before the tube families, so
     routeCurves was still empty when it ran: 12 craft appeared at the halo terminals and ZERO in
     the routes, against an expected 75. The stat caught it immediately — which is the argument for
     publishing a count rather than trusting a loop. */
  /* R7 §5 / PASS 5 — THE EXISTING FOB VEHICLES, IN THE NETWORK.

     The acceptance clause is "existing FOB vehicles fit the network", and the operative word is
     EXISTING: §0 forbids inventing a transport family and §6 says the established language remains.
     So nothing is designed here. flora-and-vehicles.js already exports the canonical genome —
     SHUTTLE at 2.30 x 5.14 x 2.35, "a one-being block" scaled up — and createVehicle builds it.

     THE FIT, MEASURED RATHER THAN ASSERTED: a 2.35 m craft in a 39.6 m bore is a ratio of 17. It
     passes "sufficient internal diameter" so trivially that the interesting question inverts — a
     lone pod in that shaft is a speck. The answer is not to shrink a bore I have already accepted
     on silhouette grounds, nor to inflate a craft whose proportions mean "one being". It is to run
     them the way a subway-scale network actually would: in ABREAST GROUPS. Three craft across a
     40 m shaft reads as transit; one reads as litter.

     ONE DRAW. buildFobPods is the plaza's placer, with its own apron search and ascent-pad
     keep-outs, so reusing it here would mean changing a contract the plaza depends on. Instead the
     genome is built ONCE, its geometry harvested, and every craft in this complex is an instance of
     it — which is §24's instancing clause and also the only way 75 vehicles cost less than 75
     draws. */
  {
    let proto = null, protoMat = null;
    try {
      const v = createVehicle({ theme, seed: 'mah-nexus', length: 8.6 });
      const parts = [];
      v.traverse(o => { if (o.isMesh && o.geometry) { o.updateMatrixWorld(true); parts.push(o); } });
      if (parts.length) {
        const geos = [];
        for (const o of parts) {
          const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
          g.applyMatrix4(o.matrixWorld);
          if (!g.getAttribute('normal')) g.computeVertexNormals();
          geos.push(g);
        }
        proto = mergeGeoms(geos);
        for (const g of geos) g.dispose();
        protoMat = parts[0].material;
      }
      if (v.userData && typeof v.userData.dispose === 'function') v.userData.dispose();
    } catch (e) { proto = null; }

    if (proto) {
      owned.geometries.push(proto);
      const placements = [];
      const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 0, 1);
      const _pos = new THREE.Vector3(), _sc = new THREE.Vector3(1, 1, 1);
      /* IN THE ROUTES — three clusters up each shaft, three craft abreast, all facing the way the
         route runs. The abreast offset comes off the curve's own frame, so a spiral's groups bank
         with it instead of staying stubbornly world-flat. */
      const V = NEXUS.VEHICLES;
      for (const R of routeCurves) {
        for (let c = 0; c < V.CLUSTERS; c++) {
          const t = V.LO + (V.HI - V.LO) * (c / Math.max(1, V.CLUSTERS - 1));
          const P0 = R.curve.getPointAt(t), T0 = R.curve.getTangentAt(t).normalize();
          let N0 = new THREE.Vector3(0, 1, 0);
          if (Math.abs(T0.dot(N0)) > 0.92) N0.set(1, 0, 0);
          const B0 = new THREE.Vector3().crossVectors(T0, N0).normalize();
          N0.crossVectors(B0, T0).normalize();
          const bore = R.r - NEXUS.BORE.WALL;
          for (let k = 0; k < V.ABREAST; k++) {
            const off = (k - (V.ABREAST - 1) / 2) * V.SPACING;
            const lift = (gold(c * 5 + k * 3) - 0.5) * V.STAGGER;
            _pos.set(P0.x + B0.x * off + N0.x * lift, P0.y + B0.y * off + N0.y * lift,
              P0.z + B0.z * off + N0.z * lift);
            _q.setFromUnitVectors(_up, T0);
            placements.push(_m.clone().compose(_pos, _q, _sc));
          }
        }
      }
      /* DOCKED at the halo terminals — §6 "clear docking", §7's terrace given something to serve */
      for (const L of landings) {
        if (L.id.indexOf('primary-') !== 0) continue;
        const aDeg = Math.atan2(-L.z, L.x) / DEG;
        for (let k = 0; k < V.DOCKED; k++) {
          const a2 = aDeg + (k - (V.DOCKED - 1) / 2) * 9;
          /* the docked craft ride the terrace, so they ride the capital with it — parked off the
             old constant radius they would now sit inside the flared branch. */
          const pr = primaryR(Math.max(0, Math.min(1, 1 - NEXUS.ENTRY.TERRACE_DROP /
            Math.max(1, L.y - NEXUS.SEAT_Y[NEXUS.PRIMARY.SEAT_TIER]))));
          const rr = pr * NEXUS.ENTRY.TERRACE_R * 0.72;
          const [dx, dz] = polar(a2, rr);
          _pos.set(L.x + dx, L.y - NEXUS.ENTRY.TERRACE_DROP + V.DOCK_LIFT, L.z + dz);
          _q.setFromUnitVectors(_up, new THREE.Vector3(Math.cos(a2 * DEG), 0, -Math.sin(a2 * DEG)));
          placements.push(_m.clone().compose(_pos, _q, _sc));
        }
      }
      const inst = new THREE.InstancedMesh(proto, protoMat, placements.length);
      for (let i = 0; i < placements.length; i++) inst.setMatrixAt(i, placements[i]);
      inst.instanceMatrix.needsUpdate = true;
      inst.name = 'nexus-vehicles-interior';
      inst.frustumCulled = true;
      group.add(inst);
      vehicleMesh = inst;
      stats.parts.vehicles = placements.length;
      stats.vehicleLength = 8.6;
      stats.vehicleFitRatio = +((NEXUS.STRAIGHT.R - NEXUS.BORE.WALL) * 2 / SHUTTLE.size).toFixed(1);
      stats.draws++;
    }
  }


  /* ---- MERGE. One draw per material family. ---------------------------------------------------- */
  const matFor = { shell: shellMat, trunk: trunkMat, tube: tubeMat, bore: boreMat, deck: deckMat, recess: recessMat, glass: glassMat, mahgic: mahgicMat };
  const detailMeshes = [], interiorMeshes = [];
  stats.triSilhouette = 0; stats.triDetail = 0; stats.triInterior = 0;
  for (const [set, kind] of [[bins, 0], [bins2, 1], [bins3, 2]]) {
    for (const key of Object.keys(set)) {
      const list = set[key]; if (!list.length) continue;
      const merged = mergeGeoms(list);
      for (const g of list) g.dispose();
      owned.geometries.push(merged);
      const mesh = new THREE.Mesh(merged, matFor[key]);
      mesh.name = 'nexus-' + key + (kind === 1 ? '-detail' : kind === 2 ? '-interior' : '');
      mesh.castShadow = false; mesh.receiveShadow = false;
      group.add(mesh);
      if (kind === 1) detailMeshes.push(mesh);
      if (kind === 2) interiorMeshes.push(mesh);
      stats.draws++;
      const tri = merged.attributes.position.count / 3;
      stats.triangles += tri;
      if (kind === 1) stats.triDetail += tri;
      else if (kind === 2) stats.triInterior += tri;
      else stats.triSilhouette += tri;
    }
  }
  if (vehicleMesh) interiorMeshes.push(vehicleMesh);
  stats.triInterior = Math.round(stats.triInterior);
  /* what a viewer outside the complex actually pays: everything but the bores */
  stats.triApproach = Math.round(stats.triSilhouette + stats.triDetail);
  stats.triangles = Math.round(stats.triangles);
  stats.triSilhouette = Math.round(stats.triSilhouette);
  stats.triDetail = Math.round(stats.triDetail);
  /* what each range actually pays in draw calls. drawsFar subtracts BOTH optional tiers — the
     first version subtracted only the detail meshes and reported 7 for a far silhouette that is
     really 4, which is a budget gate lying in the safe direction. */
  stats.drawsFar = stats.draws - detailMeshes.length - interiorMeshes.length;
  stats.drawsApproach = stats.draws - interiorMeshes.length;

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
  let tier = 1;
  const api = {
    group, stats,
    setTime() {},
    setTheme(t) { if (t) { /* the complex is platinum and takes its colour from the environment */ } },
    update() {},
    setQuality() {},
    setDetail(distance) {
      const d = distance == null ? 0 : distance;
      /* the detail tier is what §24 asks for: the portals, halo terminals, connectors and MAHGIC
         rails simply stop being drawn past LOD_NEAR. Below that range they are unresolvable, so
         drawing them buys noise at the cost of most of this object's triangle budget. */
      const wantDetail = d <= NEXUS.LOD_NEAR;
      const wantInterior = d <= NEXUS.LOD_INTERIOR;
      const next = (d > NEXUS.LOD_MID ? 4 : wantInterior ? 1 : wantDetail ? 2 : 3);
      if (next === tier) return;
      tier = next;
      for (const m of detailMeshes) m.visible = wantDetail;
      for (const m of interiorMeshes) m.visible = wantInterior;
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
