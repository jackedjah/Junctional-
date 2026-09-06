/* MAHWORLD :: FOBLOCK — THE DESIGN GENOME
   ============================================================================================

   This module exists because the ULTRA MASTER REFERENCE PACK (§4) names a whole object family
   that did not exist anywhere in the scene, and because §6 roots ALL transport in it and §11's
   execution order puts it before transport, hubs and public art. It is the genome, not a prop:
   almost nothing here builds a finished object on its own. It hands other modules the parts.

   ---- WHERE THE FORM COMES FROM -------------------------------------------------------------
   Not invented. The pack's plate "FOB SYSTEMS PHYSICAL OBJECT" is a photograph of a real
   machined object — four polished blocks stacked on a wooden plinth — and every decision below
   is read off it rather than reasoned from the word "block":

     · The body is a ROUNDED SQUARE in plan, with a FLAT TABLE top and bottom and a tight radius
       rolled onto every edge. It is not a chamfered box: no flat facet meets another at an arris
       anywhere on the shell. But it is not a dome either — those blocks STACK, so the tables are
       real and load-bearing. The shell here is therefore a superellipse cross-section swept along
       a true quarter-round fillet, not chamferBox() and not a superellipse in elevation (which
       was the first cut of this file, and which domed the block to a point at both ends).
     · Each block carries a CIRCULAR ENGRAVED MEDALLION on its face — a shallow dark recess with
       a thin bright rim. On the real object it holds the FOB SYSTEMS mark.
     · Each block carries TWO CIRCULAR RINGS projecting left and right at mid height. This is the
       detail no one would have invented, and it is exactly what §4 means by "soft connection
       points": a FOBLOCK connects to the world through rings, not through sockets or clamps.
     · The finish is mirror-polished chromium, and the object reads as HEAVY. Weight is in the
       proportions — a block is slightly wider than it is deep, and never elongated.

   ---- WHAT §4 ADDS ON TOP -------------------------------------------------------------------
   The scale family, which is a semantic ladder rather than a set of sizes: MICRO is a device a
   MAHBEING carries; STANDARD is a station a MAHBEING walks up to; ARCHITECTURAL is a building
   module; MEGA is a rare landmark. Proportions are IDENTICAL across the ladder — that is the
   point of a genome — and only the tessellation and the detail budget change with scale.

   Also the MUSIC SQUARE-DIAMOND: a rounded square rotated 45 degrees, platinum frame, dark
   crystal interior, secondary-colour MAHGIC core. It is physical sound-linked infrastructure,
   so it is built here from the same shell mathematics as the block and shares its material
   roles — a music diamond is a FOBLOCK turned on its corner, not a separate species.

   ---- LAWS THIS FILE OBEYS ------------------------------------------------------------------
   LAW 1 (orientation decides grade). A metal takes no diffuse light: at metalness >= 0.9 a
   surface is lit only by scene.environment, whose zenith is near black, so an UP-FACING face in
   a mirror grade renders BLACK. The rounded crown helps but does not solve it — the very top of
   a rounded block is still horizontal. So the shell is emitted in TWO role buckets: `shell` for
   everything whose normal is more vertical than horizontal (mirror grade legal) and `cap` for
   the up- and down-facing crown and base bands, which the caller must clad in a LOW-metalness
   partner. The split is done by measuring each emitted triangle's own normal, not by guessing
   from the ring index, so it stays correct if the profile is retuned.

   LAW 2 (every emitter is answered). MAHGIC is OFF by default. A caller that turns it on is
   declaring that it will answer it on adjacent geometry. This module never lights the world.

   §06 (smoothness). The shell has no sharp arris by construction. The one form that keeps its
   points is the square diamond, which is the brand figure and exempt.

   Determinism: no Math.random, no Date.now. Nothing here is seeded because nothing here is
   random — a genome is not a scatter.

   ---- CONTRACT ------------------------------------------------------------------------------
   Exports are PARTS, keyed by material role, in a group-of-arrays shape the callers already use
   for merging:
       { shell: [geo...], cap: [geo...], dark: [geo...], rim: [geo...], ring: [geo...],
         diamond: [geo...], energy: [geo...] }
   Every geometry is non-indexed, origin-centred on X/Z, and sits with its BASE at y = 0, which
   is the anchor every other module in this world uses for a thing that stands on something.

   No addons. three r185 core only. All geometry procedural. */

