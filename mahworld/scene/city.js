/* MAHPLAZA :: CITY — the MAHWORLD district behind and beside the plaza (v4)

   Three depth layers so every exterior view has midground, background and
   distant background instead of stopping behind the three destinations:

   1. MIDGROUND (90–220 m): dark steel residential / facility blocks with corner
      pilasters, spandrel bands and recessed window grids (windowGrid), setbacks,
      roof plant, masts and parapet rails; three short bridges between blocks and
      ONE long walkway crossing behind MAH MATCH (deck y 34, z −122, x −75..75)
      with a thin rail light line, under-deck lights and a slow rail pod.
   2. BACKGROUND (220–520 m): crystalline towers — four faceted archetypes
      (tapered obelisk, hexagonal crystal, stepped twin prism, blade) as four
      InstancedMeshes, each with one or two thin energy strips.
   3. DISTANT (520–850 m): flat dark silhouettes under the fog — tall slabs, a
      colossal tapered form, a suspended ring on pylons, a high platform.

   Laws honoured: materials from ctx.M only (+ MeshBasic for windows / lights /
   far silhouettes), no yellow / amber / orange, no additive glow, nothing
   flashes, deterministic (seeded), no per-frame allocation, everything merged
   or instanced (≈ 45 draw calls in the establishing view). Windows dim to 20 %
   by day; energy strips and rail lights follow the world Theme and dim ×0.3 by
   day. Never inside |x| < 46 && z > −92, never at z > 70 within |x| < 60.

   Life anchors pushed: ctx.lifeAnchors.paths (walkway + 3 bridges, kind
   'bridge') and ctx.lifeAnchors.pads (5 rooftop pads, tier 'far'). */
import * as THREE from '../vendor/three/three.module.min.js';
import { chamferBox, windowGrid } from './materials.js';

const SEED = 4417;
const PW = 1.4;                       /* pilaster width */
const FLOOR = 3.4;                    /* residential floor pitch */
const WIN = { cellW: 1.5, cellH: 1.35, gapX: 0.95, gapY: FLOOR - 1.35, tint: 0xdde8ff, dimTint: 0x24324a };
const WHITE = 0xdde8ff;

/* ---- midground blocks: hand-composed so they overlap the gaps between the three destinations
   from the arrival cameras (see the establishing view) — x, z, footprint w × d, total height h,
   setback fraction sb, which side face also gets windows, rooftop pad kind --------------------- */
