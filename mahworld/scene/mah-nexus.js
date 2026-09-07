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
     you can stand on) to structural (round, which is what a trunk springs from). */
  TIERS: Object.freeze([
    { a: 300, y0: 0,  y1: 26, n: 4.0, mat: 'deck'  },   /* PLINTH: the ground address */
    { a: 232, y0: 26, y1: 60, n: 4.6, mat: 'deck'  },   /* CONCOURSE: the level §9 will open up */
    { a: 168, y0: 60, y1: 92, n: 6.0, mat: 'plate' }    /* COLLAR: where the trunk springs */
  ]),
  SPRING_Y: 92,

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
  SEAT_Y: Object.freeze([26, 60, 92]),   /* the top of each tier, in order */

  /* THE CORE TRUNK. 1730 m of rise on a 236 m section is 7.3:1 — the Washington Monument is 10:1
     and reads as monumental, not slender. §2's "not a crystal spike" is a proportion instruction
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

  /* THE TUBE FAMILIES — §2: "some straight, some gently spiraling, some branch-like, some paired".
     Entropy in route variety is allowed; chaos is not. So the variety is enumerated, not random. */
  STRAIGHT: Object.freeze({ COUNT: 4, SEAT_TIER: 0, SEAT_R: 262, LAND_R: 300, R: 24, N: 3.4, PHASE: 45 }),
  SPIRAL: Object.freeze({ COUNT: 3, SEAT_TIER: 0, SEAT_R: 240, LAND_R: 380, R: 27, N: 3.2, TURNS: 1.15, PHASE: 20 }),
  BRANCH: Object.freeze({ COUNT: 6, SPLIT_AT: 0.44, SEAT_R: 96, LAND_R: 660, R0: 33, R1: 21, N: 3.4, PHASE: 30 }),
  TUBE_STATIONS: 80, TUBE_RADIAL: 20,

  /* CIVIC PETALS — §8. Blocked as masses this pass; they exist because they widen the base in the
     GROUND FAR silhouette and because §8 forbids them being floating islands: each is tied to the
     plinth by a neck.

     OUT and A are sized by the SITE, not by taste. The footprint probe returned relief 0.0 out to
     half-extent 400 m and 105.5 m at 500 m, so the whole complex has to close inside 400. The
     widest petal is OUT + A * 1.10 (the 1.10 is the top of the per-petal size sequence below) =
     310 + 79.2 = 389 m. Nothing in this module may reach past 400 without re-measuring the site. */
  PETALS: Object.freeze({ COUNT: 5, OUT: 310, A: 72, H: 17, N: 4.0, PHASE: 36 }),
  SITE_CLEAR_R: 400,        /* measured: relief 0.0 inside this, 105.5 m of rock outside it */

  LOD_NEAR: 1400, LOD_MID: 4200, LOD_FAR: 26000
});

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
       VERTICAL and TILTED surfaces  -> high-metalness platinum, which sees the bright horizon band
       HORIZONTAL decks             -> low-metalness dark plate, which still takes the lamps
     §07 states the same law as an art direction: platinum is for VERTICALS and EDGES. */
  const mkMat = (src, over) => { const m = (src || new THREE.MeshStandardMaterial()).clone(); Object.assign(m, over || {}); owned.materials.push(m); return m; };
  const shellMat = mkMat(M.platinumMid || M.platinum, { name: 'nexus-shell', envMapIntensity: 1.9, roughness: 0.23, metalness: 0.95 });
  applyPlatinumFinish(shellMat, { scale: 3.6 });
  const trunkMat = mkMat(M.platinumMidBrushed || M.platinumBrushed || M.platinumMid, { name: 'nexus-trunk', envMapIntensity: 1.75, roughness: 0.30, metalness: 0.94 });
  applyPlatinumFinish(trunkMat, { scale: 6.2 });
  const deckMat = mkMat(M.paving || M.graphiteDark, { name: 'nexus-deck', envMapIntensity: 1.35 });
  const recessMat = mkMat(M.graphiteDark || M.structural, { name: 'nexus-recess', roughness: 0.54, metalness: 0.72, envMapIntensity: 1.2 });

  /* ---- ACCUMULATORS. One merge per material, so this whole complex is four draws at full detail. */
  const bins = { shell: [], trunk: [], deck: [], recess: [] };
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
    for (let i = 0; i < P.COUNT; i++) {
      const aDeg = P.PHASE + (360 / P.COUNT) * i;
      const [px, pz] = polar(aDeg, P.OUT);
      const y = 10 + 3 * gold(i + 3);
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
  {
    const C = NEXUS.CORE;
    const y0 = NEXUS.SEAT_Y[C.SEAT_TIER], run = capY - y0;
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(0, y0 + run * (i / 8), 0));
    land('core', 0, capY, 0);
    const curve = new THREE.CatmullRomCurve3(pts);
    const radius = t => {
      /* two eased segments: R0 -> waist -> R_CAP, and the cap flare is short and late so it reads
         as a capital meeting a ceiling rather than as a funnel. */
      if (t <= C.WAIST_AT) { const u = t / C.WAIST_AT, e = u * u * (3 - 2 * u); return C.R0 + (C.R_WAIST - C.R0) * e; }
      if (t <= C.CAP_AT) { const u = (t - C.WAIST_AT) / (C.CAP_AT - C.WAIST_AT), e = u * u * (3 - 2 * u); return C.R_WAIST + (C.R_CAP - C.R_WAIST) * e * 0.62; }
      const u = (t - C.CAP_AT) / (1 - C.CAP_AT), e = u * u * (3 - 2 * u);
      return C.R_WAIST + (C.R_CAP - C.R_WAIST) * (0.62 + 0.38 * e);
    };
    push('trunk', sweptTube(curve, C.STATIONS, C.RADIAL, radius,
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
      push('recess', sweptTube(curve, NEXUS.TUBE_STATIONS, NEXUS.TUBE_RADIAL, () => S.R, () => S.N, () => 0, true, true));
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
      push('recess', sweptTube(curve, NEXUS.TUBE_STATIONS + 24, NEXUS.TUBE_RADIAL, () => S.R, () => S.N, () => 0, true, true));
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

  /* ---- MERGE. One draw per material family. ---------------------------------------------------- */
  const matFor = { shell: shellMat, trunk: trunkMat, deck: deckMat, recess: recessMat };
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
    for (const key of ['trunk', 'recess', 'shell']) {
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
      /* the section is a superellipse, so its narrowest reach is on the DIAGONAL — check there */
      const narrow = superR(Math.PI / 4, T2.a, T2.n);
      if (S2.r + S2.w > narrow) bad.push(S2.id + ' needs ' + (S2.r + S2.w).toFixed(0) + ' has ' + narrow.toFixed(0));
    }
    stats.seatsOK = bad.length === 0;
    stats.seatFaults = bad;
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
    const aDeg = P.PHASE + (360 / P.COUNT) * i;
    const [px, pz] = polar(aDeg, P.OUT);
    const ex = lx - px, ez = lz - pz;
    const a = P.A * (0.82 + 0.28 * frac(i + 1)) * 0.9585;
    if (superR(Math.atan2(ez, ex), a, P.N) >= Math.hypot(ex, ez)) return NEXUS.GROUND_Y + 10 + 3 * gold(i + 3) + P.H + 0.35;
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

export default { buildMahNexus, NEXUS, nexusSurface, nexusCentre, haloUnderY };