import * as THREE from '../vendor/three/three.module.min.js';

const TAU = Math.PI * 2;

/* ---- THE SCALE LADDER (§4) ------------------------------------------------------------------
   `size` is the block's WIDTH in metres and everything else is a ratio of it, so the genome is
   one shape at four scales. `sides` and `rings` are the only things that change with scale, and
   they change because a MICRO block is 15 cm of screen and a MEGA block is a landmark — not
   because the form is different. `detail` gates the parts that stop being legible when small. */
export const TIERS = Object.freeze({
  micro:         { size: 0.16, sides: 12, rings: 5,  detail: 'none'  },  /* a device a MAHBEING carries */
  standard:      { size: 2.20, sides: 20, rings: 9,  detail: 'full'  },  /* a station a MAHBEING walks up to */
  architectural: { size: 12.0, sides: 28, rings: 11, detail: 'full'  },  /* a building module */
  mega:          { size: 58.0, sides: 36, rings: 13, detail: 'full'  }   /* a rare landmark */
});

/* Proportions, measured off the reference object and held constant across the ladder.
   DEPTH < WIDTH is what stops a FOBLOCK reading as a cube; HEIGHT ~= WIDTH is what stops it
   reading as a slab. SQUIRCLE is the superellipse exponent: 2 is a circle, infinity is a square,
   and 4.2 is the value that matches the photographed corner. */
const P = Object.freeze({
  depth: 0.86,          /* of width */
  height: 1.02,         /* of width */
  squircle: 4.2,        /* plan corner: |x|^n + |z|^n = 1 */
  fillet: 0.20,         /* edge radius of the block, of width: the roll onto the flat table */
  medallionR: 0.31,     /* of width */
  medallionDepth: 0.035,
  rimW: 0.030,
  ringR: 0.175,         /* ring centreline radius, of width */
  ringTube: 0.052,
  ringOut: 0.62,        /* ring centre distance from the block's own centre, of width */
  capBand: 0.62         /* |ny| above this counts as an up/down face -> LOW-metalness role */
});

/* ---------------------------------------------------------------- geometry helpers */

/* A superellipse ring of `n` points at unit half-extent, exponent `e`. Even sampling in angle
   would bunch points on the flats and starve the corners, which is where all the curvature is,
   so this samples by ARC rather than by angle: it walks the quadrant, accumulates chord length
   and redistributes. That is the difference between a corner that reads round and one that
   reads as three flats. */
function squircleRing(n, e) {
  const dense = [];
  const M = 256;
  for (let i = 0; i < M; i++) {
    const t = (i / M) * TAU;
    const c = Math.cos(t), s = Math.sin(t);
    const k = Math.pow(Math.pow(Math.abs(c), e) + Math.pow(Math.abs(s), e), -1 / e);
    dense.push([c * k, s * k]);
  }
  /* cumulative arc length */
  const cum = [0];
  for (let i = 1; i <= M; i++) {
    const a = dense[i - 1], b = dense[i % M];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[M], out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (j < M && cum[j + 1] < target) j++;
    const seg = cum[j + 1] - cum[j] || 1;
    const f = (target - cum[j]) / seg;
    const a = dense[j], b = dense[(j + 1) % M];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/* THE ELEVATION PROFILE — a FILLETED BLOCK, not a dome.
   The first cut of this file used a superellipse up the height as well as across the plan. That
   is wrong, and the reference object says why: those blocks STACK. Each one has a flat table top
   and bottom with a tight radius rolled onto the edge. A superellipse reaches zero at both ends,
   so it domes to a point and there is no table to stack on — which is a different object.

   So the ends are a true quarter-round fillet of radius R, solved in angle so the tessellation is
   arc-even rather than height-even (height-even starves the tight part of the turn, which is the
   only part with curvature):

       a in [0, pi/2]      y      = R * (1 - cos a)      a=0 at the very end,  a=pi/2 at full width
                           inset  = R * (1 - sin a)      inset R at the end,   0 at full width

   Centre the arc at (halfExtent - R, R) and every point is exactly R from it, so this is a real
   fillet and not an approximation of one. The inset is applied in ABSOLUTE metres on both x and z,
   which matters because the plan is not square (depth is 0.86 of width): a scale factor would roll
   a wider radius onto the long side than the short one, and the object would stop reading as one
   machined family. */
function levelYs(h, R, kf) {
  const ys = [], ins = [];
  for (let i = 0; i <= kf; i++) {
    const a = (i / kf) * (Math.PI / 2);
    ys.push(R * (1 - Math.cos(a))); ins.push(R * (1 - Math.sin(a)));
  }
  ys.push(h * 0.5); ins.push(0);                       /* the straight middle needs one row */
  for (let i = kf; i >= 0; i--) {
    const a = (i / kf) * (Math.PI / 2);
    ys.push(h - R * (1 - Math.cos(a))); ins.push(R * (1 - Math.sin(a)));
  }
  return { ys, ins };
}

/* Emit one triangle into the correct role bucket by its OWN normal (LAW 1). */
function tri(buckets, a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const L = Math.hypot(nx, ny, nz);
  if (L < 1e-12) return;
  nx /= L; ny /= L; nz /= L;
  const arr = Math.abs(ny) > P.capBand ? buckets.cap : buckets.shell;
  arr.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  arr.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
}

function finish(arr) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(arr.n), 3));
  return g;
}