const BLOCKS = [
  { id: 'L1', x: -84,  z: -62,  w: 22, d: 18, h: 34, sb: 0.25, side: 1 },
  { id: 'L2', x: -118, z: -118, w: 30, d: 24, h: 62, sb: 0.30, side: 1 },
  { id: 'L3', x: -62,  z: -150, w: 26, d: 22, h: 56, sb: 0.28, side: 0, pad: 'training', elevator: true },
  { id: 'L4', x: -84,  z: -124, w: 18, d: 16, h: 46, sb: 0,    side: 1, pad: 'levitate', rot: 0 },
  { id: 'C1', x: 0,    z: -168, w: 34, d: 26, h: 66, sb: 0.30, side: 0 },
  { id: 'C2', x: -38,  z: -196, w: 24, d: 22, h: 70, sb: 0.25, side: 0 },
  { id: 'C3', x: 44,   z: -190, w: 28, d: 22, h: 64, sb: 0.30, side: 0 },
  { id: 'R1', x: 92,   z: -56,  w: 20, d: 18, h: 30, sb: 0,    side: -1 },
  { id: 'R2', x: 116,  z: -112, w: 28, d: 24, h: 50, sb: 0.30, side: -1, pad: 'training' },
  { id: 'R3', x: 56,   z: -152, w: 24, d: 20, h: 52, sb: 0.28, side: 0, pad: 'levitate' },
  { id: 'R4', x: 84,   z: -126, w: 18, d: 16, h: 42, sb: 0,    side: -1, pad: 'training', rot: 0 },
  { id: 'F1', x: -108, z: -22,  w: 22, d: 18, h: 26, sb: 0,    side: 1 },
  { id: 'F2', x: 114,  z: -10,  w: 20, d: 16, h: 22, sb: 0,    side: -1 },
  { id: 'L5', x: -150, z: -72,  w: 24, d: 20, h: 40, sb: 0.25, side: 1 },
  { id: 'R5', x: 150,  z: -80,  w: 22, d: 20, h: 36, sb: 0.25, side: -1 }
];
/* bridges between blocks (world endpoints sit just inside the block faces) and the main walkway */
const WALKWAY = { id: 'city-walkway', ax: -75.5, az: -122, bx: 75.5, bz: -122, y: 34, width: 4.2, pylons: [-52, 52] };
const BRIDGES = [
  { id: 'city-bridge-l2-l4', ax: -93.5, az: -124,   bx: -105.5, bz: -124,   y: 36, width: 3.2 },
  { id: 'city-bridge-r3-r4', ax: 64.7,  az: -141.6, bx: 76,     bz: -131,   y: 30, width: 3.2 },
  { id: 'city-bridge-r4-r2', ax: 92.5,  az: -124,   bx: 107.5,  bz: -124,   y: 30, width: 3.2 }
];
/* background towers: bearing a° (x = r cos a, z = −r sin a), radius r, height, width, archetype, strips */
const TOWERS = [
  [104, 300, 128, 22, 'A', 2], [109, 330, 96, 18, 'B', 1], [113, 285, 74, 16, 'C', 1], [100, 340, 150, 24, 'A', 2],
  [66, 290, 108, 20, 'D', 1], [71, 330, 86, 17, 'B', 1], [75, 300, 62, 15, 'C', 1], [62, 355, 136, 22, 'A', 2],
  [81, 450, 160, 26, 'A', 2], [103, 470, 158, 24, 'B', 1], [89, 520, 120, 28, 'D', 1],
  [138, 260, 58, 15, 'C', 1], [128, 330, 124, 20, 'A', 1], [145, 400, 90, 19, 'B', 1], [120, 400, 136, 21, 'A', 2],
  [52, 260, 66, 16, 'C', 1], [44, 330, 112, 21, 'A', 2], [56, 420, 130, 22, 'D', 1], [36, 450, 96, 20, 'B', 1], [48, 500, 148, 26, 'A', 2],
  [18, 300, 70, 18, 'C', 1], [8, 380, 90, 20, 'B', 1], [160, 320, 80, 18, 'A', 1], [172, 400, 100, 22, 'D', 1], [150, 480, 118, 22, 'A', 1], [25, 480, 124, 24, 'A', 2],
  [58, 285, 74, 16, 'B', 1]
];
/* distant slabs: bearing, radius, width, height, depth, rotation */
const SLABS = [
  [30, 700, 60, 210, 30, 0.3], [40, 820, 70, 260, 34, -0.2], [62, 760, 46, 180, 26, 0.6], [78, 830, 54, 230, 28, 0.1],
  [95, 640, 40, 150, 24, -0.4], [112, 720, 64, 240, 30, 0.2], [140, 600, 50, 200, 26, 0.0], [15, 620, 56, 220, 28, 0.4]
];

/* ---- small deterministic helpers ------------------------------------------------------------ */
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function smooth(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function polar(a, r) { const t = a * Math.PI / 180; return [r * Math.cos(t), -r * Math.sin(t)]; }
/* concatenate geometries (non-indexed) into one static BufferGeometry; disposes the inputs */
function mergeGeos(list) {
  const parts = []; let count = 0;
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); parts.push(n); count += n.attributes.position.count; if (n !== g) g.dispose(); }
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let o = 0;
  for (const n of parts) { const c = n.attributes.position.count; pos.set(n.attributes.position.array, o * 3); nor.set(n.attributes.normal.array, o * 3); if (n.attributes.uv) uv.set(n.attributes.uv.array, o * 2); o += c; n.dispose(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
/* flat facets: non-indexed + per-face normals */
function faceted(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); if (n !== g) g.dispose(); return n; }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function matrixOf(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, parent = null) {
  _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s);
  if (parent) _m.premultiply(parent);
  return _m;
}
/* place a fresh geometry: local translate / yaw / scale, then an optional parent matrix */
function xform(geo, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, parent = null) { geo.applyMatrix4(matrixOf(x, y, z, ry, sx, sy, sz, parent)); return geo; }

