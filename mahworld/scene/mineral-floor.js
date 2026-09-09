/* MAHWORLD WORLD 01 :: THE MINERAL FLOOR — a premium rock, not a plane
   ============================================================================================

   ---- THE DIRECTION, AND WHY IT IS NOT A REVERSAL -----------------------------------------------
   "Make the entire floor have random diamond elements to it, like a supreme premium mineral rock
    all across. It's not completely flat — it has ridges and entropy and multiple sizes of faces on
    the shards. Darker. And patterns that imitate streets, something we can follow to go to the
    buildings, decorative of a town."

   An earlier note said get rid of all the lines and make the floor smooth. That is the same
   direction, not its opposite, and the distinction is the whole design of this module: what was
   removed was a REPEATING LATTICE — one cell shape, one size, tiled to the horizon, with a bright
   seam drawn between every pair. What is asked for now is the opposite of a lattice: irregular
   facets at many sizes with real relief, which reads as cut stone rather than as a grid.

   So: no seams, no inlaid lines, no painted pattern. The floor is a SURFACE whose own geometry is
   crystalline, and the streets are cut into it as a change of that geometry.

   ---- HOW THE ENTROPY IS BUILT -----------------------------------------------------------------
   A jittered polar tessellation, which gives multi-scale faces for free where a square grid cannot:

     · RING SPACING GROWS with an irregular step, so bands of facets are not evenly deep;
     · SEGMENT COUNT is chosen per ring to hold the facet's arc length near a target that itself
       drifts, so the plan size of a face varies by a factor of about three across the disc;
     · EVERY VERTEX IS JITTERED in both radius and angle before it is used, which is what stops the
       triangulation from reading as concentric at all — a regular polar mesh has visible rings and
       spokes, and jitter of a third of a cell destroys both;
     · HEIGHT is three octaves of value noise plus a sparse SHARD term — a handful of larger plates
       that stand several times higher than the general relief, so the surface has incidents in it
       and not just texture.

   Everything is hashed from integer lattice coordinates with the golden ratio. No Math.random: the
   floor must be identical on every load or a collider measured against it means nothing.

   ---- THE STREETS ------------------------------------------------------------------------------
   A street here is not drawn, it is CUT. Inside a street corridor the surface is pulled flat, the
   shard term is suppressed, the facets are polished (a separate smoother grade), and the ground
   drops a few centimetres so the rough mineral stands over it like a kerb that was never built as a
   kerb. You can follow it because it is the flat, bright, quiet path through a dark broken field —
   which is how a real paved route reads against rock, and it needs no painted line at all.

   The corridors come from campus-plan.js, so they lead where the world actually is:
     · a RADIAL AVENUE out to each named facility, on that facility's own bearing;
     · the QUAD RING, a circular promenade at the quad's edge joining all three avenues;
     · the LOOP at 186 m, the campus boulevard behind the facilities;
     · SPURS off the quad ring to each frontage terrace, so every named door has a route to it.

   ---- COST -------------------------------------------------------------------------------------
   Two meshes: rough and street, split by material so the polish differs. About 60k triangles for a
   420 m disc, flat-shaded, no texture, no transparency. The material joins ctx.floorMaterials so it
   takes the world's platinum patch and the celestial sun/moon path with every other ground surface.

   No addons; three r185 core only; procedural; deterministic. */

import * as THREE from '../vendor/three/three.module.min.js';
import { CAMPUS, at } from './campus-plan.js';
import { applyCelestialPath } from './materials.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/* ---- deterministic value noise ---------------------------------------------------------------
   hash2 is the standard sin-fract hash with the project's own constants; noise2 is bilinear value
   noise over the integer lattice with a smoothstep fade. Three octaves is enough relief for stone
   at this scale and cheap enough to evaluate per vertex at build time. */
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x, y) {
  return 0.56 * noise2(x, y) + 0.30 * noise2(x * 2.13 + 5.2, y * 2.13 - 1.7)
       + 0.14 * noise2(x * 4.61 - 3.1, y * 4.61 + 9.4);
}

