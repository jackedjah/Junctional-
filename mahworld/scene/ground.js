/* MAHPLAZA :: GROUND PLAN
   Three understandable surface layers (brief §08 / notes §12):
   1. the central pedestrian plaza — broad, dark, polished, mostly uninterrupted;
   2. sidewalks / building aprons — slightly raised, materially different;
   3. vehicle corridors — smooth dark lanes at the district edges with
      restrained blue-white markers, curving away so the city continues.
   Plus the MAHPLAZA civic marker (not MAHWORLD: MAHWORLD is the universe),
   a few seating blocks, and the planter spots the flora module fills.
   Deliberately sparse: pavement stays pavement.

   v8 — THE FLOOR IS THE INSTRUMENT. M.plaza became BLACK PLATINUM (0x090c12, roughness 0.055,
   envMapIntensity 2.6): a near mirror. Three consequences run through everything below.

   1. THE FIELD IS RE-GRADED to that family. The hero / satin / contrast cells were authored for a
      mid-dark floor at roughness 0.09–0.24 and read as grey slate against the new plaza. They are
      near-black now, and the three grades survive only as POLISH — a floor of one uniform gloss
      reads as plastic; the difference between a mirror table, a honed outer field and a slightly
      coarser contrast batch is the whole of what makes it laid stone-metal rather than a poured
      surface.
   2. THE CELLS ARE CUT, NOT EXTRUDED. Each is a shallow gem: a buried foot, a turned 45° edge, a
      crown band around its perimeter and a broad flat table. The silhouette is still flat — people
      walk on this — but the crown facets sit about 1.2° off the table, which at the 2–6° depression
      every plaza camera looks down at swings their reflected ray by ~2.4°, enough to hand each band
      a different slice of the horizon. That is the crystal: not a jagged profile, a broken light.
      At every lattice crossing the four cut corners open a square-diamond socket, and a faceted
      MIRROR STUD is inlaid in it — the brand's own figure, and the thing that puts a hard bright
      catch at every joint intersection.
   3. THE FLOOR ANSWERS THE LIGHT. Everything bright standing on the plaza is registered for the
      assembly's mirrored copy AND lays a pooled, tinted gradient on the floor beneath it (see
      lightPool below). An emissive is not a light; the pool and the reflection are how the world
      says it noticed.

   v11 §06 — CRYSTALLINE SMOOTHNESS, applied to a floor. "THE SILHOUETTE IS ROUND. THE SURFACE IS
   CRYSTALLINE." Nothing about the floor's PROFILE changed and nothing about its materials changed:
   the relief is still 3 cm across nine metres and every value in the black-platinum block below is
   still what v8/v9 measured. Three forms were points and are now facets.
     · THE CELL TABLE was an eight-sided pyramid 8 mm proud, so each cell wore a faint eight-way
       starburst in reflection. It is one flat facet now and the crown band took the 8 mm (§CROWN_RISE).
     · THE STANDING SHARDS drew a straight taper and capped it — a cone with a bevel, and reported as
       "pointy blue cones". They carry terrain.js's massif profile now and end on a table (§shardGeo).
     · THE FLUSH INLAYS were squashed four-sided lozenges whose two acute plan corners were 33° points
       lying in the paving. Their corners are CUT — chamfered into a third face each, eight plan
       facets instead of four — and the squash floor rose so no inlay is a sliver.
   What was deliberately LEFT sharp: the crossing studs, the shard sockets and the monument's crystal
   are all the square-diamond brand figure, which §06 exempts by name. */
import * as THREE from '../vendor/three/three.module.min.js';
import { canvasTexture, chamferBox, fobMark, cutGem, gemGirdle, GEM } from './materials.js';
import { SITES } from './buildings.js';

export const PLAZA_RADIUS = 27;
/* THE HERO SURFACE (v5 §05): the plaza floor is laid in ARCHITECTURAL-SCALE diamond cells — nine metres
   across, the width of a room, not a tile pattern. A resident standing on one covers a fifth of it. */
export const DIAMOND_CELL = 9.0;
const HERO_RADIUS = 28;      /* the polished hero field around the marker */
const FIELD_RADIUS = 43;     /* the satin field that carries it out to the aprons and the corridor edge */
export const FLOOR_TOP = 0.17;   /* the laid floor's deck level: everything inlaid sits on THIS, not on y = 0 */

/* THE CUT OF THE STONE (v8). Every height below is measured DOWN from FLOOR_TOP, never up: residents,
   furniture and the dressing module all stand at FLOOR_TOP, so the table apex has to land exactly
   there and the relief has to live underneath it. A cell is 3 cm of relief across nine metres — a
   paving camber, invisible in silhouette, decisive in reflection. */
const CELL_RIM = 0.14;        /* the turned perimeter: 3 cm below the table */
const CELL_CHAMFER = 0.05;    /* the 45° turn between the cell's side and its crown — the bright hairline */
/* v11 §06: the crown band's climb — 1.6° across a 1.07 m band, and it now lands ON the table.
   It was 0.022, which left the table 8 mm short of FLOOR_TOP and forced the eight table triangles to
   fan up to a centre apex: a 0.14° eight-sided pyramid on every one of the sixty-nine cells. Under
   flatShading eight facets 0.14° apart return eight different slices of a horizon-graded environment,
   so each cell wore a faint eight-way STARBURST radiating from its middle — the jagged failure in
   light rather than in profile, repeated across the whole plaza. The band takes the missing 8 mm
   instead, which makes the table a single flat facet exactly at FLOOR_TOP and turns the crown break
   from 1.2° to 1.6°: one BIG designed facet per cell with a harder turn around it, which is the law
   read correctly. The relief is still 3 cm across nine metres and the silhouette is still flat. */
const CROWN_RISE = 0.030;
const CROWN_INNER = 0.74;     /* where the crown stops and the flat table begins */
const CELL_CORNER = 0.55;     /* the cut corner — this is what opens the socket at every crossing */
const JOINT_TOP = 0.133;      /* the joint catch stops a hair below the cell rim, never level with it */
const STUD_APEX = 0.168;      /* the inlaid stud's point, just under the table so nothing stands proud */
const POOL_Y = FLOOR_TOP + 0.07;  /* where light lying ON the floor sits: clear of every tilted cell corner */
/* the plaza gem's halo alpha at night; the clock hook scales it from here.
   THE PLAZA GEM DOES NOT SPIN, and monument.js's does. That is a deliberate split, not an oversight.
   monument.js owns a per-frame update() the assembly already calls, so a turn there is free; this
   file returns a Group and has only a clock hook, so a spin here would mean pushing a permanent
   entry onto ctx.updateHooks — and mahplaza.js keeps its RAF alive whenever that array is non-empty,
   which would defeat prefers-reduced-motion for one rotating object. The glisten this stone needs
   comes from the viewer moving past 256 facets, which is what happens in roam and in every camera
   move; a hero object is not worth a permanent frame loop. */
const PLAZA_GEM_AURA = 0.13;