/* ---------------------------------------------------------------- THE SHELL */

/* The rounded-square block body. Returns { shell, cap } geometries, split by LAW 1.
   w / d / h are full extents; the base sits at y = 0. */
function shellGeometry(w, d, h, sides, rings) {
  const buckets = { shell: [], cap: [] };
  buckets.shell.n = []; buckets.cap.n = [];
  const ring = squircleRing(sides, P.squircle);
  const R = Math.min(P.fillet * w, h * 0.48, Math.min(w, d) * 0.48);
  const kf = Math.max(3, Math.round(rings * 0.45));
  const { ys, ins } = levelYs(h, R, kf);
  const hx = w * 0.5, hz = d * 0.5;
  const lvl = ys.map((y, r) => {
    const ax = Math.max(1e-4, hx - ins[r]), az = Math.max(1e-4, hz - ins[r]);
    return ring.map(([x, z]) => [x * ax, y, z * az]);
  });
  for (let r = 0; r < lvl.length - 1; r++) {
    const A = lvl[r], B = lvl[r + 1];
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      tri(buckets, A[i], B[i], B[j]);
      tri(buckets, A[i], B[j], A[j]);
    }
  }
  /* THE TABLES. Both ends are real flat faces inset by R — the surface a block stacks on — so
     they are fanned to their own centre. They are also the two most horizontal faces on the
     object, so tri() will route every one of these triangles into the `cap` bucket, which is
     precisely the LAW 1 split this file exists to get right. */
  const capAt = (row, y, up) => {
    const c = [0, y, 0];
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      if (up) tri(buckets, row[i], row[j], c); else tri(buckets, row[j], row[i], c);
    }
  };
  capAt(lvl[lvl.length - 1], h, true);
  capAt(lvl[0], 0, false);
  return { shell: finish(buckets.shell), cap: finish(buckets.cap) };
}

/* ---------------------------------------------------------------- THE MEDALLION */

/* The circular engraved face: a dark recessed disc with a thin bright rim, sunk into the +Z
   face. Built from rings rather than CircleGeometry so the recess has a real wall and reads as
   machined rather than printed. */
function medallionParts(w, d, h, seg) {
  const dark = [], rim = [];
  const R = P.medallionR * w, z0 = d * 0.5 * 0.985, z1 = z0 - P.medallionDepth * w;
  const y = h * 0.5;
  const push = (arr, a, b, c) => arr.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  for (let i = 0; i < seg; i++) {
    const t0 = (i / seg) * TAU, t1 = ((i + 1) / seg) * TAU;
    const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
    /* recess wall */
    push(rim, [c0 * R, y + s0 * R, z0], [c0 * R, y + s0 * R, z1], [c1 * R, y + s1 * R, z1]);
    push(rim, [c0 * R, y + s0 * R, z0], [c1 * R, y + s1 * R, z1], [c1 * R, y + s1 * R, z0]);
    /* dark face */
    push(dark, [0, y, z1], [c0 * R, y + s0 * R, z1], [c1 * R, y + s1 * R, z1]);
    /* bright rim band on the outside of the recess */
    const Ro = R + P.rimW * w;
    push(rim, [c0 * R, y + s0 * R, z0], [c1 * R, y + s1 * R, z0], [c1 * Ro, y + s1 * Ro, z0]);
    push(rim, [c0 * R, y + s0 * R, z0], [c1 * Ro, y + s1 * Ro, z0], [c0 * Ro, y + s0 * Ro, z0]);
  }
  const mk = a => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(a), 3)); g.computeVertexNormals(); return g; };
  return { dark: mk(dark), rim: mk(rim) };
}