export function buildCity(ctx) {
  const M = ctx.M || {};
  const theme = ctx.theme || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff, energyDeep: 0x2a63c9 };
  const mat = (k, fb) => M[k] || M[fb] || M.graphite || new THREE.MeshStandardMaterial({ color: 0x1b2433 });
  const structuralM = mat('structural', 'graphite'), compositeM = mat('composite', 'graphiteDark'), panelM = mat('panel', 'graphite'), trimM = mat('trimSatin', 'trim');
  const anchors = ctx.lifeAnchors || (ctx.lifeAnchors = { paths: [], pads: [], doors: [], windows: [] });
  anchors.paths = anchors.paths || []; anchors.pads = anchors.pads || [];

  const group = new THREE.Group(); group.name = 'city';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };

  /* own materials: windows (instance colour × material colour), theme energy lines, cool-white lights, far silhouettes */
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true, fog: true }); winMat.name = 'city-windows';
  const stripMat = new THREE.MeshBasicMaterial({ color: theme.energy, toneMapped: true, fog: true }); stripMat.name = 'city-energy';
  const whiteMat = new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: true, fog: true }); whiteMat.name = 'city-lights';
  const farMat = new THREE.MeshBasicMaterial({ color: 0x0a1322, fog: true }); farMat.name = 'city-distant';
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x0c121d, fog: true }); groundMat.name = 'city-ground';
  owned.materials.push(winMat, stripMat, whiteMat, farMat, groundMat);

  /* static geometry buckets, merged per material at the end */
  const B = { structural: [], composite: [], trim: [], strips: [], whites: [], far: [] };
  const kitBoxes = [], kitMasts = [];        /* instanced roof kit matrices */
  const stats = { blocks: 0, bridges: 0, towers: 0, giants: 0, windows: 0, windowGrids: 0, pads: 0, paths: 0, drawCalls: 0, triangles: 0 };
  let elevator = null, pod = null;

  /* ---------------------------------------------------------------- 1. midground blocks */
  const unitKit = own(chamferBox(1, 1, 1, 0.05));
  const kitBox = (parent, x, y, z, ry, sx, sy, sz) => kitBoxes.push(matrixOf(x, y + sy / 2, z, ry, sx, sy, sz, parent).clone());
  const kitMast = (parent, x, y, z, r, h) => kitMasts.push(matrixOf(x, y + h / 2, z, 0, r * 2, h, r * 2, parent).clone());
  const elevGeo = own(new THREE.BoxGeometry(1.0, 0.9, 0.35));

  function facadeWindows(parent, faceW, faceH, seed, place) {
    const cols = Math.floor((faceW - 2 * PW - 1.6 + WIN.gapX) / (WIN.cellW + WIN.gapX));
    const rows = Math.floor((faceH - 4.6 + WIN.gapY) / (WIN.cellH + WIN.gapY));
    if (cols < 2 || rows < 2) return 0;
    /* fewer lit cells and a wider brightness spread: a night city has dark apartments too (brief §08) */
    const grid = windowGrid({ cols, rows, cellW: WIN.cellW, cellH: WIN.cellH, gapX: WIN.gapX, gapY: WIN.gapY, depth: 0.1, onFraction: 0.4, seed, material: winMat, tint: WIN.tint, dimTint: WIN.dimTint });
    own(grid.geometry);
    place(grid, 3.0 + grid.userData.windows.totalH / 2);
    grid.name = 'city-windows'; parent.add(grid);
    stats.windows += cols * rows; stats.windowGrids++;
    return cols * rows;
  }

  BLOCKS.forEach((spec, i) => {
    const R = rng(SEED + i * 131);
    const { x, z, w, d, h } = spec;
    const rot = spec.rot != null ? spec.rot : 0.55 * Math.atan2(-x, -z) + (R() - 0.5) * 0.12;
    const coreH = spec.sb ? Math.round(h * (1 - spec.sb)) : h;
    const g = new THREE.Group(); g.name = 'city-block-' + spec.id; g.position.set(x, 0, z); g.rotation.y = rot; g.updateMatrix(); group.add(g);
    const bm = g.matrix;
    const P = (geo, lx, ly, lz, lry = 0, sx = 1, sy = 1, sz = 1) => xform(geo, lx, ly, lz, lry, sx, sy, sz, bm);
    /* core mass, corner pilasters, spandrel bands on the window faces, crown */
    B.structural.push(P(chamferBox(w, coreH, d, 0.45), 0, coreH / 2, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.composite.push(P(chamferBox(PW, coreH + 0.5, PW, 0.12), sx * (w / 2 - PW / 2 + 0.42), (coreH + 0.5) / 2, sz * (d / 2 - PW / 2 + 0.42)));
    for (let y = 3.0 + FLOOR * 4 - 1.0; y < coreH - 2.5; y += FLOOR * 4) {
      B.composite.push(P(chamferBox(w - 2 * PW - 0.4, 0.5, 0.5, 0.06), 0, y, d / 2 + 0.2));
      if (spec.side) B.composite.push(P(chamferBox(0.5, 0.5, d - 2 * PW - 0.4, 0.06), spec.side * (w / 2 + 0.2), y, 0));
    }
    B.composite.push(P(chamferBox(w + 0.7, 1.1, d + 0.7, 0.18), 0, coreH - 0.55, 0));
    /* setback volume with its own windows and crown */
    let topY = coreH, topW = w, topD = d, topX = 0, topZ = 0;
    if (spec.sb) {
      const sw = w * 0.6, sd = d * 0.58, sh = h - coreH, sz0 = -d * 0.14, sx0 = (R() - 0.5) * (w - sw) * 0.5;
      B.structural.push(P(chamferBox(sw, sh, sd, 0.4), sx0, coreH + sh / 2, sz0));
      B.composite.push(P(chamferBox(sw + 0.5, 0.9, sd + 0.5, 0.15), sx0, h - 0.45, sz0));
      for (const sx of [-1, 1]) B.composite.push(P(chamferBox(PW * 0.8, sh + 0.3, PW * 0.8, 0.1), sx0 + sx * (sw / 2 - PW * 0.4 + 0.3), coreH + (sh + 0.3) / 2, sz0 + sd / 2 - PW * 0.4 + 0.3));
      facadeWindows(g, sw, sh, 300 + i, (grid, cy) => grid.position.set(sx0, coreH + cy, sz0 + sd / 2 + 0.06));
      topY = h; topW = sw; topD = sd; topX = sx0; topZ = sz0;
    }
    /* parapet rails on the core roof (front and both sides) */
    kitBox(bm, 0, coreH, d / 2 - 0.12, 0, w - 0.6, 0.9, 0.12);
    kitBox(bm, -(w / 2 - 0.12), coreH, 0, 0, 0.12, 0.9, d - 0.6);
    kitBox(bm, (w / 2 - 0.12), coreH, 0, 0, 0.12, 0.9, d - 0.6);
    /* roof plant on the top roof (kept to the back half where a pad shares the roof), one mast on most */
    const n = 2 + Math.floor(R() * 2);
    for (let k = 0; k < n; k++) {
      const bw = 2 + R() * 2.5, bh = 1.2 + R() * 1.8, bd = 2 + R() * 1.5;
      const bx = topX + (R() - 0.5) * Math.max(0, topW - bw - 2.4);
      const bz = spec.pad && !spec.sb ? topZ - topD / 4 - R() * Math.max(0, topD / 4 - bd / 2 - 0.6) : topZ + (R() - 0.5) * Math.max(0, topD - bd - 2.4);
      kitBox(bm, bx, topY, bz, 0, bw, bh, bd);
    }
    if (R() < 0.7) {
      const mh = 5 + R() * 6, mx = topX + (R() < 0.5 ? -1 : 1) * (topW / 2 - 1.5), mz = topZ - topD / 2 + 1.5;
      kitMast(bm, mx, topY, mz, 0.22, mh);
      if (i % 3 === 0) B.whites.push(P(new THREE.BoxGeometry(0.5, 0.5, 0.5), mx, topY + mh + 0.25, mz));
    }
    /* windows: the front face always, the plaza-facing side face where the block is seen obliquely */
    facadeWindows(g, w, coreH, 100 + i, (grid, cy) => grid.position.set(0, cy, d / 2 + 0.06));
    if (spec.side) facadeWindows(g, d, coreH, 200 + i, (grid, cy) => { grid.position.set(spec.side * (w / 2 + 0.06), cy, 0); grid.rotation.y = spec.side * Math.PI / 2; });
    /* rooftop pad for the life module: a low platform with a square-diamond outline in energy */
    if (spec.pad) {
      const py = spec.sb ? coreH : h, pz = spec.sb ? d / 2 - 3.2 : 0;
      B.composite.push(P(chamferBox(5.5, 0.3, 5.5, 0.08), 0, py + 0.15, pz));
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, hs = 1.9; B.strips.push(P(new THREE.BoxGeometry(2.7, 0.06, 0.28), Math.cos(a) * hs, py + 0.33, pz + Math.sin(a) * hs, Math.atan2(-Math.cos(a), -Math.sin(a)))); }
      const position = new THREE.Vector3(0, py + 0.3, pz).applyMatrix4(bm);
      anchors.pads.push({ id: 'city-pad-' + spec.id, position, facing: Math.atan2(-position.x, -position.z), kind: spec.pad, tier: 'far' });
      stats.pads++;
    }
    /* the elevator: a slim track on the front face and one cool-white car that changes floor every few seconds */
    if (spec.elevator) {
      const ex = -w / 2 + PW + 1.6;
      B.composite.push(P(chamferBox(0.7, coreH - 3, 0.3, 0.05), ex, (coreH - 3) / 2 + 1.5, d / 2 + 0.22));
      const car = new THREE.Mesh(elevGeo, whiteMat); car.name = 'city-elevator'; car.position.set(ex, 3.2, d / 2 + 0.46); g.add(car);
      elevator = { mesh: car, floors: Math.max(2, Math.floor((coreH - 6.5) / FLOOR)), base: 3.2, floor: 0, dir: 1, from: 3.2, to: 3.2, t0: 0, t1: 0, next: -1, R: rng(SEED + 9001) };
    }
    stats.blocks++;
  });

  /* ---------------------------------------------------------------- bridges and the walkway */
  function span(spec, main) {
    const dx = spec.bx - spec.ax, dz = spec.bz - spec.az, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx), W = spec.width;
    const bm = new THREE.Matrix4().compose(new THREE.Vector3((spec.ax + spec.bx) / 2, spec.y, (spec.az + spec.bz) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    const P = (geo, lx, ly, lz, lry = 0) => xform(geo, lx, ly, lz, lry, 1, 1, 1, bm);
    B.structural.push(P(chamferBox(L, 0.5, W, 0.1), 0, 0.05, 0));                    /* deck: top at y + 0.3 */
    B.structural.push(P(chamferBox(L, 1.5, W * 0.6, 0.18), 0, -0.95, 0));            /* girder under the deck */
    for (const s of [-1, 1]) {
      B.trim.push(P(chamferBox(L, 1.05, 0.1, 0.03), 0, 0.82, s * (W / 2 - 0.08)));   /* handrails */
      B.strips.push(P(new THREE.BoxGeometry(L, 0.16, 0.12), 0, 1.4, s * (W / 2 - 0.08)));   /* the thin rail light line */
    }
    /* under-deck lights along the girder's front edge, none where a pylon stands */
    for (let u = -L / 2 + 3; u < L / 2 - 2; u += 6) { if (main && spec.pylons.some(px => Math.abs(px - u) < 1.6)) continue; B.strips.push(P(new THREE.BoxGeometry(0.5, 0.3, 0.5), u, -1.45, W * 0.3 + 0.3)); }
    if (main) {
      /* twin slim pylons either side of the girder with a cross-beam under it; the rail pod hangs below */
      for (const px of spec.pylons) {
        for (const s of [-1, 1]) B.structural.push(P(chamferBox(1.2, spec.y - 1.9, 1.0), px, -(spec.y - 1.9) / 2 - 1.9 + (spec.y - 1.9) / 2 + 0.05 - (spec.y - 1.9) / 2 + (spec.y - 1.9) / 2 - 0.05 + 0.05 - spec.y + (spec.y - 1.9) / 2 + 1.9 - 0.05, s * 2.1));
        B.structural.push(P(chamferBox(1.4, 0.6, 5.4, 0.1), px, -1.95, 0));
        B.whites.push(P(new THREE.BoxGeometry(0.4, 0.4, 0.4), px, -2.45, 2.9));
      }
      pod = { mesh: new THREE.Mesh(own(new THREE.BoxGeometry(3.0, 1.0, 0.9)), whiteMat), y: -3.0, travel: (L - 6) / 6, dwell: 3, half: L / 2 - 3, frame: bm };
      pod.mesh.name = 'city-rail-pod'; pod.mesh.matrixAutoUpdate = false; group.add(pod.mesh);
    }
    /* life path along the deck (world space) */
    const pts = [], nPts = Math.max(2, Math.round(L / 30) + 1);
    for (let k = 0; k < nPts; k++) { const u = -L / 2 + 0.5 + (L - 1) * (k / (nPts - 1)); pts.push(new THREE.Vector3(u, 0.3, 0).applyMatrix4(bm)); }
    anchors.paths.push({ id: spec.id, points: pts, kind: 'bridge' });
    stats.paths++; stats.bridges++;
  }
  span(WALKWAY, true);
  BRIDGES.forEach(b => span(b, false));

  /* ---------------------------------------------------------------- 2. background towers */
  const arch = {
    A: faceted(mergeGeos([new THREE.CylinderGeometry(0.60, 0.72, 1, 4, 1).translate(0, 0.5, 0), new THREE.CylinderGeometry(0.03, 0.60, 0.15, 4, 1).translate(0, 1.075, 0)])),
    B: faceted(mergeGeos([new THREE.CylinderGeometry(0.50, 0.56, 1, 6, 1).translate(0, 0.5, 0), new THREE.CylinderGeometry(0.10, 0.50, 0.12, 6, 1).translate(0, 1.06, 0)])),
    C: faceted(mergeGeos([new THREE.CylinderGeometry(0.70, 0.72, 0.62, 4, 1).translate(0, 0.31, 0), new THREE.CylinderGeometry(0.46, 0.50, 1, 4, 1).translate(0.12, 0.5, 0.1), new THREE.CylinderGeometry(0.04, 0.46, 0.12, 4, 1).translate(0.12, 1.06, 0.1)])),
    D: (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, 0.84); s.lineTo(0.12, 1); s.lineTo(-0.5, 0.9); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 1 }); g.translate(0, 0, -0.18); return faceted(g); })()
  };
  Object.values(arch).forEach(own);
  const towerMats = { A: structuralM, B: panelM, C: compositeM, D: structuralM };
  const byArch = { A: [], B: [], C: [], D: [] };
  const boxStrips = [], hexStrips = [];
  const Rt = rng(SEED + 77);
  TOWERS.forEach(([a, r, h, w, type, strips]) => {
    const [x, z] = polar(a, r), ry = Rt() * Math.PI * 2;
    byArch[type].push(matrixOf(x, 0, z, ry, w, h, w).clone());
    for (let k = 0; k < strips; k++) {
      const f = strips === 1 ? 0.55 + Rt() * 0.25 : 0.35 + k * 0.3 + Rt() * 0.12, y = f * h;
      if (type === 'A') { const rr = 0.72 + (0.60 - 0.72) * f, side = rr * Math.SQRT2 * w * 1.02; boxStrips.push(matrixOf(x, y, z, ry + Math.PI / 4, side, 1.1, side).clone()); }
      else if (type === 'C') { const rr = 0.50 + (0.46 - 0.50) * f, side = rr * Math.SQRT2 * w * 1.02, ox = 0.12 * w, oz = 0.1 * w; boxStrips.push(matrixOf(x + ox * Math.cos(ry) + oz * Math.sin(ry), y, z - ox * Math.sin(ry) + oz * Math.cos(ry), ry + Math.PI / 4, side, 1.1, side).clone()); }
      else if (type === 'D') boxStrips.push(matrixOf(x, y, z, ry, w * 1.02, 1.1, 0.36 * w * 1.04).clone());
      else { const rr = 0.56 + (0.50 - 0.56) * f; hexStrips.push(matrixOf(x, y, z, ry, rr * w * 1.03, 1.1, rr * w * 1.03).clone()); }
    }
    stats.towers++;
  });
  const instanced = (geo, material, mats, name) => { if (!mats.length) return null; const im = new THREE.InstancedMesh(geo, material, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.name = name; group.add(im); return im; };
  Object.keys(arch).forEach(k => instanced(arch[k], towerMats[k], byArch[k], 'city-towers-' + k));
  instanced(own(new THREE.BoxGeometry(1, 1, 1)), stripMat, boxStrips, 'city-tower-strips');
  instanced(own(faceted(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true))), stripMat, hexStrips, 'city-tower-strips-hex');

  /* ---------------------------------------------------------------- 3. distant silhouettes */
  const distant = new THREE.Group(); distant.name = 'city-distant'; group.add(distant);
  {
    const F = B.far;
    let [x, z] = polar(50, 720); F.push(xform(new THREE.CylinderGeometry(50, 90, 330, 4, 1), x, 165, z, 0.4));            /* the colossal tapered form */
    [x, z] = polar(70, 680);                                                                                                 /* the suspended ring on two pylons */
    F.push(xform(new THREE.TorusGeometry(115, 7, 6, 44).rotateX(1.25), x, 210, z, 0.1));
    F.push(xform(new THREE.BoxGeometry(10, 200, 10), x - 64, 100, z + 6)); F.push(xform(new THREE.BoxGeometry(10, 200, 10), x + 66, 100, z - 6));
    [x, z] = polar(128, 640); F.push(xform(new THREE.BoxGeometry(90, 320, 34), x, 160, z, 0.5));                           /* a tall slab above the ridge line */
    [x, z] = polar(100, 780);                                                                                                /* a high platform on slim pylons */
    F.push(xform(new THREE.BoxGeometry(210, 14, 70), x, 232, z, 0.15));
    [-80, 0, 80].forEach(o => F.push(xform(new THREE.BoxGeometry(8, 232, 8), x + o * Math.cos(0.15), 116, z - o * Math.sin(0.15))));
    SLABS.forEach(([a, r, w, h, d, ry]) => { const [sx, sz] = polar(a, r); F.push(xform(new THREE.BoxGeometry(w, h, d), sx, h / 2, sz, ry)); });
    stats.giants = 4 + SLABS.length;
    const far = new THREE.Mesh(own(mergeGeos(F)), farMat); far.name = 'city-distant-forms'; far.frustumCulled = false; distant.add(far);
  }
  /* the district ground: a dark annulus from the plaza slab's edge to the horizon so the far layers stand on something */
  const ground = new THREE.Mesh(own(new THREE.RingGeometry(126, 900, 72, 1)), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; ground.name = 'city-ground'; ground.frustumCulled = false; group.add(ground);

  /* ---------------------------------------------------------------- merges and instances */
  const merged = (list, material, name, shadow) => { if (!list.length) return null; const m = new THREE.Mesh(own(mergeGeos(list)), material); m.name = name; if (shadow) m.castShadow = true; group.add(m); return m; };
  merged(B.structural, structuralM, 'city-structure', true);      /* block bodies, setbacks, decks, pylons — the only shadow casters */
  merged(B.composite, compositeM, 'city-composite', false);
  merged(B.trim, trimM, 'city-rails', false);
  merged(B.strips, stripMat, 'city-energy-lines', false);
  merged(B.whites, whiteMat, 'city-static-lights', false);
  instanced(unitKit, compositeM, kitBoxes, 'city-roof-kit');
  instanced(own(new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1)), trimM, kitMasts, 'city-masts');

  /* ---------------------------------------------------------------- time, theme, motion */
  const themeCol = new THREE.Color(theme.energy), whiteCol = new THREE.Color(WHITE);
  let last = { daylight: 0 };
  function setTime(s) {
    last = s || last; const d = Math.max(0, Math.min(1, last.daylight || 0));
    /* the district reads as a lit city but never outshines the three destinations in front of it:
       windows sit at ~60 % of full at night and 18 % by day (brief §08 window variety, §45 hierarchy) */
    winMat.color.setScalar(0.18 + 0.44 * (1 - d));
    stripMat.color.copy(themeCol).multiplyScalar(1 - 0.7 * d);     /* strips / rail lights: day × 0.3 */
    whiteMat.color.copy(whiteCol).multiplyScalar(0.35 + 0.65 * (1 - d));
    return last;
  }
  function setTheme(t) { if (t && t.energy != null) themeCol.setHex(t.energy); setTime(last); return t; }
  /* piecewise-eased traverse: constant speed with short ramps at both ends */
  function ramp(k) { const a = 0.12; return k < a ? k * k / (2 * a * (1 - a)) : k > 1 - a ? 1 - (1 - k) * (1 - k) / (2 * a * (1 - a)) : (k - a / 2) / (1 - a); }
  const podLocal = new THREE.Matrix4();
  function update(t) {
    if (pod) {
      const cycle = 2 * (pod.travel + pod.dwell), ph = t % cycle;
      let u;
      if (ph < pod.travel) u = ramp(ph / pod.travel);
      else if (ph < pod.travel + pod.dwell) u = 1;
      else if (ph < 2 * pod.travel + pod.dwell) u = 1 - ramp((ph - pod.travel - pod.dwell) / pod.travel);
      else u = 0;
      podLocal.makeTranslation(-pod.half + 2 * pod.half * u, pod.y, 0);
      pod.mesh.matrix.multiplyMatrices(pod.frame, podLocal); pod.mesh.matrixWorldNeedsUpdate = true;
    }
    if (elevator) {
      const e = elevator;
      if (e.next < 0) { e.next = t + 2.0; e.mesh.position.y = e.base; }
      else if (t < e.t1) e.mesh.position.y = e.from + (e.to - e.from) * smooth((t - e.t0) / (e.t1 - e.t0));
      else if (t >= e.next) {
        let f = e.floor + e.dir * (1 + Math.floor(e.R() * 3));
        if (f >= e.floors) { f = e.floors; e.dir = -1; } else if (f <= 0) { f = 0; e.dir = 1; }
        e.from = e.mesh.position.y; e.to = e.base + f * FLOOR; e.floor = f; e.t0 = t;
        e.t1 = t + Math.max(0.8, Math.abs(e.to - e.from) / 2.4); e.next = e.t1 + 2.5 + e.R() * 3;
      }
    }
  }
  function setQuality(q) { distant.visible = !q || q.farLayers !== false; return distant.visible; }
  function dispose() {
    if (group.parent) group.parent.remove(group);
    owned.geometries.forEach(g => g.dispose()); owned.geometries.length = 0;
    owned.materials.forEach(m => m.dispose()); owned.materials.length = 0;
  }

  /* cost bookkeeping (what the establishing view can at most draw from this module) */
  group.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count; stats.triangles += Math.round(n / 3) * (o.isInstancedMesh ? o.count : 1); stats.drawCalls++; } });
  stats.materials = ['structural', 'composite', 'trimSatin', 'panel', 'MeshBasic: windows / energy lines / lights / distant / ground'];
  setTime(ctx.clock && typeof ctx.clock.state === 'function' ? ctx.clock.state() : last);
  update(0);
  return { group, setTime, setTheme, update, dispose, stats, setQuality, anchors: { paths: anchors.paths.filter(p => /^city-/.test(p.id)), pads: anchors.pads.filter(p => /^city-/.test(p.id)) } };
}