export const MINERAL = Object.freeze({
  R_MAX: 420,             /* the mineral disc: campus, forecourts, loop and a margin past it */
  FACET: 3.6,             /* target facet arc, metres — the base of the size distribution */
  FACET_VARY: 1.9,        /* how far the target drifts, so faces come in a range of sizes */
  /* RELIEF AND SHARD, MEASURED OFF THE FIRST RENDER. At 0.30 / 0.72 the surface was technically
     faceted and visually flat: at a walking eye height of 1.75 m, thirty centimetres of relief a
     hundred metres away subtends almost nothing, and the facets read as a very slightly mottled
     plane. Rock is read by the SHADOW one plate throws on the next, and that needs plates with
     real height. */
  RELIEF: 0.85,           /* general crystalline relief, metres peak to trough */
  SHARD: 1.90,            /* the sparse larger plates that stand over it */
  STREET_W: 15,           /* half-width of a radial avenue */
  RING_W: 7.5,            /* half-width of the quad-edge promenade and the loop */
  STREET_DROP: 0.075,     /* how far a street sits below the rough ground it is cut into */
  EDGE: 5.0               /* how wide the transition from street to rough is */
});

/* ---- THE STREET PLAN ---------------------------------------------------------------------------
   ONE function answers where a street is, WHICH street it is, and how close to its kerb a point
   lies, because the height field, the material split, the district colour and the kerb line all
   need the same answer and any two of them disagreeing is a seam. It returns:

     s     0..1   how "street" the point is; 1 deep in a corridor, 0 out on the rough
     kind  which family owns it — 'avenue' | 'ring' | 'spur' | ''
     site  the named facility an avenue leads to, or '' — this is what carries the district colour
     kerb  0..1   how close to the corridor's edge, so a bright edge strip can be drawn from it
     cross 0..1   how close to a junction of an avenue and a ring

   ---- WHAT THE FIRST RENDER MEASURED, AND WHY THIS IS DIFFERENT --------------------------------
   valuecheck on quad-edge-across reported mineral-street covering 24.6 % of a ground-level frame.
   A quarter of the visible world was road. That is what happens when three radial avenues, a ring,
   a loop and twenty-four spurs all converge on one origin: near the centre, everything is street,
   so nothing reads AS a street — there is no pattern to follow, only a pale field.

   So the avenues now START at the plaza rim instead of at the origin, and the centre is a plaza in
   its own right rather than the place where six roads pile up. That is also what the direction is
   asking for: "patterns that imitate streets, something we can follow to go to the buildings".
   A route you can follow needs edges, and edges need something on the other side of them. */
const PLAZA_R = 34;        /* the medallion at the middle: the avenues begin outside it */