/* ---------------------------------------------------------------- THE CONNECTION RINGS */

/* Two rings projecting left and right at mid height — §4's "soft connection points", and the
   single most identifying feature of the reference object. Their plane contains the vertical
   axis and faces the viewer, exactly as photographed. */
function ringParts(w, h, seg, tube) {
  const out = [];
  const R = P.ringR * w, t = P.ringTube * w, cx = P.ringOut * w, cy = h * 0.5;
  for (const sd of [-1, 1]) {
    const g = new THREE.TorusGeometry(R, t, Math.max(5, tube), Math.max(9, seg));
    g.translate(sd * cx, cy, 0);
    out.push(g);
  }
  return out;
}

/* ---------------------------------------------------------------- PUBLIC: ONE FOBLOCK */

/* Build one FOBLOCK's parts, keyed by material role. The caller merges or instances them and
   decides the grades — this module never creates a material, because materials.js owns the
   palette and a genome that carried its own would drift from it.

   opts:
     tier      'micro' | 'standard' | 'architectural' | 'mega'  (or omit and pass `size`)
     size      explicit width in metres, overrides the tier's
     medallion true (default) — the engraved face
     rings     true (default) — the lateral connection rings
     diamond   false (default) — a square-diamond inlay on the face, the brand figure
     energy    false (default) — a MAHGIC seam. LAW 2: only if you will answer it. */