/* merge a list of geometries into one static BufferGeometry (position + normal); disposes the inputs */
function mergeGeos(list) {
  let n = 0;
  const parts = list.map(g => { const o = g.index ? g.toNonIndexed() : g; if (!o.attributes.normal) o.computeVertexNormals(); if (o !== g) g.dispose(); n += o.attributes.position.count; return o; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) { const c = p.attributes.position.count; pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); o += c; p.dispose(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}

/* module-level scratch: nothing below allocates per cell, per pool or per frame */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler(), _col = new THREE.Color();

/* place a copy of `geo` into `list` at a world transform, so many small parts become ONE mesh */
function place(list, geo, x, y, z, ry = 0) {
  _e.set(0, ry, 0); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(1, 1, 1); _m4.compose(_v, _q, _s);
  const c = geo.index ? geo.toNonIndexed() : geo.clone();
  c.applyMatrix4(_m4); list.push(c); return c;
}

/* ONE CELL OF THE CRYSTALLIZED FLOOR — a shallow cut stone, built base-up so its table lands on
   FLOOR_TOP exactly. Octagonal in plan (law: every box chamfered), and the four cut corners are what
   open the socket the stud is inlaid into. Wound counter-clockwise seen from above (+x toward −z), so
   every face comes out with an outward normal and no fix-up pass is needed.
   THE TABLE IS ONE FACET, not a fan to a raised apex (v11 §06 — see CROWN_RISE). The centre vertex
   sits at exactly the same height as the ring it fans from, so all eight table triangles are coplanar
   and the nine-metre table returns ONE slice of the world. The per-cell tilt below still gives each
   cell its own value; what is gone is the eight-way variation WITHIN a cell.
   56 triangles: 16 side, 16 turned edge, 16 crown, 8 table. */
function crystalCell(size, corner) {
  const h = size / 2, k = h - corner;
  const RIM = [[h, k], [h, -k], [k, -h], [-k, -h], [-h, -k], [-h, k], [-k, h], [k, h]];
  const pos = [];
  const tri = (a, b, c) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const ring = (scale, y) => RIM.map(p => [p[0] * scale, y, p[1] * scale]);
  const A = ring(1, 0);                                        /* the buried foot, hidden in the joint */
  const B = ring(1, CELL_RIM - CELL_CHAMFER);                  /* the side's top */
  const C = ring(1 - CELL_CHAMFER / h, CELL_RIM);              /* the turned edge — this is the hairline that catches */
  const D = ring(CROWN_INNER, CELL_RIM + CROWN_RISE);          /* the crown band's inner edge — this IS the table's rim */
  const table = [0, CELL_RIM + CROWN_RISE, 0];                 /* level with D, so the table is flat; and CELL_RIM + CROWN_RISE === FLOOR_TOP */
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    quad(A[i], A[j], B[j], B[i]);
    quad(B[i], B[j], C[j], C[i]);
    quad(C[i], C[j], D[j], D[i]);
    tri(D[i], D[j], table);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

/* THE INLAID STUD. Four cut cell corners leave a square-diamond socket at every lattice crossing;
   this fills it with a four-facet mirror boss 3.5 cm proud of the joints, whose faces sit 2.1° off
   horizontal. At a plaza camera's 2–6° depression that is the difference between reflecting the
   bright horizon band and reflecting the dark ground below it, so a stud always shows a lit half and
   a dark half — a cut stone turning, which is what the reference frames put at every intersection.
   12 triangles: 8 buried skirt, 4 facets. */
function crystalStud(reach, foot, base) {
  const P = [[reach, 0], [0, -reach], [-reach, 0], [0, reach]];
  const pos = [];
  const tri = (a, b, c) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  const top = [0, STUD_APEX, 0];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const a = [P[i][0], base, P[i][1]], b = [P[j][0], base, P[j][1]];
    const af = [P[i][0], foot, P[i][1]], bf = [P[j][0], foot, P[j][1]];
    tri(af, bf, b); tri(af, b, a);
    tri(a, b, top);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

/* ================= THE GLASS SHARDS SET INTO THIS FLOOR (v9) =========================================
   One deterministic stream for the whole shard field — the same sixty crystals on every load, on every
   machine, and not one of them animates. Same LCG materials.js uses for its procedural textures. */
function shardRandom(seed) { let s = (seed >>> 0) || 9; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ONE SHARD. A crystal grown on the square-diamond section — the brand's own figure, and under LAW 6
   the single form in this world allowed a point — stacked as rings of `sides` vertices and closed with
   a blunt crown. `profile` is the silhouette as [radius, height] fractions bottom to top; `wide`
   squashes the section in local z, which is what turns a prism into a SLIVER, and it is applied before
   the piece is yawed into place so a lozenge can lie at any bearing.

   THE JITTER IS THE WHOLE POINT. All three shard grades are flatShading, so a FACET is the unit of
   shading: two adjacent faces one degree apart return two different slices of the environment. A ring
   whose vertices all sit at one radius and one height is an extruded prism and reads as machined; the
   same ring broken ±25% is a crystal. Deterministic, never animated, exactly like the floor cells' own
   per-cell tilt above.

   AND THE TIP IS TRUNCATED — v11 §06 made this real rather than nominal. Every piece used to close on
   a crown lifted 7% of its own height above the last ring, which on a 2.1 m standing shard is a 15 cm
   cap climbing off a 36 cm ring: a point with a bevel on it, and the reason the standing pieces were
   reported as "pointy blue cones". `crownLift` is now an argument and every caller passes ~0.02, so a
   shard ends on a SMALL FLAT FACET a few degrees off level — a table that holds a highlight where a
   needle aliased into a hairline and caught nothing. The y-jitter is scaled by the ring's own radius
   fraction for the same reason: a wide ring can wander and still read as cut, but the small ring that
   makes the table cannot, or the table comes out torn instead of designed.

   AND THE PLAN CORNERS ARE CUT. `cut` chamfers every corner of every ring IN PLAN: each corner vertex
   becomes two, placed along the two edges that met there, so one sharp arris is replaced by a small
   third face. That is the crystalline answer rather than the smooth one — it ADDS a facet per corner.
   It is what the flush inlays need: they are four-sided AND squashed on one axis, so their two acute
   corners were rhombus points lying in the paving, which is exactly the form §06 names. The standing
   and hero pieces are six- and eight-sided and their plan corners are already obtuse, so they pass
   cut = 0 and pay nothing for it.
   Triangles: n * (2 * (rings - 1) + 2), where n = sides, or 2 * sides when cut > 0. */
function shardGeo(sides, profile, rad, hgt, wide, jit, rnd, cut = 0, crownLift = 0.02) {
  const pos = [];
  const tri = (a, b, c) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const twist = rnd() * Math.PI * 2;
  /* wound +x toward −z, the same winding as crystalCell, so every face comes out with an outward
     normal and no fix-up pass is needed */
  const rings = profile.map(([pr, ph], k) => {
    const out = [];
    for (let i = 0; i < sides; i++) {
      const a = twist + i / sides * Math.PI * 2;
      const rr = rad * pr * (1 - jit + rnd() * jit * 2);
      /* the base ring stays level: it meets a socket, or it is buried in the paving, and a broken
         base ring would show daylight under one edge of every piece */
      const yy = hgt * ph + (k === 0 ? 0 : (rnd() - 0.5) * jit * hgt * 0.5 * pr);
      out.push([Math.cos(a) * rr, yy, -Math.sin(a) * rr * wide]);
    }
    if (!(cut > 0)) return out;
    /* the chamfer: each corner's two replacements sit ON the edges that met there, so the original
       edges stay dead straight and the new face across the corner is a genuine flat, not a fillet.
       Winding is preserved — arriving from i−1 the first vertex met is the one on that edge. */
    const chamfered = [];
    for (let i = 0; i < sides; i++) {
      const p = out[i], a = out[(i - 1 + sides) % sides], b = out[(i + 1) % sides];
      chamfered.push([p[0] + (a[0] - p[0]) * cut, p[1] + (a[1] - p[1]) * cut, p[2] + (a[2] - p[2]) * cut]);
      chamfered.push([p[0] + (b[0] - p[0]) * cut, p[1] + (b[1] - p[1]) * cut, p[2] + (b[2] - p[2]) * cut]);
    }
    return chamfered;
  });
  const n = rings[0].length;
  const top = rings[rings.length - 1], bot = rings[0];
  let ty = 0, by = 0;
  for (let i = 0; i < n; i++) { ty += top[i][1]; by += bot[i][1]; }
  const crown = [0, ty / n + hgt * crownLift, 0];     /* a small flat table, not a point (LAW 6) */
  const foot = [0, by / n - hgt * 0.05, 0];
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; quad(A[i], A[j], B[j], B[i]); }
  }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri(top[i], top[j], crown); tri(bot[j], bot[i], foot); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

/* THE SOCKET a standing shard rises out of. Four cut faces opening a square-diamond in the paving —
   the same figure the crossing studs above are inlaid into — so a shard reads as SET INTO this floor
   rather than stood on it, and the meeting of glass and metal is a turned edge instead of a line.
   LAW 1 decides its material and it is not a free choice: the crown band's normal points UP, and a
   metalness-1.0 band facing a near-black zenith renders black. That would put a black ring around
   every shard on the plaza — the same mistake this file already made once on a bench top. The whole
   collar is therefore the LOW-METALNESS platinum grade, which takes the hemisphere and reads.
   Sized on the shard's own footprint (rx, rz) rather than scaled from a shared unit collar, because a
   non-uniform scale after the fact leaves every normal in the mesh wrong by exactly the amount the law
   above cares about. Rings outer → crown → inner → throat; 24 triangles. */
function shardSocket(rx, rz) {
  const P = [];
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; P.push([Math.cos(a), -Math.sin(a)]); }
  const ring = (s, y) => P.map(p => [p[0] * rx * s, y, p[1] * rz * s]);
  const pos = [];
  const tri = (a, b, c) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  /* the skirt starts BELOW the deck so the collar emerges from the paving instead of sitting on it */
  const bands = [ring(1.0, FLOOR_TOP - 0.055), ring(0.94, FLOOR_TOP + 0.045), ring(0.62, FLOOR_TOP + 0.028), ring(0.5, FLOOR_TOP - 0.14)];
  for (let k = 0; k < 3; k++) {
    const A = bands[k], B = bands[k + 1];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(A[i], A[j], B[j], B[i]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

/* A ribbon of glow laid along a LINE of light — the ring, the routing channels. Three ribs: dark at
   the edges, bright down the middle, so an inlaid seam reads as light lying ON the floor instead of
   a drawn line. Vertex colour carries only the falloff (greyscale); the material carries the hue,
   which is what lets one mesh follow the world Theme and the clock for free. DoubleSide, additive
   and depth-write-off, so winding never matters. */
function glowRibbon(pathXZ, half, y, peak, closed, taper) {
  const n = pathXZ.length, pos = [], col = [];
  const push = (i, side, c) => {
    const p = pathXZ[i], a = pathXZ[(i - 1 + n) % n], b = pathXZ[(i + 1) % n];
    let dx, dz;
    if (!closed && i === 0) { dx = pathXZ[1][0] - p[0]; dz = pathXZ[1][1] - p[1]; }
    else if (!closed && i === n - 1) { dx = p[0] - pathXZ[n - 2][0]; dz = p[1] - pathXZ[n - 2][1]; }
    else { dx = b[0] - a[0]; dz = b[1] - a[1]; }
    const L = Math.hypot(dx, dz) || 1;
    pos.push(p[0] - dz / L * half * side, y, p[1] + dx / L * half * side);
    col.push(c, c, c);
  };
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const ki = peak * (taper ? taper(i / (n - 1)) : 1), kj = peak * (taper ? taper(j / (n - 1)) : 1);
    /* two bands per segment: outer rib → centre rib → outer rib */
    for (const [sa, sb, ca, cb] of [[-1, 0, 0, 1], [0, 1, 1, 0]]) {
      push(i, sa, ca * ki); push(j, sa, ca * kj); push(j, sb, cb * kj);
      push(i, sa, ca * ki); push(j, sb, cb * kj); push(i, sb, cb * ki);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  return g;
}

export function buildGround(ctx) {
  const { M, scene, reflect } = ctx;
  const g = new THREE.Group(); g.name = 'ground';

  /* 1. plaza: polished dark ground, semi-transparent over black so mirrored
     emissives read as wet reflections (see the assembly's reflection group) */
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(260, 260, 1, 1), M.plaza);
  plaza.rotation.x = -Math.PI / 2; plaza.renderOrder = 2; plaza.receiveShadow = true; g.add(plaza);
  /* the diamond roughness map is scaled so ONE painted diamond matches ONE modelled cell (9 m) */
  if (M.plaza.roughnessMap) { const r = 260 / (4 * DIAMOND_CELL); M.plaza.roughnessMap.repeat.set(r, r); }
  if (M.plaza.bumpMap) { const r = 260 / (4 * DIAMOND_CELL); M.plaza.bumpMap.repeat.set(r, r); }

  /* ---------------------------------------------------------------------------------------------
     THE LIGHT POOLS (v8, and the single biggest thing this file does for the direction).
     "Every ounce of light must have a specific purpose in terms of how artifacts around it respond."
     An emissive material is a bright rectangle that lights nothing: at metalness 0.98 the plaza floor
     does not even take diffuse light from a real lamp. So every emitter that stands on or over this
     ground lays a POOL — a soft elliptical gradient in the emitter's own hue, lying just above the
     surface it falls on, additive, and gone within a few metres. Bright at the source, nothing at the
     rim; never a uniform wash.

     Two instanced fields, one draw call each, because a pool's hue comes from one of two places:
       poolThemed  the world Theme (M.energySoft's colour), which a viewer can change at runtime;
       poolFixed   a fixed hue the caller supplies — the warm of an interior, a district's accent.
     Both are exposed as ctx.lightPool so the modules that OWN an emitter can answer it here, on the
     surface that actually shows it, without any of them needing to touch this file. */
  const poolTex = canvasTexture(128, 128, (c, w, h) => {
    /* the falloff of a real pool of light, not of fog: nearly all of it inside the middle third */
    const rg = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0.00, 'rgba(255,255,255,1)');
    rg.addColorStop(0.16, 'rgba(255,255,255,0.60)');
    rg.addColorStop(0.36, 'rgba(255,255,255,0.23)');
    rg.addColorStop(0.62, 'rgba(255,255,255,0.06)');
    rg.addColorStop(1.00, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.fillRect(0, 0, w, h);
  });
  const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-Math.PI / 2);
  const poolThemedMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.20, blending: THREE.AdditiveBlending, depthWrite: false });
  const poolFixedMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const POOL_CAP = 32;
  const poolThemed = new THREE.InstancedMesh(poolGeo, poolThemedMat, POOL_CAP);
  const poolFixed = new THREE.InstancedMesh(poolGeo, poolFixedMat, POOL_CAP);
  poolThemed.name = 'floor-light-pools-themed'; poolFixed.name = 'floor-light-pools';
  poolThemed.renderOrder = poolFixed.renderOrder = 5;    /* above the cells (3) and the ring (4), or the field blends them away */
  poolThemed.frustumCulled = poolFixed.frustumCulled = false;
  let nThemed = 0, nFixed = 0;
  function writePool(mesh, i, p) {
    _e.set(0, p.rot || 0, 0); _q.setFromEuler(_e);
    _v.set(p.x, p.y, p.z); _s.set(p.rx, 1, p.rz); _m4.compose(_v, _q, _s);
    mesh.setMatrixAt(i, _m4);
    _col.set(p.hue == null ? 0xffffff : p.hue).multiplyScalar(p.k);
    mesh.setColorAt(i, _col);
  }
  /* lay a pool of light on the ground. hue null = the world Theme; otherwise the emitter's own hue.
     rx / rz are the ellipse's full width and depth, rot aligns it with whatever throws the light. */
  ctx.lightPool = function lightPool(p) {
    const themed = p.hue == null, mesh = themed ? poolThemed : poolFixed;
    const i = themed ? nThemed : nFixed;
    if (i >= POOL_CAP) return null;                       /* a silently dropped pool beats a resized buffer mid-scene */
    /* POOL_Y clears the whole deck. A cell's per-cell tilt lifts its far corner as much as 4 cm above
       FLOOR_TOP, and a pool that sat at the nominal deck height was bitten into by exactly those
       corners — the field is transparent but it still writes depth. Seven centimetres over a soft
       gradient is invisible from any camera in this world and it clears every one of them. */
    writePool(mesh, i, { x: p.x, y: p.y == null ? POOL_Y : p.y, z: p.z, rx: p.rx, rz: p.rz == null ? p.rx : p.rz, rot: p.rot || 0, hue: p.hue == null ? null : p.hue, k: p.k == null ? 0.5 : p.k });
    if (themed) nThemed++; else nFixed++;
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  };

  /* ---------------------------------------------------------------------------------------------
     THE HERO BLACK-PLATINUM DIAMOND FLOOR (brief §05, re-graded v8)
     Nine-metre diamond cells, each a shallow cut stone (crystalCell above) set in mirror-grade joint
     catches with a faceted stud inlaid at every crossing. THREE GRADES survive the re-grade, because
     one uniform polish across 5,800 m2 reads as plastic:
       hero      the most polished thing in MAHWORLD, r0.045 — inside 28 m, where the eye lands
       contrast  a second batch of the same black stone, marginally coarser and a half-step lighter,
                 scattered one cell in seven so the field never reads as printed
       satin     honed rather than mirrored, r0.13 — outside 28 m, so the floor still reads at the
                 edge of frame without competing with the middle
     All three are near-black metals: what separates them is how sharply they return the world, which
     is the only property a black mirror has. Cells stay semi-transparent over the mirrored emissive
     copies the assembly builds under the deck.
     Cost: seven merged meshes — 69 cells, 120 joints, 52 studs — and no per-frame work.               */
  /* ---- v10 §07 THE FLOOR WAS NOT BLACK: IT IS A MOON PATH --------------------------------------
     A pale sheet ran across the middle distance of every view — brighter than the architecture,
     brighter than the mountains, and in the 180 degree proof it was the brightest thing in a frame
     whose subject is a mountain horizon. §07 asks for ultra-pristine black.

     The obvious suspects were both WRONG, and both were tested rather than argued: with the deck at
     78 m measuring lum 128 against mountains at 6-29, setting envMapIntensity to ZERO at runtime
     changed the pixel by nothing at all, and removing the planar-mirror shader patch made the floor
     BRIGHTER (161), not darker. So it was never the environment map and never the reflection pass.

     Raising roughness (0.045 -> 0.135 here) moved the pixel by NOTHING either, so it is not a tight
     specular lobe on these materials. Metalness 0.98 -> 0 moved it by two counts. The measured
     conclusion is blunt: at this grazing angle the deck's value is not governed by any parameter on
     these materials, so nothing set here can correct it. Every value in this block is therefore
     restored to exactly what the v8/v9 passes chose, because three separate attempts to fix the
     problem from this file were all fixing the wrong term.

     The lever that DID respond is in mahplaza.js, in the shader patch that module already owns on
     the plaza floor: a fresnel-keyed darkening applied after the reflection mix took 78 m from 128
     to 69 and 47 m from 85 to 49 while leaving the deck at your feet untouched. The correction lives
     there, next to the measurement that found it. */
  const heroMat = new THREE.MeshStandardMaterial({ color: 0x080b11, roughness: 0.045, metalness: 0.98, envMapIntensity: 2.9, transparent: true, opacity: 0.86, flatShading: true });
  const satinMat = new THREE.MeshStandardMaterial({ color: 0x0a0e16, roughness: 0.30, metalness: 0.96, envMapIntensity: 2.2, transparent: true, opacity: 0.92, flatShading: true });
  const contrastMat = new THREE.MeshStandardMaterial({ color: 0x0d1220, roughness: 0.20, metalness: 0.97, envMapIntensity: 2.5, transparent: true, opacity: 0.88, flatShading: true });
  ctx.floorMaterials = [heroMat, satinMat, contrastMat];
  {
    const hero = [], satin = [], contrast = [], joints = [], outerJoints = [], studs = [], outerStuds = [];
    const inset = 0.42;                                   /* the joint width between two cells */
    const cellGeo = crystalCell(DIAMOND_CELL - inset, CELL_CORNER);
    /* the socket left by four cut corners: a square-diamond reaching (inset + corner) along each axis.
       Its base sits exactly on the joint catches, so the mirror inlay and the mirror hairline are one
       continuous piece of metal rather than two things intersecting. */
    const studGeo = crystalStud(inset + CELL_CORNER, 0.06, JOINT_TOP);
    const half = Math.ceil(FIELD_RADIUS / DIAMOND_CELL) + 1;
    /* a joint belongs to TWO cells and a stud to FOUR, so each is laid only where all of its cells
       exist. Testing each part against the field radius on its own would finish the field's west and
       north edges with a kerb and leave the east and south bare, because a lattice step toward the
       origin is inside the radius and a step away from it is not. */
    const inField = (a, b) => Math.hypot(a * DIAMOND_CELL, b * DIAMOND_CELL) <= FIELD_RADIUS;
    /* the lattice is built axis-aligned then rotated 45°, which is what makes every cell a DIAMOND */
    for (let i = -half; i <= half; i++) for (let j = -half; j <= half; j++) {
      const x = i * DIAMOND_CELL, z = j * DIAMOND_CELL, r = Math.hypot(x, z);
      const here = inField(i, j);
      if (here) {
        const geo = cellGeo.clone();
        /* a shallow per-cell tilt (up to 0.55°, and the asymmetric modulus that produces it is deliberate
           and unchanged): each cell takes its own value under one light, which is what separates a laid
           floor from a printed pattern. On a mirror it matters more, not less — 0.55° of tilt swings the
           reflected ray a whole degree, and at the 2-6° depression the plaza cameras look down at, that
           is the difference between two cells returning two different slices of the horizon.
           Deterministic, never animated. */
        const t = ((i * 7 + j * 13) % 5 - 2) * 0.0016;
        geo.applyMatrix4(_m4.makeRotationX(t)); geo.applyMatrix4(_m4.makeRotationZ(t * 0.7));
        geo.translate(x, 0, z);
        const contrasty = ((i * 5 + j * 3) % 7 === 0);
        (r < HERO_RADIUS ? (contrasty ? contrast : hero) : satin).push(geo);
      }
      /* joint catches: every joint is filled so the floor never shows a black gap. Inside the hero field
         they are mirror-grade and draw the eye to the centre; outside they drop to satin, which is what
         keeps the outer floor reading as laid construction without competing with the middle. */
      for (const [dx, dz, w, d, di, dj] of [[DIAMOND_CELL / 2, 0, inset * 0.66, DIAMOND_CELL + inset, 1, 0], [0, DIAMOND_CELL / 2, DIAMOND_CELL + inset, inset * 0.66, 0, 1]]) {
        if (!here || !inField(i + di, j + dj)) continue;
        const jr = Math.hypot(x + dx, z + dz);
        /* the catch fills the joint and stops a hair below the cell rim, so it reads as a bright
           hairline turning between two slabs — never as a black gap or a glowing grid line */
        const jg = chamferBox(w, 0.135, d, 0.035); jg.translate(x + dx, JOINT_TOP - 0.0675, z + dz);
        (jr < HERO_RADIUS ? joints : outerJoints).push(jg);
      }
      /* the stud inlaid in the crossing socket — only where four cut corners actually meet to make one */
      if (here && inField(i + 1, j) && inField(i, j + 1) && inField(i + 1, j + 1)) {
        const sx = x + DIAMOND_CELL / 2, sz = z + DIAMOND_CELL / 2;
        const sg = studGeo.clone(); sg.translate(sx, 0, sz);
        (Math.hypot(sx, sz) < HERO_RADIUS ? studs : outerStuds).push(sg);
      }
    }
    cellGeo.dispose(); studGeo.dispose();
    const field = new THREE.Group(); field.rotation.y = Math.PI / 4; field.name = 'plaza-diamond-floor'; g.add(field);
    const add = (list, mat, name, order) => { if (!list.length) return; const mesh = new THREE.Mesh(mergeGeos(list), mat); mesh.name = name; mesh.receiveShadow = true; if (order) mesh.renderOrder = order; field.add(mesh); };
    add(satin, satinMat, 'floor-satin-field', 3);
    add(hero, heroMat, 'floor-hero-field', 3);
    add(contrast, contrastMat, 'floor-contrast-cells', 3);
    add(outerJoints, M.trimSatin, 'floor-joint-catches-outer', 3);
    add(joints, M.trim, 'floor-joint-catches', 3);
    /* the studs are OPAQUE mirror, so they draw before the transparent field and the field's own alpha
       never washes them out — they are the hardest catch on the floor and they have to stay hard */
    add(outerStuds, M.trimSatin, 'floor-crossing-studs-outer');
    add(studs, M.trim, 'floor-crossing-studs');
  }

  /* MAHGIC routing channels: four thin inlaid lines running from the disc edge out toward the district,
     the city's energy grid passing under the plaza — restrained, never a glowing cage. All four merge
     into ONE mesh (and therefore ONE mirrored copy) rather than four. */
  const channelRibbons = [];
  {
    const chGeo = new THREE.BoxGeometry(0.14, 0.02, 46), parts = [];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, R = PLAZA_RADIUS + 25;
      place(parts, chGeo, Math.cos(a) * R, FLOOR_TOP + 0.03, Math.sin(a) * R, -a + Math.PI / 2);
      /* LAW: the channel is answered where it lies. A ribbon of its own colour spreads either side of
         it along the stretch that crosses the laid floor, so the seam lights the stone it is set in. */
      const line = [];
      for (let k = 0; k <= 6; k++) { const rr = 27 + k * (52 - 27) / 6; line.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      channelRibbons.push(glowRibbon(line, 0.85, POOL_Y, 0.5, false, t => Math.pow(Math.sin(Math.PI * t), 0.6)));
    }
    chGeo.dispose();
    const channels = new THREE.Mesh(mergeGeos(parts), M.energySoft);
    channels.name = 'routing-channels'; channels.renderOrder = 5; g.add(channels); reflect(channels, 0.35);
  }
  const under = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x02040a, fog: false }));
  under.rotation.x = -Math.PI / 2; under.position.y = -80; g.add(under);

  /* the circulation ring: one restrained inset ring at the plaza edge */
  const ring = new THREE.Mesh(new THREE.RingGeometry(PLAZA_RADIUS - 0.09, PLAZA_RADIUS + 0.09, 128), M.energySoft);
  ring.rotation.x = -Math.PI / 2; ring.position.y = FLOOR_TOP + 0.02; ring.renderOrder = 4; g.add(ring);
  reflect(ring, 0.35);
  /* THE SEAM GLOW: the ring's and the channels' answer, in one vertex-coloured additive mesh. Its
     colour and strength are copied from M.energySoft every time hook, so a Theme change or a sunrise
     carries the glow with the seam that casts it and neither can drift from the other. */
  const seamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  {
    const ringPath = [];
    for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2; ringPath.push([Math.cos(a) * PLAZA_RADIUS, Math.sin(a) * PLAZA_RADIUS]); }
    const parts = [glowRibbon(ringPath, 1.7, POOL_Y, 1, true, null)].concat(channelRibbons);
    const seams = new THREE.Mesh(mergeSeams(parts), seamMat);
    seams.name = 'floor-seam-glow'; seams.renderOrder = 5; g.add(seams);
  }

  /* THE MAHPLAZA CIVIC MARKER: the canonical MAHFITT mark + the MAHPLAZA wordmark, inlaid.
     This used to be two concentric diamond outlines and a small core — a reasonable guess at the
     identity, and a guess is exactly what §19 forbids while the real asset sits in this repository.
     images/mahfitt-mark-gold.png resolves, measured, into a solid diamond flanked by two double
     chevrons pointing inward; materials.js:fobMark() rebuilds those measured proportions as geometry.
     The whole lockup is laid flat and sized so the mark spans the same 11 m as the wordmark plane.

     The mark sits 2.2 m RIGHT of the axis on purpose. In the canonical lockup it is not centred over
     the wordmark either: its centre falls at 0.198 of the wordmark's width to the right of centre,
     over the end of MAHFITT. Centring it here would have been tidier and would have been the
     approximation the brief rules out. */
  const markMat = M.energyLight;
  const MARK_DIAMOND = 3.6;                    /* 3.08 diamond-widths of mark = 11.1 m, the wordmark's width */
  const mark = new THREE.Mesh(fobMark(MARK_DIAMOND, 0.05), markMat);
  mark.rotation.x = -Math.PI / 2;              /* built facing +Z for a sign face; laid flat for a floor */
  mark.position.set(11 * 0.198, FLOOR_TOP + 0.03, 12); g.add(mark);
  reflect(mark, 0.4);
  /* the mark is a light source of its own now that the floor is black: it lays a low pool the width
     of the lockup, which is also what keeps the wordmark legible on near-black stone */
  ctx.lightPool({ x: 1.1, z: 14.0, rx: 21, rz: 15, k: 0.24 });
  const wordTex = canvasTexture(2048, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(225,238,255,0.92)'; c.font = '700 300px "Space Grotesk", "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; let total = 0; const gap = 44; for (const ch of 'MAHPLAZA') total += c.measureText(ch).width + gap; let x = w / 2 - (total - gap) / 2; c.textAlign = 'left'; for (const ch of 'MAHPLAZA') { c.fillText(ch, x, h / 2); x += c.measureText(ch).width + gap; } });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75), new THREE.MeshBasicMaterial({ map: wordTex, transparent: true, depthWrite: false }));
  word.rotation.x = -Math.PI / 2; word.position.set(0, FLOOR_TOP + 0.03, 17.5);
  /* THE ONE CHANGE THE WORDMARK NEEDED. It is transparent and depth-write-off, so at the default
     render order the diamond field (renderOrder 3) drew straight over it and knocked it back to the
     field's own 14 % of alpha. On the old mid-dark floor that still read; on black platinum it was
     gone. Sitting it above the field restores the artwork exactly as authored — nothing about the
     lockup itself, its face, tracking or colour is touched. */
  word.renderOrder = 6; g.add(word);

  /* ---------------------------------------------------------------------------------------------
     THE MAHPLAZA MONUMENT (v6b) — the reference's plaza has a HERO OBJECT at its centre, a large
     crystalline square-diamond standing at the foot of the approach, and its absence is why the middle
     of this plaza has been reading as floor rather than as a place. It is the world's own reserved
     mark built at architectural scale: a faceted plinth, a mirror-grade collar, and the diamond itself
     held above it with an energy core inside, reflected in the chromium floor beneath.
     No invented emblem — this is the square-diamond the whole world already uses. */
  let monumentLight = null, plazaGem = null, plazaGemAuraMat = null;
  {
    /* forward of the MAH MATCH approach, not across its portal: a plaza centrepiece the eye lands on
       first, with the entrance and its two actions still clear behind it */
    const mx = 0, mz = 7;
    const monument = new THREE.Group(); monument.name = 'plaza-monument';
    monument.position.set(mx, FLOOR_TOP, mz); g.add(monument);
    /* the plinth: three receding faceted courses, dark, so the crystal above reads against them */
    const courses = [[7.2, 0.5, 0x0], [5.6, 0.62, 0], [4.2, 0.5, 0]];
    let py = 0;
    /* v11 §06 audited these and LEFT THEM. A 0.5 m course already carries a 14 cm chamfer — 56% of
       its half-height — so widening it further would eat the course and turn a cut block into a
       frustum. The monument's crystal is the brand's square diamond and keeps its points by law. */
    courses.forEach(([cw, ch], i) => {
      const c = new THREE.Mesh(chamferBox(cw, ch, cw, 0.14), i === 1 ? M.graphiteDark : M.structural);
      c.rotation.y = Math.PI / 4; c.position.y = py + ch / 2; c.castShadow = true; c.receiveShadow = true; monument.add(c);
      const rim = new THREE.Mesh(chamferBox(cw + 0.18, 0.09, cw + 0.18, 0.03), M.platinumLit || M.trim);
      rim.rotation.y = Math.PI / 4; rim.position.y = py + ch; monument.add(rim);
      py += ch;
    });
    /* a lit reveal under the top course, so the plinth sits on light rather than on the floor */
    const reveal = new THREE.Mesh(new THREE.CircleGeometry(3.4, 4), M.energySoft);
    reveal.rotation.x = -Math.PI / 2; reveal.rotation.z = Math.PI / 4; reveal.position.y = 0.04; reveal.renderOrder = 6; monument.add(reveal);
    /* the mirror collar the diamond stands in */
    const collar = new THREE.Mesh(chamferBox(2.6, 0.34, 2.6, 0.1), M.chromeMirror || M.trim);
    collar.rotation.y = Math.PI / 4; collar.position.y = py + 0.17; monument.add(collar);
    /* LAW: a metal takes no diffuse light, so the collar's UP-FACING face — a horizontal mirror under a
       near-black zenith — renders black. The collar stays mirror because its four vertical sides are
       what read; the cap that closes it is the low-metalness partner, which is the grade that can. */
    const collarCap = new THREE.Mesh(chamferBox(2.72, 0.05, 2.72, 0.02), M.platinumMidLit || M.platinumLit);
    collarCap.rotation.y = Math.PI / 4; collarCap.position.y = py + 0.345; monument.add(collarCap);
    /* THE DIAMOND — the square-diamond at architectural scale, and THE ONE THE NOTE IS ABOUT.
       DIRECTION, R2: "the actual diamond in the middle is super stale looking. It has no depth to
       it. It needs to have more depth and a glistening and platinumness and glow."

       IT TOOK A RAYCAST TO ESTABLISH WHICH DIAMOND THAT WAS. There are two brand stones on this
       plaza and the obvious suspect was the wrong one: monument.js's gem is held at y 38.9, which
       from the arrival mark is 29.6 degrees above the camera axis — past the top edge of a 29-degree
       half-frame. The stone filling the middle of the arrival frame is THIS one, standing at
       (0, 7.2, 7) between the two statues. Reasoning about it would have re-cut the wrong gem
       beautifully; a ray fired down the arrival axis at the pixel the pale shape occupies came back
       with an unnamed hit at 39 m, and 39 m along that axis is exactly here.

       WHAT WAS WRONG, AS NUMBERS. An OctahedronGeometry has EIGHT faces, so any viewpoint sees
       three of them: three facets cannot glisten, however good the material on them is. And the
       emissive core stood at 2.9 x 1.55 inside a 3.35 x 1.55 shell — 87% — which left 25 cm of
       glass between them, so there was no INTERIOR to look into either. What rendered was a white
       lozenge with a dark chevron across it. Stale, and no depth, precisely as described.

       THE CUT NOW COMES FROM THE KIT (materials.js cutGem — read its note for what the ten rings and
       the alternating flute are doing). monument.js's own comment already claimed these two stones
       were "the same gem at two scales"; that is now true in the only sense that matters, which is
       that one function cuts both. Three nested layers, and each has a job:
         · SHELL, the cut itself, in glass.
         · HEART at 0.62, in chromeMirror, YAWED HALF A FACET so its facets never line up with the
           ones in front of them. This is the layer that gives the stone a value RANGE instead of one
           white note — what you see inside a real diamond is the environment folded twice, and a
           mirror behind glass is the honest cheap version of that.
         · FIRE at 0.30, emissive, small on purpose: a core that fills the stone is a lamp, and a
           lamp has no depth. This is the layer that replaces the old 87% core.
       PLATINUMNESS is the girdle — one proud sixteen-sided band on the widest line, from the kit's
       own solver, in the palette's platinum. It replaces four radial equator bars that were pointing
       the wrong way (see gemGirdle's note) and were four objects doing worse what one line does.
       GLOW is the aura at 1.5, additive, in the stone's own shape rather than a sphere, driven by
       this file's clock hook with the rest of the plaza's light. */
    const dy = py + 5.4;
    const GW = 3.35, GH = 3.35 * 1.55, GD = 3.35 * 0.46;      /* the shell's own half-extents, unchanged */
    const gemGeo = cutGem(GW, GH, GD);
    const gemLayer = (name, s, mat, yaw, order) => {
      const m = new THREE.Mesh(gemGeo, mat);
      m.name = 'plaza-diamond-' + name;
      if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else m.scale.setScalar(s);
      m.rotation.y = yaw; m.position.y = dy;
      if (order) m.renderOrder = order;
      monument.add(m);
      return m;
    };
    plazaGemAuraMat = new THREE.MeshBasicMaterial({
      color: M.theme.energyLight, transparent: true, opacity: PLAZA_GEM_AURA,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false
    });
    /* THE HALO IS A RIM, AND IT IS BackSide FOR THAT REASON. An additive DoubleSide shell renders
       its far wall AND its near wall, so what you get is a translucent SLAB whose brightest part is
       the middle — the longest path through it — and at any close camera it washes the whole frame
       with a pale diamond. BackSide renders only the far wall, which the opaque heart hides across
       the body of the stone and which survives around the silhouette: the glow ends up where a glow
       belongs, hugging the edge, and costs half as many fragments doing it. */
    plazaGemAuraMat.name = 'plaza-diamond-aura'; plazaGemAuraMat.userData.moduleOwned = true;
    const fire = gemLayer('fire', GEM.LAYERS.fire, M.energyLight, 0);
    plazaGem = {
      fire,
      heart: gemLayer('heart', GEM.LAYERS.heart, M.chromeMirror || M.trim, GEM.YAW),
      shell: gemLayer('shell', GEM.LAYERS.shell, M.crystalGlass || M.glass, 0, 6),
      aura: gemLayer('aura', GEM.AURA, plazaGemAuraMat, GEM.YAW, 5)
    };
    plazaGem.aura.frustumCulled = false;
    /* the girdle: one merged mesh, because sixteen bars are one object */
    {
      const bars = [];
      for (const b of gemGirdle(GW, GH, GD)) {
        const g2 = chamferBox(b.w, b.h, b.len, b.chamfer);
        g2.rotateY(b.yaw); g2.translate(b.x, dy, b.z);
        bars.push(g2.index ? g2.toNonIndexed() : g2);
      }
      /* platinumLit, NOT platinum: LAW 1 again. A girdle is a band with up-facing and
         down-facing surfaces on it, and at metalness 0.98 those take no diffuse light and render
         near-black under a dark zenith — the very defect this project has shipped four times. The
         low-metalness partner is the grade that CAN be lit, and the monument's own point light is
         30 cm away. This is the platinum the direction asked to see. */
      const band = new THREE.Mesh(mergeGeos(bars), M.platinumLit || M.platinum || M.trim);
      band.name = 'plaza-diamond-girdle'; monument.add(band);
    }
    reflect(fire, 0.5); reflect(collar, 0.3);
    /* a mast carrying the diamond clear of its plinth, so it reads as HELD rather than resting */
    const mast = new THREE.Mesh(chamferBox(0.34, 2.6, 0.34, 0.06), M.chromeSatin || M.trimSatin);
    mast.rotation.y = Math.PI / 4; mast.position.y = py + 1.5; monument.add(mast);
    const col = new THREE.Mesh(new THREE.BoxGeometry(7.6, 12, 7.6), M.curb);
    col.position.set(mx, FLOOR_TOP + 6, mz); col.visible = false; g.add(col);
    (ctx.colliders = ctx.colliders || []).push(col);
    ctx.monument = monument;
    /* THE ONE LIGHT THIS FILE ADDS, and the report says so. The monument is the brightest object
       standing on the plaza and until now it lit nothing: its core is emissive, and emissive is a
       bright shape, not a source. This point light is what makes the world answer it —
        · a real specular streak on black platinum directly beneath it (a metal takes no diffuse light
          but it does take a specular highlight, and on a roughness-0.045 mirror that highlight is the
          hard bright catch the reference frames show under every bright object);
        · the plinth's low-metalness rims, collar cap and graphite course modelled from above rather
          than flat-lit by the environment alone;
        · residents crossing the plaza centre picking it up as they pass, which is the whole reason
          the centrepiece reads as standing IN the square rather than pasted on it.
       Themed and clock-driven through the time hook below, so it can never disagree with the core. */
    monumentLight = new THREE.PointLight(M.theme.energy, 30, 34, 2);
    monumentLight.position.set(mx, FLOOR_TOP + dy - 1.2, mz); g.add(monumentLight);
    /* and the pool: the floor's own answer, wide and soft under the plinth */
    ctx.lightPool({ x: mx, z: mz, rx: 30, rz: 30, k: 0.5 });
  }

  /* ---------------------------------------------------------------------------------------------
     GLASS SHARDS SET INTO THE FLOOR (v9, art-directed) — "some of the floor as well".

     WHY THE FLOOR IS THE RIGHT PLACE FOR THEM, AND THE WHOLE ARGUMENT FOR THE COMPOSITION BELOW.
     This floor is a near mirror at roughness 0.055 AND the assembly renders a true planar reflection
     of the entire scene through the deck plane. So a shard that stands proud of it is TWO objects for
     the price of one: the crystal, and its complete inverted twin running away from its own contact
     line. That pairing is the effect, not the shard, which is why every standing piece below is
     placed where a hero camera sees the pair and not merely the piece — the arrival threshold at
     z ≈ 26 (14 m from the in-world camera) and the monument's south-west forecourt.

     THREE GRADES, AND THE SPLIT IS A COST DECISION (materials.js, shards). A transmissive material
     makes three render an extra scene pass and the mirror already costs a second, so:
       shardFacet  the MANY — 48 pieces inlaid flush in the paving and 14 standing ones. No
                   transmission: a faceted crystal that fakes it with roughness 0.11, a clearcoat and
                   envMapIntensity 2.6. At the size these read at, a refracted displacement would
                   never have been legible; the environment catch on a broken facet is the whole read.
       shardHero   the FEW — THREE, argued for one at a time below, because true refraction with
                   dispersion is only worth its pass where the camera comes close and where there is
                   something bright BEHIND the glass for it to bend.
     Cost: four merged meshes — inlays, standing pieces, sockets, heroes — and no per-frame work.

     THIS PACKAGE EMITS NOTHING. Not one emissive, not one THREE.Light: shards are the opposite of an
     emitter, they are the thing that answers one. The only light it touches is three small caustics
     laid where an existing source is bent by an existing hero shard, and each names its source.  */
  {
    const rnd = shardRandom(20936);

    /* THE THREE HERO SHARDS.  [x, z, height, radius, yaw, leanX, leanZ]
       On "refraction needs something behind it": a transmissive body over black platinum with nothing
       behind it refracts blackness and reads as a grey lump, so each of these three was placed against
       a NAMED bright thing and checked from the cameras that actually exist in VIEWS.

       The one placement that was tested and REJECTED is worth recording, because it is the obvious
       one: standing a hero shard in front of the monument's lit core. From every camera in the plaza's
       +z half the corridor that would achieve it is the line from the camera to (0, 7) — which is the
       MAH MATCH approach, the mark, the wordmark and the resident group, all of them reserved. So the
       three below take the other two answers instead, and take them literally.

       H1  the FORECOURT shard, 5 m off the monument's south-west corner. It stands inside the
           monument's own 30 m themed pool and 9.5 m from the monument point light (intensity 30,
           range 34), so the floor it refracts is the brightest gradient on the plaza and the light
           entering it is a real source rather than an emissive rectangle.
       H2  and
       H3  the THRESHOLD PAIR, straddling the circulation ring at radius 27 either side of the axis.
           They stand ACROSS a lit inlay: the ring itself (M.energySoft) and its glow ribbon pass
           under each of them and out both sides, which is exactly the bright line a refracting body
           needs to break. H2 is 14.7 m from the in-world camera — the closest the world gets to a
           hero shard, and the only distance at which dispersion is actually resolvable. The 15.2 m
           gap between them frames the approach without standing in it.

       ALL THREE CLEAR MAH MATCH, MEASURED rather than eyeballed. Against the entrance opening's own
       bearing cone (18 m wide, and ±3.5° from the arrival camera at 148 m) the tightest of the three
       is H1, clear by 1.41° of bearing from `establishing` and by 7.9° from `in-world`; from
       `match-approach` all three are behind the camera. On plan the approach band is 5.2 m wide and
       the narrowest gap any of them leaves beside it is H2's 3.85 m of open paving. */
    const HERO = [
      [-8.2, 1.0, 4.2, 1.35, 0.62, 0.00, 0.10],
      [7.6, 25.9, 3.8, 1.15, -0.42, 0.07, -0.08],
      [-7.6, 25.9, 3.4, 1.05, 0.48, 0.06, 0.09]
    ];
    /* THE STANDING FACETED SHARDS. Three families at the feet of the three heroes — a big crystal with
       two or three smaller ones around it reads as ONE outcrop breaking through the paving, where the
       same pieces spread evenly read as three lonely objects — and five more out on the flanks where
       the lateral cameras cross the floor. Every one of them is under 2.2 m: they are what a resident
       walks between, not what a resident walks around. */
    const STANDING = [
      [-10.4, 2.6, 1.50, 0.62, 0.9, 0.06, -0.05], [-6.4, -1.6, 0.95, 0.48, -0.5, -0.05, 0.07], [-9.9, -1.2, 1.90, 0.70, 2.1, 0.04, 0.08],
      [9.9, 27.6, 1.60, 0.60, 0.4, -0.06, 0.05], [5.9, 28.9, 0.85, 0.44, 1.7, 0.05, -0.04], [9.2, 23.6, 1.25, 0.52, -1.1, 0.03, 0.06],
      [-9.9, 27.6, 1.35, 0.58, -0.7, 0.05, -0.06], [-5.9, 28.9, 1.05, 0.46, 2.4, -0.04, 0.05], [-9.2, 23.6, 1.80, 0.66, 1.2, 0.06, 0.03],
      [-15.8, 30.6, 2.10, 0.78, 0.3, 0.04, -0.07], [16.4, 31.2, 1.70, 0.68, -1.4, -0.05, 0.05],
      [-23.4, 12.6, 1.30, 0.55, 2.0, 0.06, 0.04], [22.8, 11.4, 1.45, 0.60, -0.9, -0.03, -0.06],
      [-2.8, 33.8, 1.10, 0.50, 1.5, 0.05, 0.05]
    ];

    const inlays = [], standing = [], sockets = [], heroes = [];
    /* one shard, placed: yaw first, then a few degrees off plumb, because a crystal that grew out of a
       floor is never plumb and a plumb one reads as a post that was planted */
    const setShard = (list, geo, x, y, z, ry, tx, tz) => {
      _e.set(tx, ry, tz); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(1, 1, 1); _m4.compose(_v, _q, _s);
      geo.applyMatrix4(_m4); list.push(geo);
    };
    const collideGeo = new THREE.BoxGeometry(1, 1, 1);       /* ONE unit box, scaled per shard: colliders are invisible, so this costs nothing but the mesh */
    const addCollider = (x, z, rad, h) => {
      const c = new THREE.Mesh(collideGeo, M.curb);
      c.position.set(x, FLOOR_TOP + h / 2, z); c.scale.set(rad * 2.0, h, rad * 2.0); c.visible = false;
      g.add(c); (ctx.colliders = ctx.colliders || []).push(c);
    };
    /* the collar follows the shard's own squashed footprint and turns with it, with a floor of 0.28 m
       on the narrow axis so a thin sliver still gets a collar wide enough to read as a turned edge */
    const socketAt = (x, z, rad, wide, ry) => setShard(sockets, shardSocket(rad * 1.3, rad * wide * 1.3 + 0.28), x, 0, z, ry, 0, 0);

    /* THE SILHOUETTE OF A STANDING CRYSTAL (v11 §06). Every profile below is sampled from the SAME
       curve terrain.js's massif() uses and for the same stated reason —
           r(u) = (1 − u^a)^b,  with b = ½ and a = 1.9
       — because b near ½ makes the radius fall fastest just under the summit, which is what turns the
       silhouette's tangent HORIZONTAL there, and a above 1 holds the flanks out so the mass stays
       massive instead of caving in. A cone's tangent is the same all the way to its point; that is
       what the standing pieces were, and it is what the eye read as "pointy blue cones".
       The curve is then TRUNCATED short of zero: the last ring is the table, not a tip. */
    for (const [x, z, h, rad, ry, tx, tz] of HERO) {
      /* eight sides and four rings: the heroes are the only pieces the camera comes close enough to
         read facet by facet, and a richer section is where the dispersion fringes live.
         0.70 at u = 0.58 was under the curve (0.80) and pinched the waist; the shoulder is fuller now. */
      setShard(heroes, shardGeo(8, [[1.0, 0.0], [0.96, 0.22], [0.78, 0.58], [0.30, 1.0]], rad, h, 0.62, 0.22, rnd, 0, 0.02), x, FLOOR_TOP - 0.12, z, ry, tx, tz);
      socketAt(x, z, rad, 0.62, ry);
      addCollider(x, z, rad, h);
    }
    for (const [x, z, h, rad, ry, tx, tz] of STANDING) {
      /* a fourth ring is what buys the shoulder: three rings could only draw a straight taper from
         0.88 to 0.46 and then cap it, and a straight taper IS the cone. r = 1.00 / 0.93 / 0.70 / 0.36
         at u = 0 / 0.36 / 0.70 / 1.00 is the massif curve above, and its per-ring slope steepens
         −0.19, −0.68, −1.13, so the mass is full through the middle and turns over at the crown. */
      setShard(standing, shardGeo(6, [[1.0, 0.0], [0.93, 0.36], [0.70, 0.70], [0.36, 1.0]], rad, h, 0.55, 0.25, rnd, 0, 0.02), x, FLOOR_TOP - 0.10, z, ry, tx, tz);
      socketAt(x, z, rad, 0.55, ry);
      if (h >= 1.5) addCollider(x, z, rad, h);              /* anything at head height; the low pieces are stepped over, not walked around */
    }

    /* WHERE AN INLAY MAY NOT GO. Only the things a 20 cm inlay would actually spoil are listed: the
       two brand inlays, the monument, the civic ring, the walking routes (plaza-dressing.js lays its
       path slabs 5 cm above this deck and they would slice an inlay in half), the lit circulation ring
       and its glow ribbon, the four routing channels and the planting.
       Street furniture is deliberately absent. A mast base or a bench plinth standing over a flush
       inlay hides it completely and nothing clips, so listing plaza-dressing.js's furniture here would
       only be a second copy of its table waiting to drift out of date — and a table that lies is worse
       than no table. The three route ends come from the shared SITE PLAN for the same reason. */
    /* R2 added the directory spur to plaza-dressing's network, and it runs across the laid field like
       the other five, so it gets the same keep-out. Its endpoint is the pylon's READABLE FACE — the
       post stands at (20, 14) yawed −0.5 and the path stops 3.4 m out along its normal — restated
       from the same three numbers plaza-dressing uses rather than from a fourth hand-typed pair.
       The two routes R2 runs OFF the deck are not listed, and do not need to be: they start at the
       corridor mouths at r 57 and this test rejects everything past r 37.5 already. */
    const ROUTES = [[SITES.match.approach, 3.6], [SITES.gym.approach, 3.2], [SITES.market.approach, 3.2],
      [[-40, 40], 2.8], [[40, 40], 2.8],
      [[20 + Math.sin(-0.5) * 3.4, 14 + Math.cos(-0.5) * 3.4], 2.2]];
    const placed = HERO.concat(STANDING);
    function freeFloor(x, z) {
      const r = Math.hypot(x, z);
      if (r < 7.5 || r > 37.5) return false;                                              /* inside the laid field, outside the monument's forecourt */
      if (Math.hypot(x, z - 7) < 8.6) return false;                                       /* the monument and its collider */
      if (Math.abs(x - 2.18) < 7.0 && Math.abs(z - 12) < 3.4) return false;                /* the inlaid MAHFITT mark */
      if (Math.abs(x) < 7.0 && Math.abs(z - 17.5) < 2.7) return false;                     /* the MAHPLAZA wordmark */
      if (Math.abs(Math.hypot(x, z - 14) - 9.2) < 1.4) return false;                       /* the civic ring band */
      if (Math.abs(r - PLAZA_RADIUS) < 2.6) return false;                                  /* the lit ring and its glow ribbon */
      for (const [to, half] of ROUTES) {
        const dx = to[0], dz = to[1] - 14, L = Math.hypot(dx, dz);
        const t = Math.max(0, Math.min(L, (x * dx + (z - 14) * dz) / L));
        if (Math.hypot(x - dx / L * t, z - 14 - dz / L * t) < half) return false;
      }
      if (r > 26) for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        if (Math.abs(x * Math.sin(a) - z * Math.cos(a)) < 1.3 && x * Math.cos(a) + z * Math.sin(a) > 0) return false;  /* a routing channel and its ribbon */
      }
      for (const s of PLANTER_SPOTS) if (Math.hypot(x - s.x, z - s.z) < 3.0) return false;
      for (const p of placed) if (Math.hypot(x - p[0], z - p[1]) < 2.8) return false;       /* never inside a standing shard's socket */
      return true;
    }
    /* THE SCATTER. 48 flush pieces is one per ~110 m2 of laid floor — sparse enough that the black
       platinum is still the subject and the crystal is an incident in it, which is the whole of LAW 5
       applied to paving.
       THE RADIUS IS SAMPLED UNIFORMLY, NOT BY AREA, and that is the whole of the composition. The
       obvious sqrt(r) draw spreads points evenly per square metre, and since the annulus at 34 m holds
       four times the area of the one at 12 m it put four times the crystal out at the rim, where no
       camera in VIEWS is looking. Uniform in r gives an areal density falling as 1/r; the linear
       falloff on top of it and the weighting toward the +z arrival half do the rest. This is a scatter
       for the cameras, not for the plan. */
    let want = 48;
    for (let i = 0; i < 2400 && want > 0; i++) {
      const a = rnd() * Math.PI * 2, r = 7.5 + rnd() * 30;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!freeFloor(x, z)) continue;
      if (rnd() > (1 - r / 52) * (z > 6 ? 1.0 : 0.42)) continue;
      const rad = 0.55 + rnd() * rnd() * 1.7;                 /* squared so most are small and a few are big slabs */
      /* MEASURED across the 48 pieces this produces: the ridge stands 8.5-19.3 cm above the deck.
         Clear of the cells' own per-cell tilt, low enough to walk over, and deep enough that a raking
         light finds a lit face and a dark one on the same piece.
         v11 §06, and this is the one place on the plaza floor that was genuinely a field of points.
         An inlay is FOUR-SIDED and squashed on one axis, so its two corners on the long axis were
         acute rhombus points lying flush in the paving — the form §06 names, forty-eight times over,
         and at a walking camera's grazing angle a 33° point tapers into a hairline that catches no
         light at all. Two changes, both of them cuts rather than smoothing:
           the squash floor rises 0.30 → 0.46, so the sharpest corner any inlay can have opens from
             33° to 50° before anything else is done to it, and it costs nothing;
           cut = 0.26 chamfers all four plan corners, which replaces each point with a small third
             face. The piece goes from four plan facets to eight — more crystalline, not less, and it
             is why this is the only shard family that pays for the chamfer. */
      setShard(inlays, shardGeo(4, [[1.0, 0.0], [0.72, 0.62], [0.30, 1.0]], rad, 0.17 + rnd() * 0.10, 0.46 + rnd() * 0.34, 0.26, rnd, 0.26, 0.02),
        x, FLOOR_TOP - 0.10, z, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.05);
      placed.push([x, z]);                                    /* so the rest of the scatter keeps clear of it too */
      want--;
    }

    /* THE CAUSTICS — and this is the only light this package touches. A hero shard is a lens sitting on
       a mirror: light that enters it leaves displaced, and on a black floor the place it lands is the
       one thing that stops a transmissive body reading as a grey lump. Each of these three answers a
       source that already exists and names it; none of them invents an emitter.
         H1  the monument point light, 9.5 m away — the smear falls on the far side of the shard from it
         H2  and H3  the plaza-centre point light at (0, 5.6, 13) and the ring glow they stand across
       Themed (hue null), so the world Theme and the day/night hook carry them with everything else. */
    for (const [hx, hz, sx, sz, rx, rz, k] of [[-8.2, 1.0, 0, 7, 6.0, 2.6, 0.20], [7.6, 25.9, 0, 13, 5.4, 2.4, 0.18], [-7.6, 25.9, 0, 13, 5.4, 2.4, 0.18]]) {
      const dx = hx - sx, dz = hz - sz, L = Math.hypot(dx, dz) || 1;
      ctx.lightPool({ x: hx + dx / L * 2.3, z: hz + dz / L * 2.3, rx, rz, rot: Math.atan2(-dz / L, dx / L), k });
    }

    /* FOUR MESHES. renderOrder 4 puts every shard above the transparent diamond field (3) and below
       the pools (5), which is the ordering the wordmark had to learn the hard way: a transparent field
       drawn after a crystal knocks it back to its own alpha.
       SHADOWS: the standing pieces and the heroes cast, the inlays do not — a 15 cm chip has no shadow
       worth a shadow-map draw, and the direction's point is a raking light finding a STANDING crystal.
       Everything they cast onto already receives: the plaza plane, all three diamond-field meshes and
       the aprons are receiveShadow, and so are the shards themselves, so a tall shard darkens the
       small ones at its foot instead of floating over them. */
    const shardMesh = (list, mat, name, cast) => {
      const mesh = new THREE.Mesh(mergeGeos(list), mat);
      mesh.name = name; mesh.renderOrder = 4; mesh.receiveShadow = true; mesh.castShadow = !!cast;
      g.add(mesh); return mesh;
    };
    /* named apart from the floor's own `heroMat` above, which is black platinum and a different thing */
    /* R1 c2: the FLOOR takes black crystal, not the skyline's pale facet grade. These 62 pieces wore
       shardFacet (luminance 195, a pale blue) — v11 fixed the "pointy blue cones" as GEOMETRY and
       left the colour, and once the world stopped being blue they became the loudest thing in the
       plaza. shardObsidian reads by catch instead of by tint, which is what black crystal does. */
    const facetMat = M.shardObsidian || M.shardFacet || M.crystalGlass, shardHeroMat = M.shardHero || facetMat;
    shardMesh(inlays, facetMat, 'floor-shards-inlaid', false);
    shardMesh(standing, facetMat, 'floor-shards-standing', true);
    shardMesh(heroes, shardHeroMat, 'floor-shards-hero', true);
    /* the sockets are OPAQUE, so they draw in the opaque pass before the field and the crystal alike —
       the turned collar has to stay a hard bright edge, which is the only thing it is for */
    const socketMesh = new THREE.Mesh(mergeGeos(sockets), M.platinumMidLit || M.platinumLit);
    socketMesh.name = 'floor-shard-sockets'; socketMesh.receiveShadow = true; g.add(socketMesh);
  }

  /* 2. aprons: raised slabs in front of the three destinations.
     All three merge per material — one slab mesh, one nosing mesh, one lip mesh — so the district's
     three doorsteps cost three draw calls instead of nine, and the lit lip needs only ONE mirrored
     copy under the deck. */
  const apronSlab = [], apronLip = [], apronEdge = [];
  const slabGeo = {}, lipGeo = {}, edgeGeo = {};
  function apron(x, z, w, d, rotY) {
    const key = w + 'x' + d;
    /* geometry is shared per size, which in practice means per site: three distinct sizes, no more */
    if (!slabGeo[key]) { slabGeo[key] = new THREE.BoxGeometry(w, 0.42, d); lipGeo[key] = new THREE.BoxGeometry(w, 0.02, 0.06); edgeGeo[key] = chamferBox(w + 0.12, 0.1, 0.16, 0.03); }
    const fx = Math.sin(rotY), fz = Math.cos(rotY);       /* the apron's own forward, out toward the plaza */
    place(apronSlab, slabGeo[key], x, 0.21, z, rotY);
    place(apronLip, lipGeo[key], x + fx * (d / 2 - 0.03), 0.43, z + fz * (d / 2 - 0.03), rotY);
    place(apronEdge, edgeGeo[key], x + fx * (d / 2 - 0.02), 0.37, z + fz * (d / 2 - 0.02), rotY);
  }
  /* one apron per site, placed from the SITE PLAN so the ground follows the buildings (v5 §06) */
  /* THE DISTRICT HUE PLAN. The direction is one or two PUNGENT hues per building, used large — a
     signage band, a portal reveal, a full-height glazing wash — and districts differing from each
     other. The floor is where those bands land, so the plan is declared here, BEFORE buildings.js
     builds, and published on ctx: whoever dresses a facade can read ctx.districtAccent and the wash on
     the ground will always be the colour of the light that made it. */
  ctx.districtAccent = { gym: 'accentCyan', market: 'accentMagenta', match: 'accentBlue' };
  Object.keys(SITES).forEach(k => {
    const S = SITES[k], out = 11, fx = Math.sin(S.rotY), fz = Math.cos(S.rotY);
    apron(S.x + fx * out, S.z + fz * out, S.W + 8, 16, S.rotY);
    /* THE DOORWAY, ANSWERED IN THREE LAYERS — this is the gradient of light every destination throws
       down onto the black floor, and it is why an entrance reads as a way in rather than a lit hole:
         warm, on the step        the interior light spilling out of the opening (M.interiorSoft's own
                                  hue: warm is INTERIOR light here and nowhere else);
         theme, off the nosing    the apron's lit lip, pooled where it overhangs the plaza;
         accent, out on the floor the district's signage band overhead, wide and weak — the one place
                                  a pungent hue touches the ground, and it is a big single gesture. */
    ctx.lightPool({ x: S.x + fx * out, y: 0.45, z: S.z + fz * out, rx: S.W + 4, rz: 13, rot: S.rotY, hue: M.interiorSoft.color, k: 0.34 });
    /* R1 c2 — TWO OF THE THREE POOLS PER SITE WERE LAID UNDER THE FLOOR THEY FALL ON.
       y 0.05 and y 0.04 against FLOOR_TOP 0.17: six of the nine district pools were depth-clipped
       by the deck, which is the exact failure the note at POOL_Y in this file already warns about
       ("a pool that sat at the floor's own height was buried by it"). Dropping the y lets both fall
       through to POOL_Y. The theme pool at y 0.45 is correct as written — it lands on the apron
       slab, whose top is 0.42 — and is left alone. The accent pool moves out 3 m so its near edge
       clears the apron step rather than fighting it. */
    ctx.lightPool({ x: S.x + fx * (out + 9), z: S.z + fz * (out + 9), rx: S.W + 6, rz: 12, rot: S.rotY, k: 0.26 });
    const accent = M[ctx.districtAccent[k]];
    if (accent) ctx.lightPool({ x: S.x + fx * (out + 17), z: S.z + fz * (out + 17), rx: S.W + 20, rz: 30, rot: S.rotY, hue: accent.emissive, k: 0.2 });
  });
  {
    const slab = new THREE.Mesh(mergeGeos(apronSlab), M.paving || M.platinumLitBrushed || M.graphiteLight);   /* v11: the apron is FLOOR, not architecture — it joins the black paving family */
    slab.name = 'aprons'; slab.receiveShadow = true; g.add(slab);
    const edge = new THREE.Mesh(mergeGeos(apronEdge), M.trim);          /* a mirror-grade nosing on the apron step */
    edge.name = 'apron-nosings'; g.add(edge);
    const lip = new THREE.Mesh(mergeGeos(apronLip), M.energySoft);
    lip.name = 'apron-lips'; lip.renderOrder = 5; g.add(lip); reflect(lip, 0.3);
    Object.keys(slabGeo).forEach(k => { slabGeo[k].dispose(); lipGeo[k].dispose(); edgeGeo[k].dispose(); });
  }

  /* 3. vehicle corridors: two lanes at the district edges, curving away behind the buildings.
     The lane markers and the route symbols of BOTH corridors merge into one mesh each: thirty small
     emissive strips were thirty draw calls and thirty mirrored copies, and they are the same object
     repeated. */
  const laneMarks = [], routeSymbols = [];
  const markGeo = new THREE.BoxGeometry(0.08, 0.02, 1.6), symGeo = new THREE.BoxGeometry(1.6, 0.02, 0.08);
  function corridor(sign) {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; const z = 70 - t * 190; const x = sign * (44 + Math.pow(Math.max(0, (t - 0.55)) / 0.45, 1.6) * 40); pts.push(new THREE.Vector3(x, 0, z)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const road = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 3.6, 4, false), M.road);
    road.scale.y = 0.012; road.position.y = 0.006; g.add(road);              /* a flattened tube: a smooth ribbon of roadway */
    const walk = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 6.2, 4, false), M.graphiteLight);
    walk.scale.y = 0.02; walk.position.y = 0.0; walk.renderOrder = 1; g.add(walk);   /* the sidewalk band either side */
    /* lane markers: short inset strips along the centre, sparse */
    for (let i = 2; i < 46; i += 3) { const pt = curve.getPointAt(i / 48), tan = curve.getTangentAt(i / 48); place(laneMarks, markGeo, pt.x, 0.03, pt.z, Math.atan2(tan.x, tan.z)); }
    /* one square-diamond route symbol per corridor: four bars turned 45°, the same figure the whole
       world uses, composed here rather than through diamondOutline so both symbols merge into one mesh */
    const sp = curve.getPointAt(0.18), c45 = Math.SQRT1_2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, px = Math.cos(a) * 0.8, pz = Math.sin(a) * 0.8;
      place(routeSymbols, symGeo, sp.x + (px + pz) * c45, 0.03, sp.z + (pz - px) * c45, -a + Math.PI / 2 + Math.PI / 4);
    }
    /* the symbol is the only bright thing on a dark lane; it pools where it lies */
    ctx.lightPool({ x: sp.x, y: 0.06, z: sp.z, rx: 9, rz: 9, k: 0.3 });
    return curve;
  }
  ctx.roads = [corridor(-1), corridor(1)];
  markGeo.dispose(); symGeo.dispose();
  {
    const marks = new THREE.Mesh(mergeGeos(laneMarks), M.energySoft);
    marks.name = 'lane-markers'; marks.renderOrder = 5; g.add(marks); reflect(marks, 0.3);
    const syms = new THREE.Mesh(mergeGeos(routeSymbols), M.energy);
    syms.name = 'route-symbols'; g.add(syms); reflect(syms, 0.35);
  }

  /* seating: two low graphite blocks with one thin light seam each. The seams are built in world
     space and merged, so the pair costs one mesh and one mirrored copy. */
  {
    const seams = [], seamGeo = new THREE.BoxGeometry(5.3, 0.02, 0.04);
    [[-19, 21, 0.5], [19, 21, -0.5]].forEach(([x, z, ry]) => {
      const b = new THREE.Mesh(chamferBox(5.5, 0.55, 1.4, 0.09), M.graphiteDark); b.position.set(x, FLOOR_TOP + 0.275, z); b.rotation.y = ry; g.add(b);
      /* LAW: this cap is HORIZONTAL and a metal takes no diffuse light — at chromeSatin's metalness 1.0
         a 6.4 m2 seat top facing the near-black zenith rendered black from every standing camera in the
         world. platinumMidLit is the same platinum read at low metalness, which is the grade that can
         take the hemisphere and actually be a bench you can see. */
      const cap = new THREE.Mesh(chamferBox(5.3, 0.06, 1.2, 0.04), M.platinumMidLit || M.platinumLit); cap.position.set(0, 0.29, 0); b.add(cap);
      /* the seam sat 0.7 m forward of the block's centre as a child; built in world space it needs the
         block's own forward, which is what turns the pair into one merged mesh and one mirrored copy */
      const fx = Math.sin(ry), fz = Math.cos(ry);
      const sx = x + fx * 0.7, sz = z + fz * 0.7;
      place(seams, seamGeo, sx, FLOOR_TOP + 0.555, sz, ry);
      /* the seam's pool, tight: a 2 cm strip of light throws about a metre and then it is gone */
      ctx.lightPool({ x: sx + fx * 0.9, z: sz + fz * 0.9, rx: 9, rz: 5, rot: ry, k: 0.22 });
    });
    seamGeo.dispose();
    const seam = new THREE.Mesh(mergeGeos(seams), M.energySoft);
    seam.name = 'seat-seams'; seam.renderOrder = 6; g.add(seam); reflect(seam, 0.35);
  }

  /* ONE time hook for everything this file lights. The pools, the seam glow and the monument light all
     read their colour and strength from M.energySoft — the material the world Theme actually owns — so
     a retheme or a sunrise moves the seam and the light it throws together, and neither can drift.
     No allocation: copy() and arithmetic only. */
  ctx.timeHooks.push(s => {
    const night = 1 - (s && typeof s.daylight === 'number' ? s.daylight : 0);
    const k = 0.28 + 0.72 * night;
    poolThemedMat.color.copy(M.energySoft.color); poolThemedMat.opacity = 0.20 * k;   /* v11: was 0.5 — see the pitch-black note below */
    poolFixedMat.opacity = 0.22 * k;
    seamMat.color.copy(M.energySoft.color); seamMat.opacity = 0.5 * k;
    if (monumentLight) { monumentLight.color.copy(M.energySoft.color); monumentLight.intensity = 30 * (0.3 + 0.7 * night); }
    /* the plaza gem's halo follows the same clock as its light: a glow that holds full strength at
       noon reads as a decal stuck on the sky rather than as a stone with fire in it */
    if (plazaGemAuraMat) { plazaGemAuraMat.color.copy(M.energyLight.emissive || M.energySoft.color); plazaGemAuraMat.opacity = PLAZA_GEM_AURA * (0.18 + 0.82 * night); }
    /* the wordmark holds at night and steps back under daylight, exactly as before */
    word.material.opacity = 0.55 + 0.45 * night;
  });
  /* park the slots nobody claimed at zero scale. three allocates an InstancedMesh's matrix buffer
     zero-filled, so they are already degenerate — this makes that an intention rather than a lucky
     default, and it is what keeps ctx.lightPool safe to leave half-used. */
  _m4.makeScale(0, 0, 0);
  for (let i = nThemed; i < POOL_CAP; i++) poolThemed.setMatrixAt(i, _m4);
  for (let i = nFixed; i < POOL_CAP; i++) poolFixed.setMatrixAt(i, _m4);
  poolThemed.instanceMatrix.needsUpdate = poolFixed.instanceMatrix.needsUpdate = true;
  if (poolThemed.instanceColor) poolThemed.instanceColor.needsUpdate = true;
  if (poolFixed.instanceColor) poolFixed.instanceColor.needsUpdate = true;
  g.add(poolThemed); g.add(poolFixed);

  ctx.planterSpots = PLANTER_SPOTS;

  scene.add(g);
  return g;
}