function streetAt(x, z) {
  const r = Math.hypot(x, z);
  const out = { s: 0, kind: '', site: '', kerb: 0, cross: 0 };
  if (r < 1e-3) { out.s = 1; out.kind = 'ring'; return out; }
  const band = (d, half) => Math.min(1, Math.max(0, 1 - (Math.abs(d) - half) / MINERAL.EDGE));
  /* how close to the OUTER edge of a band of half-width `half`: 1 exactly on the kerb line */
  const lip = (d, half) => Math.min(1, Math.max(0, 1 - Math.abs(Math.abs(d) - half) / 2.2));
  const take = (s, kind, site, kerb) => {
    if (s <= out.s) { out.kerb = Math.max(out.kerb, kerb * s); return; }
    out.s = s; out.kind = kind; out.site = site; out.kerb = Math.max(out.kerb, kerb);
  };

  const aDeg = (Math.atan2(x, -z) / DEG + 360) % 360;

  /* the central plaza — one disc, not a junction */
  if (r < PLAZA_R + MINERAL.EDGE) take(band(r - PLAZA_R * 0.5, PLAZA_R * 0.5), 'ring', '', lip(r - PLAZA_R * 0.5, PLAZA_R * 0.5));

  /* the three radial avenues, one per named facility, from the plaza rim out past its facade */
  for (const k of Object.keys(CAMPUS.SITES)) {
    const b = CAMPUS.SITES[k].deg;
    const dd = Math.abs(((aDeg - b) % 360 + 540) % 360 - 180);
    const lateral = dd * DEG * r;                       /* arc distance off the avenue's centreline */
    if (r > PLAZA_R - 4 && r < CAMPUS.FORECOURT_R + 26)
      take(band(lateral, MINERAL.STREET_W), 'avenue', k, lip(lateral, MINERAL.STREET_W));
  }
  /* the quad-edge promenade, and the loop boulevard behind the facilities */
  take(band(r - CAMPUS.QUAD_R, MINERAL.RING_W), 'ring', '', lip(r - CAMPUS.QUAD_R, MINERAL.RING_W));
  take(band(r - CAMPUS.LOOP_R, MINERAL.RING_W), 'ring', '', lip(r - CAMPUS.LOOP_R, MINERAL.RING_W));
  /* a spur from the quad ring out to every frontage terrace, so each named door has a route */
  const FRONT_R = (CAMPUS.QUAD_R + CAMPUS.FORECOURT_R) / 2;
  if (r > CAMPUS.QUAD_R - 8 && r < FRONT_R + 10) {
    for (let i = 0; i < 24; i++) {
      const b = i * 15 + 8;
      const dd = Math.abs(((aDeg - b) % 360 + 540) % 360 - 180);
      take(band(dd * DEG * r, 4.4) * 0.85, 'spur', '', 0);
    }
  }

  /* JUNCTIONS. Where an avenue meets a ring, a town lays something different — a paved square, a
     crossing, a change of stone. This marks those cells so the colour pass can, which is the
     cheapest possible way to stop a road network reading as a stencil. */
  for (const R0 of [CAMPUS.QUAD_R, CAMPUS.LOOP_R]) {
    if (Math.abs(r - R0) > 22) continue;
    for (const k of Object.keys(CAMPUS.SITES)) {
      const dd = Math.abs(((aDeg - CAMPUS.SITES[k].deg) % 360 + 540) % 360 - 180) * DEG * r;
      if (dd < 22) out.cross = Math.max(out.cross, 1 - Math.hypot(r - R0, dd) / 22);
    }
  }
  out.s = Math.min(1, out.s);
  return out;
}

/* the surface height at a point, and the two terms that make it. Returned together because the
   colour wants to know how high a facet stands as well as where it is. */
function heightAt(x, z, street) {
  const rough = fbm(x * 0.055, z * 0.055) - 0.5;
  /* the sparse shard plates: a second, much coarser field, thresholded so only its peaks fire */
  const sh = fbm(x * 0.013 + 41.3, z * 0.013 - 17.9);
  const shard = Math.max(0, sh - 0.62) * (1 / 0.38);
  const flat = 1 - street;
  return rough * MINERAL.RELIEF * flat
       + shard * shard * MINERAL.SHARD * flat
       - street * MINERAL.STREET_DROP;
}