export function foblockParts(opts = {}) {
  const tier = TIERS[opts.tier] || TIERS.standard;
  const w = opts.size != null ? opts.size : tier.size;
  const d = w * P.depth, h = w * P.height;
  const full = tier.detail === 'full';
  const out = { shell: [], cap: [], dark: [], rim: [], ring: [], diamond: [], energy: [] };

  const s = shellGeometry(w, d, h, tier.sides, tier.rings);
  out.shell.push(s.shell);
  out.cap.push(s.cap);

  if (full && opts.medallion !== false) {
    const m = medallionParts(w, d, h, Math.max(12, Math.round(tier.sides * 0.8)));
    out.dark.push(m.dark); out.rim.push(m.rim);
  }
  if (full && opts.rings !== false) {
    out.ring.push(...ringParts(w, h, Math.round(tier.sides * 0.5), Math.round(tier.sides * 0.3)));
  }
  /* THE BRAND FIGURE, as RELIEF and not as a spike. An octahedron keeps its points by law (§06's
     one exemption) and is the only sharp thing this module will ever emit — but a full octahedron
     sitting on the face protrudes by its own radius, which measured 0.32 m proud of a 2.2 m block:
     a caltrop bolted to a machined object. The mark is ENGRAVED on the reference, so this is
     flattened hard through Z and sunk into the medallion recess. Its silhouette against the face
     is still the square diamond, which is the whole read; only its depth is gone. */
  if (full && opts.diamond) {
    const rD = P.medallionR * w * 0.46;
    const g = new THREE.OctahedronGeometry(rD, 0);      /* the square-diamond mark */
    g.scale(1, 1, 0.22);
    g.translate(0, h * 0.5, d * 0.5 * 0.985 - P.medallionDepth * w * 0.62);
    out.diamond.push(g);
  }
  if (opts.energy) {
    /* a thin localized MAHGIC band around the waist, sitting just proud of the shell */
    const seg = Math.max(12, tier.sides), R = squircleRing(seg, P.squircle);
    const pos = [], y0 = h * 0.5 - w * 0.012, y1 = h * 0.5 + w * 0.012, k = 1.004;
    for (let i = 0; i < seg; i++) {
      const a = R[i], b = R[(i + 1) % seg];
      const ax = a[0] * w * 0.5 * k, az = a[1] * d * 0.5 * k, bx = b[0] * w * 0.5 * k, bz = b[1] * d * 0.5 * k;
      pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.computeVertexNormals();
    out.energy.push(g);
  }
  return out;
}

/* ---------------------------------------------------------------- PUBLIC: MUSIC DIAMOND */

/* §4: "rounded square rotated 45 degrees + platinum frame + dark crystal interior +
   secondary-color MAHGIC core." It is the same shell mathematics turned on its corner, because
   a music diamond is a FOBLOCK standing on a point rather than a different species — which is
   what makes the two read as one civilisation's hardware.

   `size` is the diamond's WIDTH across the flats before rotation; the returned parts are
   centred on the origin so a caller can hang one at any height. */
export function musicDiamondParts(opts = {}) {
  const w = opts.size != null ? opts.size : 1.8;
  const sides = opts.sides || 20;
  const t = w * 0.22;                              /* thickness through the face */
  const out = { shell: [], cap: [], dark: [], rim: [], ring: [], diamond: [], energy: [] };

  /* the frame: a rounded square extruded through its own thickness, then turned 45 degrees */
  const ring = squircleRing(sides, P.squircle);
  const pos = [];
  const face = (z, flip) => {
    for (let i = 0; i < sides; i++) {
      const a = ring[i], b = ring[(i + 1) % sides];
      const A = [a[0] * w * 0.5, a[1] * w * 0.5, z], B = [b[0] * w * 0.5, b[1] * w * 0.5, z], C = [0, 0, z];
      if (flip) pos.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
      else pos.push(B[0], B[1], B[2], A[0], A[1], A[2], C[0], C[1], C[2]);
    }
  };
  for (let i = 0; i < sides; i++) {
    const a = ring[i], b = ring[(i + 1) % sides];
    const ax = a[0] * w * 0.5, ay = a[1] * w * 0.5, bx = b[0] * w * 0.5, by = b[1] * w * 0.5;
    pos.push(ax, ay, -t / 2, bx, by, -t / 2, bx, by, t / 2, ax, ay, -t / 2, bx, by, t / 2, ax, ay, t / 2);
  }
  const frame = new THREE.BufferGeometry();
  frame.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  frame.computeVertexNormals();
  frame.rotateZ(Math.PI / 4);                      /* THE ROTATION: a square on its corner */
  out.shell.push(frame);

  /* dark crystal interior: the same rounded square, inset and recessed on both faces */
  const inner = [];
  const k = 0.70;
  for (const z of [-t * 0.28, t * 0.28]) {
    for (let i = 0; i < sides; i++) {
      const a = ring[i], b = ring[(i + 1) % sides];
      const A = [a[0] * w * 0.5 * k, a[1] * w * 0.5 * k, z], B = [b[0] * w * 0.5 * k, b[1] * w * 0.5 * k, z];
      if (z > 0) inner.push(A[0], A[1], A[2], B[0], B[1], B[2], 0, 0, z);
      else inner.push(B[0], B[1], B[2], A[0], A[1], A[2], 0, 0, z);
    }
  }
  const dark = new THREE.BufferGeometry();
  dark.setAttribute('position', new THREE.BufferAttribute(new Float32Array(inner), 3));
  dark.computeVertexNormals();
  dark.rotateZ(Math.PI / 4);
  out.dark.push(dark);

  /* the MAHGIC core — the one part that carries the secondary colour. Off unless asked, LAW 2. */
  if (opts.energy) {
    const core = new THREE.OctahedronGeometry(w * 0.17, 0);   /* the square-diamond core */
    out.energy.push(core);
  }
  return out;
}

/* ---------------------------------------------------------------- measurement */

/* Triangle count of a parts bundle, so a caller can budget honestly instead of estimating. */
export function countTriangles(parts) {
  let n = 0;
  for (const k of Object.keys(parts)) {
    for (const g of parts[k]) {
      /* index-aware: TorusGeometry is INDEXED, and counting its vertices as if it were not
         returned a fractional triangle count the first time this was measured. */
      const idx = g.getIndex();
      if (idx) { n += idx.count / 3; continue; }
      const p = g.getAttribute('position');
      if (p) n += p.count / 3;
    }
  }
  return n;
}

export default { TIERS, foblockParts, musicDiamondParts, countTriangles };