/* THE PLAZA IS NOT PLANTED. (R2, direction: "There should be no trees in that area. Really, the tree
   should be in the outskirts right before the mountains.")

   This table held twenty-four spots — eighteen trees and six planters — every one of them inside 42 m
   of the world origin, i.e. inside the one part of the world every arrival camera looks at. Standing
   at the arrival mark they filled the middle band of the frame with pale crowns in front of the
   monument, the directory and all three destinations, and the note that came back was "way too much
   noise in the middle of the main city — I cannot even focus on what anything is". They were not bad
   trees. They were in the way of everything the plaza exists to show.

   THE TREES DID NOT LEAVE THE WORLD, THEY MOVED TO THE EDGE OF IT. terrain.js §3 now plants a
   continuous MAH TREELINE in the outskirts, solved per bearing against the near mountain range's own
   footprints so it stands exactly where the direction puts it. Nature at the horizon FRAMES the city;
   nature in the plaza stands in front of it.

   THE ARRAY STAYS, EMPTY, AND IS STILL EXPORTED ON ctx. Three consumers read it — the shard field
   below (it will not stand a shard where planting stands), flora-and-vehicles' parked-craft clearance
   test, and mahplaza's flora loop — and all three are correct against an empty table: no spot, no
   exclusion, nothing built. Deleting it would mean editing three call sites to remove a dependency
   that will come back the moment anything is planted deliberately again. */
const PLANTER_SPOTS = [];

/* the seam ribbons carry a COLOUR attribute, which mergeGeos does not know about — it merges the two
   attributes a solid surface needs. This is the same concatenation for position + color. */
function mergeSeams(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); col.set(g.attributes.color.array, o * 3); o += c; g.dispose(); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