export function buildMineralFloor(ctx) {
  const { M, scene } = ctx;
  const group = new THREE.Group(); group.name = 'mineral-floor';
  const owned = { geometries: [], materials: [] };
  const stats = { facets: 0, rings: 0, streetFacets: 0, draws: 0 };

  const FLOOR_TOP = 0.17;

  /* ---- the jittered polar lattice ----------------------------------------------------------- */
  const rings = [];
  {
    let r = 0, i = 0;
    while (r < MINERAL.R_MAX) {
      /* the ring's own facet target drifts, which is where "multiple sizes of faces" comes from:
         two adjacent bands can differ by a factor of two in both depth and arc. */
      const t = MINERAL.FACET + MINERAL.FACET_VARY * (hash2(i * 3.7, 11.2) - 0.5) * 2;
      const step = Math.max(1.6, t * (0.75 + 0.9 * hash2(i * 1.9, 5.5)));
      const segs = Math.max(8, Math.round((TAU * Math.max(r, 4)) / Math.max(1.8, t)));
      rings.push({ r, segs });
      r += step; i++;
    }
    rings.push({ r: MINERAL.R_MAX, segs: rings[rings.length - 1].segs });
    stats.rings = rings.length;
  }
  /* a vertex, jittered in polar and lifted by the height field. Cached per (ring, seg) so adjacent
     facets share exactly one vertex position and the surface stays watertight. */
  const vcache = new Map();
  const vert = (ri, j) => {
    const R = rings[ri], n = R.segs, jj = ((j % n) + n) % n;
    const key = ri * 100000 + jj;
    let v = vcache.get(key);
    if (v) return v;
    const a0 = (jj / n) * TAU;
    /* jitter: up to a third of a cell in each axis, hashed so it is stable and seamless */
    const jr = (hash2(ri * 7.3 + 1.1, jj * 2.9) - 0.5) * Math.min(3.2, R.r * 0.12 + 1.4);
    const ja = (hash2(ri * 4.1, jj * 8.7 + 3.3) - 0.5) * (TAU / n) * 0.62;
    const rr = Math.max(0, R.r + (ri === 0 || ri === rings.length - 1 ? 0 : jr));
    const a = a0 + (ri === 0 ? 0 : ja);
    const x = Math.sin(a) * rr, z = -Math.cos(a) * rr;
    const z0 = streetAt(x, z);
    v = { x, z, st: z0.s, zone: z0, y: FLOOR_TOP + heightAt(x, z, z0.s) };
    vcache.set(key, v);
    return v;
  };

  /* ---- triangulate, splitting each face into the rough bucket or the street bucket ----------- */
  const P = { rough: [], street: [] }, C = { rough: [], street: [] };
  const push = (bucket, A, B, Cv) => {
    const p = P[bucket], c = C[bucket];
    p.push(A.x, A.y, A.z, B.x, B.y, B.z, Cv.x, Cv.y, Cv.z);
    /* ONE COLOUR PER FACET, not per vertex: a flat-shaded crystal reads by whole faces, and giving
       each face a single value is what makes a field of them look like cut stone rather than like a
       smoothly shaded dune with creases in it. The value comes from the facet's own height and a
       hash of its centroid, so a bright plate sits next to a dark one with no gradient between. */
    const my = (A.y + B.y + Cv.y) / 3, mst = (A.st + B.st + Cv.st) / 3;
    const mx = (A.x + B.x + Cv.x) / 3, mz = (A.z + B.z + Cv.z) / 3;
    const lift = Math.min(1, Math.max(0, (my - FLOOR_TOP) / (MINERAL.SHARD * 0.9) + 0.34));
    const grain = hash2(Math.round(mx * 0.7), Math.round(mz * 0.7));
    const Z = A.zone;                       /* the facet's zone: one vertex is enough at this scale */

    /* ---- THE VALUE LADDER, REBUILT FROM A MEASUREMENT --------------------------------------
       valuecheck on quad-edge-across: mineral-street rendered at 167.9 over 24.6 % of the frame
       against a frame mean of 130.5, and mineral-rough at 146.0. Both grades were the BRIGHTEST
       large things in a ground-level view of a world whose direction says "it should be a darker
       color", and the street — meant to be a path across dark stone — was reading as a pale field
       with the stone as a faint mottle on it. Twice I moved roughness and metalness to fix that and
       twice it stayed inverted, because roughness and metalness were never the cause.

       THE CAUSE IS ALBEDO. These vertex colours ARE the stone's diffuse albedo, in linear space,
       and the old rough grade averaged about 0.26 of it. Under a daytime irradiance a shade over
       one, 0.26 linear leaves the tone map at roughly sRGB 0.55 — mid-grey, which is where the
       render put it. Nothing downstream can make a 0.26-albedo surface read as dark rock; it has to
       BE dark. So the field now averages nearer 0.06, its darkest facets sit at 0.012, and its
       bright plates reach 0.20 — a cut-stone spread of about ninety values rather than thirty, on a
       field whose mean lands well below the sky instead of above it.

       The street is a deliberate step ABOVE that field, not a different material trick: about 0.17,
       flat, so it reads as the calm route across dark ground. It gets its value from its own colour
       rather than from what it reflects, which is the other half of why the first two attempts
       failed — a polished surface at grazing incidence reflects the DARK horizon, so raising
       metalness to brighten a road makes it darker. */
    let cr, cg, cb;
    if (mst > 0.5) {
      /* ---- STREET. One value, one family, and the town read comes from what is drawn ON it. */
      let v = 0.150 + 0.035 * grain;
      let tr = 1.00, tg = 1.00, tb = 1.00;
      /* DISTRICT COLOUR (§13: silver, graphite, deep navy, cool white, with selective sky-blue,
         purple and clean red — no yellow, amber, bronze or gold). Each avenue carries the colour of
         the destination it leads to, so the floor itself is wayfinding: follow the blue to the
         market, the red to the match, the white to the gym. This is the "patterns that imitate
         streets, something we can follow to go to the buildings" made literal, and it is the one
         place in this module where colour is information rather than decoration. */
      if (Z.kind === 'avenue') {
        if (Z.site === 'market') { tr = 0.62; tg = 0.88; tb = 1.34; }        /* sky blue */
        else if (Z.site === 'match') { tr = 1.34; tg = 0.66; tb = 0.70; }    /* clean red */
        else { tr = 1.06; tg = 1.08; tb = 1.14; }                            /* gym: cool white */
        v *= 0.92;                        /* tinted stone sits a step down, so the kerb still reads */
      } else if (Z.kind === 'spur') {
        v *= 0.86;                        /* a service spur is quieter than a boulevard */
      }
      /* the KERB: a bright cut edge along every corridor. An edge is what turns a pale patch into a
         road — the eye reads the line, not the fill. */
      const k = Z.kerb * Z.kerb;
      v = v * (1 - k) + 0.315 * k;
      if (k > 0.15) { tr = tr * (1 - k) + k; tg = tg * (1 - k) + k; tb = tb * (1 - k) + k; }
      /* the JUNCTION: where an avenue crosses a ring, a paved square of a lighter stone */
      const j = Z.cross * Z.cross;
      v = v * (1 - j * 0.8) + 0.235 * j * 0.8;
      cr = v * tr; cg = v * tg; cb = v * tb;
    } else {
      /* ---- THE ROUGH FIELD. Dark premium mineral: near-black in the troughs, cool graphite on the
         plates, and rare bright faces where a shard catches. grain CUBED keeps the bright faces
         sparse, which is what makes them read as catches rather than as noise. */
      let v = 0.012 + 0.070 * lift + 0.115 * grain * grain * grain;
      /* PARCELS. A town is not one continuous ground: it is blocks, and blocks differ. A slow
         two-octave field, quantised into coarse cells, shifts whole regions of stone a step lighter
         or darker so the field between the streets reads as parcels of a place rather than as one
         texture running to the horizon. This is the answer to "it's too plain, nothing's happening
         there" that does not involve putting more objects on the floor. */
      const px = Math.floor(mx / 26 + 0.5), pz = Math.floor(mz / 26 + 0.5);
      const parcel = hash2(px * 5.1, pz * 9.3);
      v *= 0.74 + 0.62 * parcel;
      /* a few parcels are a deep cool navy rather than graphite — §13's navy, used sparingly, so
         the ground has quarters rather than one tone */
      const navy = parcel > 0.86 ? (parcel - 0.86) / 0.14 : 0;
      cr = v * (0.92 - 0.30 * navy);
      cg = v * (0.97 - 0.16 * navy);
      cb = v * (1.12 + 0.34 * navy);
    }
    for (let k = 0; k < 3; k++) c.push(cr, cg, cb);
  };

  for (let ri = 0; ri < rings.length - 1; ri++) {
    const lo = rings[ri], hi = rings[ri + 1];
    const n = Math.max(lo.segs, hi.segs);
    for (let j = 0; j < n; j++) {
      const a0 = vert(ri, Math.floor(j * lo.segs / n)), a1 = vert(ri, Math.floor((j + 1) * lo.segs / n));
      const b0 = vert(ri + 1, Math.floor(j * hi.segs / n)), b1 = vert(ri + 1, Math.floor((j + 1) * hi.segs / n));
      const st = (a0.st + a1.st + b0.st + b1.st) / 4;
      const bucket = st > 0.5 ? 'street' : 'rough';
      if (bucket === 'street') stats.streetFacets += 2;
      if (a0 !== a1) { push(bucket, a0, a1, b1); stats.facets++; }
      if (b0 !== b1) { push(bucket, a0, b1, b0); stats.facets++; }
    }
  }

  /* ---- materials. Both join ctx.floorMaterials so the world's platinum patch and the celestial
     path reach them exactly as they reach every other ground surface. ------------------------- */
  const mk = (name, rough, metal, env) => {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, flatShading: true,
      roughness: rough, metalness: metal, envMapIntensity: env, fog: true
    });
    m.name = name; owned.materials.push(m);
    /* DELIBERATELY NOT IN ctx.floorMaterials. That list is what mahplaza's patchFloor grades, and
       its whole job is to crush a FLAT surface to near-black and hand its value back as a grazing
       sheen — which is exactly right for a plane and exactly wrong here: it multiplies outgoingLight
       by 0.075, and the first render of this floor showed the result, every facet's own colour
       flattened into one tone. This surface already carries its value in per-facet vertex colours
       and its shape in real relief, so it takes the world's lighting directly.
       It DOES take the celestial path, because the sun and the moon must cross this floor with the
       clock like every other ground surface in the world. */
    applyCelestialPath(m, { az: 70, el: 5.6, gain: 1.05 });
    return m;
  };
  /* ---- METALNESS, THIRD TIME, AND THE FIRST TWO WERE BOTH TREATING A SYMPTOM ------------------
     Set at 0.88 / 0.94 the two grades stopped being stone at all: a metal takes its value from the
     environment and almost none from its own colour, so the per-facet vertex colours this module
     works so hard to compute were simply not visible, and the ROUGHER grade spread the bright
     daytime sky wider and came out PALER than the polished one — the exact inverse of the intent.
     Lowering them to 0.26 / 0.56 did not fix it, and the measurement said why: at 0.56 metalness
     and 0.20 roughness the street was still a near-mirror, and a near-mirror on the ground reflects
     what is at the horizon, which in this world is a dark navy mountain wall. Polishing a road to
     brighten it makes it darker. That is not a setting to tune, it is the wrong mechanism.

     Both grades are now DIELECTRIC and take their value from albedo, which the value ladder above
     owns. Metalness stays low enough that the vertex colours carry the read; the street keeps a
     touch more, and rather less roughness, so it has a soft sheen a walker can see the sun move
     across without becoming a mirror of the skyline. */
  const matRough = mk('mineral-rough', 0.62, 0.14, 0.95);
  const matStreet = mk('mineral-street', 0.32, 0.22, 1.25);

  for (const [k, mat] of [['rough', matRough], ['street', matStreet]]) {
    if (!P[k].length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P[k]), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C[k]), 3));
    g.computeVertexNormals();
    owned.geometries.push(g);
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'mineral-' + k;
    mesh.receiveShadow = true;
    group.add(mesh); stats.draws++;
  }

  scene.add(group);
  return {
    group, stats,
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      scene.remove(group);
    }
  };
}
