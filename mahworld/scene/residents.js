/* MAHWORLD :: RESIDENTS — the crystalline people of MAHPLAZA.

   Species law (art direction, hard requirements):
   - Head: a beveled, flattened square-diamond slab — never a sphere.  Dark
     front/back panels and a DARK FACIAL CHAMBER holding two eyes and a small
     smile (in the resident's own light colour) suggest a face.
   - Everything is faceted and flat shaded; every mesh carries per-facet
     vertex colour so ONE shared material per colour still reads as a cut
     crystal: dark structural planes, coloured mid facets, pale platinum catches.
     The torso, head and arms are painted CALM (one volume, few shallow dark
     planes, small facets); the lower teardrop keeps the stronger, larger cut —
     so a figure reads as a sculpted crystal person, not a heap of triangles.
   - Humanoid upper body: a shoulder yoke the shoulder caps sit INTO, chest,
     waist, a short neck that enters the head slab, two arms with a faceted
     hand wedge and a thumb notch.  NO legs, feet or knees: below the waist
     there is ONE continuous faceted teardrop that tapers to a single terminal
     point which hangs `hover` metres above the ground.  The whole body floats;
     a soft dark contact blob on the ground under the tip grounds it.
   - `physique` 0..1 blends untrained → hero; `sex` 'm' | 'f' picks the base.
   - One coherent colour per resident, chosen by its player; no yellow anywhere.

   Detail tiers — `createResident({ lod: 'near' | 'mid' | 'far' })`: near is the
   full sculpt, mid drops the smile, the neck ring, the hand and a third of every
   lathe's segments, far drops the eyes and the chest emblem too and halves the
   arm detail.  The SPECIES is identical at every tier — square-diamond head with
   its dark facial chamber, humanoid upper body, ONE continuous teardrop, no legs
   — only the triangle count expressing it changes.  `createImpostor()` is the
   distant crowd: the silhouette alone, ONE draw call of ≤ 60 triangles, in the
   resident's own colour, with the same group contract (update / setEnergy /
   face / setDrive) so a caller can hold impostors and residents in one list.
   `setLOD(group, tier)` and `recolour(group, colour)` rebuild a figure in place
   from the same seed, so its look, idle motion, id, transform and parent all
   survive.

   Group origin = the ground point under the terminal tip (y = 0 is the ground);
   local +Z is the resident's front.  Materials are cached per colour and shared
   by every resident of that colour, so `setEnergy` (night glow) acts on the
   colour family: call it on every resident with the world's night value each
   frame — it is a no-op when the value is unchanged. */

import * as THREE from '../vendor/three/three.module.min.js';
import { blobTexture } from './materials.js';

export const COLOURS = ['blue', 'purple', 'violet', 'green', 'emerald', 'teal', 'red', 'crimson', 'platinum', 'silver'];

const PALETTES = Object.freeze({
  blue:     { base: 0x2f6fe6, dark: 0x0a1732, light: 0xd2e4ff },
  purple:   { base: 0x9b3fd6, dark: 0x220b3a, light: 0xeed8ff },
  violet:   { base: 0x6e5cf0, dark: 0x160f3a, light: 0xdcd6ff },
  green:    { base: 0x3fc26a, dark: 0x0a2617, light: 0xd8ffe4 },
  emerald:  { base: 0x14a070, dark: 0x06261e, light: 0xccfff0 },
  teal:     { base: 0x2bb5b8, dark: 0x08262a, light: 0xd4fbff },
  red:      { base: 0xe0453f, dark: 0x36090d, light: 0xffdcd8 },
  crimson:  { base: 0xb3173c, dark: 0x2c0510, light: 0xffd2dc },
  platinum: { base: 0xc6d2e0, dark: 0x27303d, light: 0xf4f8fc },
  silver:   { base: 0xaebbcb, dark: 0x1e2631, light: 0xf0f4f9 }
});
export function isColour(name) { return !!PALETTES[name]; }

export function residentPalette(name) {
  const p = PALETTES[name] || PALETTES.blue;
  return { base: p.base, dark: p.dark, light: p.light };
}

/* ------------------------------------------------------------------ utils */
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const lerp = (a, b, t) => a + (b - a) * t;
function mulberry(seed) {
  let a = (seed >>> 0) || 1;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/* --------------------------------------------------------------- materials */
const MATERIALS = new Map();
const ENERGY = { body: [0.10, 0.5], dark: [0.03, 0.22], light: [0.22, 1.3] };   /* [day, +night] emissive */
/* The night glow follows each facet's brightness (dark planes stay dark, catches
   flare) so the crystal keeps its cut when lit from inside.  One shared program. */
const FACET_GLOW = `#include <emissivemap_fragment>
#ifdef USE_COLOR
	totalEmissiveRadiance *= 0.35 + 0.65 * clamp( dot( vColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) / uFacetLum, 0.0, 2.2 );
#endif`;
function facetGlow(material, lum) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uFacetLum = { value: Math.max(lum, 1e-3) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFacetLum;')
      .replace('#include <emissivemap_fragment>', FACET_GLOW);
  };
  material.customProgramCacheKey = () => 'mahworld-resident-facet-glow';
}
const luminance = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
function materialsFor(name) {
  if (MATERIALS.has(name)) return MATERIALS.get(name);
  const pal = residentPalette(name);
  const hue = new THREE.Color(pal.base), light = new THREE.Color(pal.light), dark = new THREE.Color(pal.dark);
  const body = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.34, metalness: 0.22, emissive: hue.clone(), emissiveIntensity: ENERGY.body[0] });
  const darkM = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.26, metalness: 0.5, emissive: hue.clone(), emissiveIntensity: ENERGY.dark[0] });
  const lightM = new THREE.MeshStandardMaterial({ color: light.clone(), flatShading: true, roughness: 0.16, metalness: 0.18, emissive: hue.clone().lerp(light, 0.45), emissiveIntensity: ENERGY.light[0] });
  facetGlow(body, luminance(hue)); facetGlow(darkM, luminance(dark));
  body.name = 'resident-' + name + '-body'; darkM.name = 'resident-' + name + '-dark'; lightM.name = 'resident-' + name + '-light';
  const set = {
    name, body, dark: darkM, light: lightM, energy: 0,
    colours: { base: hue, dark, light },   /* working-space colours used to paint facets */
    setEnergy(e) {
      e = clamp01(e); if (e === set.energy) return;
      set.energy = e;
      body.emissiveIntensity = ENERGY.body[0] + ENERGY.body[1] * e;
      darkM.emissiveIntensity = ENERGY.dark[0] + ENERGY.dark[1] * e;
      lightM.emissiveIntensity = ENERGY.light[0] + ENERGY.light[1] * e;
    }
  };
  MATERIALS.set(name, set);
  return set;
}

/* Contact blob (hover grounding): ONE shared unlit black material; each
   figure's opacity rides on a 4-component vertex colour of its own 2-triangle
   plane, so the material stays shared.  Soft radial falloff (blobTexture),
   never darker than BLOB_OPACITY at the centre — no black halo. */
const BLOB_OPACITY = 0.4, BLOB_MIN = 0.18;
let BLOB = null;
function blobMaterial() {
  if (BLOB) return BLOB;
  BLOB = new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x000000, transparent: true, opacity: BLOB_OPACITY, depthWrite: false, vertexColors: true });
  BLOB.name = 'resident-contact';
  return BLOB;
}
function contactBlob(width) {
  const g = new THREE.PlaneGeometry(width, width); g.rotateX(-Math.PI / 2);
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(16).fill(1), 4));
  const mesh = new THREE.Mesh(g, blobMaterial());
  mesh.name = 'contact'; mesh.position.y = 0.012; mesh.castShadow = false; mesh.receiveShadow = false;
  return mesh;
}
/* opacity by hover height: a figure resting low sits on a firm shadow, a high hoverer on a faint one */
function blobDriver(mesh) {
  const attr = mesh.geometry.getAttribute('color'), arr = attr.array;
  let last = -1;
  return function (y) {
    const a = clamp(BLOB_OPACITY - (y - 0.1) * 0.5, BLOB_MIN, BLOB_OPACITY) / BLOB_OPACITY;
    if (Math.abs(a - last) < 0.01) return;
    last = a; arr[3] = arr[7] = arr[11] = arr[15] = a; attr.needsUpdate = true;
  };
}

/* ---------------------------------------------------------------- detail */
/* near = the full sculpt; mid ≈ 55 % of its triangles (SEG 8, no smile, fewer
   arm rings); far ≤ 120 triangles in two draw calls (body + dark): one lathe
   for teardrop + torso, a head slab, two simple arm lathes baked into the body. */
export const LOD_TIERS = Object.freeze(['near', 'mid', 'far']);
const LODS = Object.freeze({
  near: { seg: 14, dropSeg: 12, armSeg: 8, neckSeg: 8, drop: [0.1, 0.25, 0.45, 0.68, 0.88, 1.0], hip: [0.36, 0.7], torsoMid: true,  head: 5, eyes: true,  smile: true,  emblem: true,  thumb: true,  armDetail: 2 },
  mid:  { seg: 8,  dropSeg: 8,  armSeg: 6, neckSeg: 6, drop: [0.12, 0.35, 0.62, 0.85, 1.0],     hip: [0.5],       torsoMid: false, head: 3, eyes: true,  smile: false, emblem: true,  thumb: false, armDetail: 1 },
  far:  { seg: 6,  dropSeg: 6,  armSeg: 4, neckSeg: 0, drop: [0.4, 1.0],                        hip: [],          torsoMid: false, head: 2, eyes: false, smile: false, emblem: false, thumb: false, armDetail: 0, far: true }
});
/* head rim profiles: [depth fraction, size fraction] back → front */
const HEAD_PROFILES = Object.freeze({
  5: [[-0.5, 0.66], [-0.34, 0.92], [-0.12, 1], [0.12, 1], [0.34, 0.92], [0.5, 0.7]],
  3: [[-0.5, 0.7], [-0.2, 1], [0.2, 1], [0.5, 0.72]],
  2: [[-0.5, 0.7], [0, 1], [0.5, 0.72]]
});

/* ---------------------------------------------------------- gem geometry */
/* Triangle accumulator → non-indexed BufferGeometry, flat normals, one colour per facet. */
class Poly {
  constructor() { this.pos = []; this.col = []; }
  tri(a, b, c, colour) {
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) this.col.push(colour.r, colour.g, colour.b);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    return g;
  }
}

const _c = new THREE.Color();
/* Facet painter, deterministic per seed.  Each mesh shows dark planes, coloured
   mid facets and a few platinum catches while staying ONE colour.
   'torso' (torso, head rim, arms) keeps a narrow value range with shallow dark
   planes on ≤ 20 % of facets so the upper body reads as one volume; 'body'
   (teardrop, far figures) keeps the stronger cut; 'dark' is the structure. */
function painter(rng, cols, tier) {
  const { base, dark, light } = cols;
  return function (ny) {
    const r = rng();
    if (tier === 'dark') {
      if (r < 0.11) _c.copy(dark).lerp(base, 0.55);
      else if (r < 0.19) _c.copy(dark).lerp(light, 0.32);
      else _c.copy(dark).multiplyScalar(0.75 + 0.5 * rng());
    } else if (tier === 'torso') {
      if (r < 0.2) _c.copy(base).lerp(dark, 0.3 + 0.18 * rng());
      else if (r < 0.3) _c.copy(base).lerp(light, 0.28 + 0.24 * rng());
      else _c.copy(base).multiplyScalar(0.88 + 0.2 * rng());
      if (ny > 0.55 && rng() < 0.5) _c.lerp(light, 0.16);
    } else {
      if (r < 0.16) _c.copy(base).lerp(dark, 0.62 + 0.22 * rng());
      else if (r < 0.28) _c.copy(base).lerp(light, 0.45 + 0.35 * rng());
      else _c.copy(base).multiplyScalar(0.78 + 0.34 * rng());
      if (ny > 0.55 && rng() < 0.5) _c.lerp(light, 0.25);   /* upward facets catch the sky */
    }
    return _c;
  };
}

/* Gem lathe around Y.  rings bottom→top of { y, rx, rz, z? }; rx <= 0 is an apex.
   With `twist` every other ring is turned half a step so each band becomes an
   antiprism strip of triangles (cut-gem facets) instead of quads.  Winding is
   forced outward, and the painter receives the facet's outward normal y. */
function lathe(poly, rings, seg, paint, opts = {}) {
  const twist = opts.twist !== false, phase0 = opts.phase || 0;
  const pts = rings.map((r, i) => {
    const z0 = r.z || 0;
    if (!(r.rx > 0)) return [[0, r.y, z0]];
    const ph = phase0 + (twist && (i % 2) ? 0.5 : 0), arr = [];
    for (let j = 0; j < seg; j++) { const a = (j + ph) / seg * TAU; arr.push([Math.cos(a) * r.rx, r.y, Math.sin(a) * r.rz + z0]); }
    return arr;
  });
  const emit = (a, b, c, ref) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    const sgn = (nx * ref[0] + ny * ref[1] + nz * ref[2]) < 0 ? -1 : 1;
    if (sgn < 0) poly.tri(a, c, b, paint(-ny / len)); else poly.tri(a, b, c, paint(ny / len));
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const A = pts[i], B = pts[i + 1], zc = ((rings[i].z || 0) + (rings[i + 1].z || 0)) / 2;
    if (A.length === 1 && B.length === 1) continue;
    if (A.length === 1 || B.length === 1) {
      const apex = A.length === 1 ? A[0] : B[0], ring = A.length === 1 ? B : A, up = A.length === 1 ? -1 : 1;
      for (let j = 0; j < seg; j++) {
        const p = ring[j], q = ring[(j + 1) % seg], cx = (p[0] + q[0] + apex[0]) / 3, cz = (p[2] + q[2] + apex[2]) / 3 - zc;
        const rl = Math.hypot(cx, cz) || 1;
        emit(apex, p, q, [cx / rl, up, cz / rl]);
      }
    } else {
      for (let j = 0; j < seg; j++) {
        const j1 = (j + 1) % seg;
        for (const t of [[A[j], A[j1], B[j]], [A[j1], B[j1], B[j]]]) {
          const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cz = (t[0][2] + t[1][2] + t[2][2]) / 3 - zc;
          emit(t[0], t[1], t[2], [cx, 0, cz]);
        }
      }
    }
  }
}

/* Convex solids with faces wound outward from their centroid; the painter
   receives the face normal's y and z. */
function convex(poly, pts, faces, paint) {
  let cx = 0, cy = 0, cz = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
  cx /= pts.length; cy /= pts.length; cz /= pts.length;
  for (const [i, j, k] of faces) {
    const a = pts[i], b = pts[j], c = pts[k];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, len = Math.hypot(nx, ny, nz) || 1;
    const fx = (a[0] + b[0] + c[0]) / 3 - cx, fy = (a[1] + b[1] + c[1]) / 3 - cy, fz = (a[2] + b[2] + c[2]) / 3 - cz;
    if (nx * fx + ny * fy + nz * fz < 0) poly.tri(a, c, b, paint(-ny / len, -nz / len)); else poly.tri(a, b, c, paint(ny / len, nz / len));
  }
}
/* a 4-face pyramid: apex + base triangle (the thumb) */
const tetra = (poly, apex, b0, b1, b2, paint) => convex(poly, [apex, b0, b1, b2], [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]], paint);
/* an octahedron with half-extents hx, hy, hz about c (impostor head, shoulder bar) */
function octa(poly, c, hx, hy, hz, paint) {
  const pts = [[c[0] + hx, c[1], c[2]], [c[0] - hx, c[1], c[2]], [c[0], c[1] + hy, c[2]], [c[0], c[1] - hy, c[2]], [c[0], c[1], c[2] + hz], [c[0], c[1], c[2] - hz]];
  const faces = [];
  for (const x of [0, 1]) for (const y of [2, 3]) for (const z of [4, 5]) faces.push([x, y, z]);
  convex(poly, pts, faces, paint);
}

const meshOf = (poly, material, name) => { const m = new THREE.Mesh(poly.build(), material); if (name) m.name = name; return m; };
/* A flat diamond plate facing +Z: built as a fan around Y then turned upright. */
function plateGeom(w, h, paint) {
  const P = new Poly();
  lathe(P, [{ y: 0, rx: w, rz: h }, { y: 0.001, rx: 0, rz: 0 }], 4, paint, { twist: false });
  const g = P.build(); g.rotateX(Math.PI / 2);
  return g;
}

/* Draw-call budget: every part is authored as its own mesh for clarity, then
   baked — per material — into ONE mesh inside the nearest ancestor that
   update() animates (flagged userData.animated) or the body group.  Vertex
   colours and flat normals are carried over, so the result is pixel-identical:
   3 draws for a still resident, 5 for spar, 7 for walk (+1 contact blob). */
function concatF32(arrays) {
  let n = 0; for (const a of arrays) n += a.length;
  const out = new Float32Array(n); let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}
function mergeStatic(group, body) {
  group.updateMatrixWorld(true);
  const buckets = new Map(), doomed = [];
  const local = new THREE.Matrix4(), inv = new THREE.Matrix4();
  group.traverse(o => {
    if (!o.isMesh) return;
    let root = o.parent;
    while (root !== body && !root.userData.animated) root = root.parent;
    inv.copy(root.matrixWorld).invert();
    local.multiplyMatrices(inv, o.matrixWorld);
    const g = o.geometry; g.applyMatrix4(local);
    let byMat = buckets.get(root); if (!byMat) buckets.set(root, byMat = new Map());
    let b = byMat.get(o.material); if (!b) byMat.set(o.material, b = { pos: [], nrm: [], col: [] });
    b.pos.push(g.getAttribute('position').array); b.nrm.push(g.getAttribute('normal').array); b.col.push(g.getAttribute('color').array);
    doomed.push(o);
  });
  for (const o of doomed) { o.parent.remove(o); o.geometry.dispose(); }
  for (const [root, byMat] of buckets) for (const [mat, b] of byMat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(concatF32(b.pos), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(concatF32(b.nrm), 3));
    g.setAttribute('color', new THREE.BufferAttribute(concatF32(b.col), 3));
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = (root.name || 'node') + ':' + (mat.name.split('-').pop() || 'part');
    root.add(mesh);
  }
}

/* ------------------------------------------------------------- proportions */
/* Measures for a 2.0 m masculine frame, blended by physique, then adjusted for
   the feminine base; everything is multiplied by s = height / 2. */
function measures(spec, rng) {
  const p = spec.physique, f = spec.sex === 'f', F = (m, fem) => f ? fem : m;
  const seated = spec.pose === 'seated';
  const defaultH = (f ? 1.9 : 2.0) * (0.965 + 0.035 * p) * (1 + (rng() - 0.5) * 0.03);
  const H = spec.height > 0 ? spec.height : defaultH;
  const s = H / 2.0, L = (a, b) => lerp(a, b, p);
  const m = {
    shoulderHalf: L(0.22, 0.34) * F(1, 0.86),
    chestRx: L(0.175, 0.26) * F(1, 0.88), chestRz: L(0.125, 0.165) * F(1, 0.97),
    chestBotRx: L(0.185, 0.21) * F(1, 0.85), chestBotRz: L(0.14, 0.145) * F(1, 0.95),
    waistRx: L(0.2, 0.15) * F(1, 0.84), waistRz: L(0.15, 0.115) * F(1, 0.88),
    hipRx: L(0.19, 0.245) * F(1, 1.06), hipRz: L(0.155, 0.17) * F(1, 1.04),
    taperQ: L(0.72, 1.12),
    bustZ: F(0, 0.028),
    capR: L(0.066, 0.11) * F(1, 0.85),
    upperR: L(0.046, 0.072) * F(1, 0.85), foreR: L(0.038, 0.056) * F(1, 0.85), bicep: L(1.0, 1.16),
    handW: L(0.042, 0.052) * F(1, 0.88), handD: L(0.024, 0.03), handLen: 0.14,
    headW: 0.19 * F(1, 0.93), headH: 0.215 * F(1, 0.93), headD: 0.2 * F(1, 0.92),
    neckR: L(0.04, 0.05) * F(1, 0.85),
    hipY: 0.78, waistY: 1.08, chestBotY: 1.215, chestY: 1.39, shoulderY: 1.52, neckTop: 1.60,
    upperLen: 0.36, foreLen: 0.31,
    abduct: L(7, 10) * DEG
  };
  if (seated) { m.hipRx *= 1.18; m.hipRz *= 1.12; m.taperQ *= 0.85; }
  const dropScale = seated ? 0.62 : 1, shift = m.hipY * (dropScale - 1);
  m.hipY *= dropScale;
  for (const k of ['waistY', 'chestBotY', 'chestY', 'shoulderY', 'neckTop']) m[k] += shift;
  m.headC = 2.02 + shift - m.headH;   /* the slab sits a little proud of the frame so the neck reads */
  for (const k in m) if (k !== 'taperQ' && k !== 'bicep' && k !== 'abduct') m[k] *= s;
  /* the shoulder yoke: the torso's top ring reaches out under the caps so they sit INTO it */
  m.yokeRx = Math.max(m.chestRx * 0.97, m.shoulderHalf - m.capR * 0.62); m.yokeRz = m.chestRz * 0.84;
  m.blobW = clamp(m.hipRx * 3.8, 0.7, 0.95);   /* contact blob width ≈ 1.9 × the hip width */
  m.height = H; m.scale = s;
  return m;
}

/* ------------------------------------------------------------------ poses */
/* fwd = [left, right] upper-arm forward swing; abd adds to the natural abduction;
   yaw turns the upper arm inward (guard); tilt/headYaw move the head; degrees. */
const POSES = Object.freeze({
  stand:    { lean: 0,  fwd: [0, 0],    abd: 0,  elbow: 8,   yaw: 0,  tilt: 0,  headYaw: 0, hoverDelta: 0 },
  converse: { lean: 4,  fwd: [26, 30],  abd: 2,  elbow: 62,  yaw: 12, tilt: 3,  headYaw: 0, hoverDelta: 0 },
  walk:     { lean: 8,  fwd: [18, -14], abd: -1, elbow: 24,  yaw: 0,  tilt: 0,  headYaw: 0, hoverDelta: 0 },
  spar:     { lean: 10, fwd: [58, 64],  abd: -8, elbow: 120, yaw: 28, tilt: -4, headYaw: 0, hoverDelta: -0.05 },
  /* guard: the spar stance with the arms left DRIVABLE (each arm is its own
     animated node) so a practice preview can move guard → strike → block → evade */
  guard:    { lean: 10, fwd: [58, 64],  abd: -8, elbow: 120, yaw: 28, tilt: -4, headYaw: 0, hoverDelta: -0.05, drivable: true },
  observe:  { lean: -1, fwd: [2, 2],    abd: 0,  elbow: 6,   yaw: 0,  tilt: 11, headYaw: 9, hoverDelta: 0 },
  seated:   { lean: 3,  fwd: [34, 34],  abd: 1,  elbow: 72,  yaw: 10, tilt: 2,  headYaw: 0, hoverDelta: 0 }
});

/* --------------------------------------------------------------- builder */
export function createResident(spec = {}) {
  spec = Object.assign({}, spec);
  if (!PALETTES[spec.colour]) spec.colour = 'blue';
  if (!POSES[spec.pose]) spec.pose = 'stand';
  spec.sex = spec.sex === 'f' ? 'f' : 'm';
  spec.physique = Number.isFinite(spec.physique) ? clamp01(spec.physique) : 0.5;
  spec.hover = Number.isFinite(spec.hover) ? spec.hover : 0.25;
  spec.seed = Number.isFinite(spec.seed) ? spec.seed : 1;
  if (!(spec.height > 0)) delete spec.height;
  if (spec.id != null) spec.id = String(spec.id);

  spec.lod = LOD_TIERS.indexOf(spec.lod) > -1 ? spec.lod : 'near';
  const L = LODS[spec.lod];
  const rng = mulberry(Math.floor(spec.seed * 7919) + 17);
  const mats = materialsFor(spec.colour);
  const m = measures(spec, rng);
  const pose = POSES[spec.pose];
  /* the detail tier drives the lathe segment count and which small features are built at all; the
     SPECIES is identical at every tier — square-diamond head, one continuous teardrop, no legs */
  const SEG = Math.max(6, L.seg - 4), s = m.scale;
  const paintBody = painter(rng, mats.colours, 'body'), paintDark = painter(rng, mats.colours, 'dark');
  const paintLight = () => mats.colours.light;

  const group = new THREE.Group();
  group.name = 'resident:' + spec.colour;
  const body = new THREE.Group(); body.name = 'body'; group.add(body);
  const hover = (spec.pose === 'seated' ? 0.1 : spec.hover) + pose.hoverDelta;
  body.position.y = hover;

  /* --- the teardrop: tip → hips → waist, ONE continuous surface ------------- */
  {
    const P = new Poly();
    const rings = [{ y: 0, rx: 0, rz: 0 }];
    for (const u of [0.07, 0.17, 0.3, 0.46, 0.63, 0.8, 0.92, 1.0]) {
      const fct = Math.pow(Math.sin(u * Math.PI / 2), m.taperQ);
      rings.push({ y: u * m.hipY, rx: m.hipRx * fct, rz: m.hipRz * fct });
    }
    rings.push({ y: lerp(m.hipY, m.waistY, 0.5), rx: lerp(m.hipRx, m.waistRx, 0.42), rz: lerp(m.hipRz, m.waistRz, 0.42) });
    rings.push({ y: m.waistY, rx: m.waistRx, rz: m.waistRz });
    rings.push({ y: m.waistY + 0.004, rx: 0, rz: 0 });
    lathe(P, rings, SEG, paintBody);
    body.add(meshOf(P, mats.body, 'teardrop'));
  }
  /* --- waist band (dark structure) ----------------------------------------- */
  {
    const P = new Poly(), r = 1.08, hb = 0.035 * s, k = hb / (m.chestBotY - m.waistY);   /* top edge follows the torso slope */
    lathe(P, [{ y: m.waistY - hb, rx: m.waistRx * r, rz: m.waistRz * r }, { y: m.waistY + hb, rx: lerp(m.waistRx, m.chestBotRx, k) * r, rz: lerp(m.waistRz, m.chestBotRz, k) * r }], SEG, paintDark, { twist: false });
    body.add(meshOf(P, mats.dark, 'waist'));
  }

  /* --- torso pivot (lean / crouch happens here) ----------------------------- */
  const torso = new THREE.Group(); torso.name = 'torso'; torso.position.y = m.waistY; body.add(torso);
  torso.rotation.x = pose.lean * DEG;
  const T = y => y - m.waistY;   /* torso-local y */
  {
    const P = new Poly();
    lathe(P, [
      { y: T(m.waistY) - 0.004, rx: 0, rz: 0 },
      { y: T(m.waistY), rx: m.waistRx, rz: m.waistRz },
      { y: T(m.chestBotY), rx: m.chestBotRx, rz: m.chestBotRz, z: m.bustZ * 0.5 },
      { y: T(m.chestY), rx: m.chestRx, rz: m.chestRz, z: m.bustZ },
      { y: T(m.shoulderY), rx: m.chestRx * 0.9, rz: m.chestRz * 0.88 },
      { y: T(m.shoulderY) + 0.04 * s, rx: 0, rz: 0 }
    ], SEG, paintBody);
    torso.add(meshOf(P, mats.body, 'chest'));
  }
  /* chest emblem: one small bright diamond plate */
  if (L.emblem) {
    const g = plateGeom(0.045 * s, 0.06 * s, paintLight);
    g.translate(0, T(m.chestY) - 0.02 * s, m.chestRz + m.bustZ + 0.012 * s);
    const pl = new THREE.Mesh(g, mats.light); pl.name = 'emblem'; torso.add(pl);
  }
  /* --- neck ----------------------------------------------------------------- */
  {
    const P = new Poly();
    lathe(P, [{ y: T(m.shoulderY) - 0.02 * s, rx: m.neckR, rz: m.neckR }, { y: T(m.neckTop), rx: m.neckR * 0.92, rz: m.neckR * 0.92 }, { y: T(m.neckTop) + 0.003, rx: 0, rz: 0 }], Math.max(4, L.neckSeg || 4), paintDark, { twist: false, phase: 0.5 });
    if (L.neckSeg) torso.add(meshOf(P, mats.dark, 'neck'));
  }

  /* --- head: beveled square-diamond slab ------------------------------------ */
  const headPivot = new THREE.Group(); headPivot.name = 'head'; headPivot.position.y = T(m.neckTop) - 0.01 * s; torso.add(headPivot);
  headPivot.rotation.z = pose.tilt * DEG; headPivot.rotation.y = pose.headYaw * DEG;
  {
    const hc = m.headC - m.neckTop + 0.01 * s;   /* head centre in pivot space */
    const w = m.headW, h = m.headH, d = m.headD;
    /* rim: lathed around Y (profile = depth), then turned so the profile runs along Z */
    const rim = new Poly();
    lathe(rim, [
      { y: -d / 2, rx: w * 0.7, rz: h * 0.7 },
      { y: -d * 0.2, rx: w, rz: h },
      { y: d * 0.2, rx: w, rz: h },
      { y: d / 2, rx: w * 0.72, rz: h * 0.72 }
    ], 4, paintBody, { twist: false });
    const rimG = rim.build(); rimG.rotateX(Math.PI / 2); rimG.translate(0, hc, 0);
    const rimM = new THREE.Mesh(rimG, mats.body); rimM.name = 'headRim'; headPivot.add(rimM);
    /* dark front and back panels (the head core) */
    const caps = new Poly();
    lathe(caps, [{ y: d / 2, rx: w * 0.72, rz: h * 0.72 }, { y: d / 2 + 0.001, rx: 0, rz: 0 }], 4, paintDark, { twist: false });
    lathe(caps, [{ y: -d / 2 - 0.001, rx: 0, rz: 0 }, { y: -d / 2, rx: w * 0.7, rz: h * 0.7 }], 4, paintDark, { twist: false });
    const capG = caps.build(); capG.rotateX(Math.PI / 2); capG.translate(0, hc, 0);
    const capM = new THREE.Mesh(capG, mats.dark); capM.name = 'headCore'; headPivot.add(capM);
    /* the face: a DARK FACIAL CHAMBER — an inset, deeper-than-the-core diamond
       on the front panel — holding two friendly eyes and a small smile, all in
       the resident's own light colour. No nose, no brows, no speech. */
    const chamberPaint = () => _c.copy(mats.colours.dark).multiplyScalar(0.42);
    const chG = plateGeom(w * 0.66, h * 0.66, chamberPaint);
    chG.translate(0, hc - h * 0.02, d / 2 + 0.004 * s);
    const chM = new THREE.Mesh(chG, mats.dark); chM.name = 'faceChamber'; headPivot.add(chM);
    const eyeW = w * 0.085, eyeH = h * 0.11, eyeY = hc + h * 0.08, eyeX = w * 0.2, faceZ = d / 2 + 0.009 * s;
    if (L.eyes) for (const sx of [-1, 1]) { const eG = plateGeom(eyeW, eyeH, paintLight); eG.translate(sx * eyeX, eyeY, faceZ); const eM = new THREE.Mesh(eG, mats.light); eM.name = sx < 0 ? 'eyeL' : 'eyeR'; headPivot.add(eM); }
    /* the smile: three tiny plates on a shallow upward arc */
    if (L.smile) for (const [sx, dy] of [[-0.11, 0.0], [0, -0.022], [0.11, 0.0]]) { const mG = plateGeom(w * 0.05, h * 0.035, paintLight); mG.translate(sx * w, hc - h * 0.2 + dy * h, faceZ); const mM = new THREE.Mesh(mG, mats.light); mM.name = 'smile'; headPivot.add(mM); }
  }

  /* --- arms ----------------------------------------------------------------- */
  const arms = [];
  for (const side of [-1, 1]) {
    const idx = side < 0 ? 0 : 1;
    const shoulder = new THREE.Group(); shoulder.name = side < 0 ? 'armL' : 'armR';
    shoulder.position.set(side * m.shoulderHalf, T(m.shoulderY) - 0.01 * s, 0);
    torso.add(shoulder);
    /* shoulder cap: dark faceted bead */
    {
      const P = new Poly(), R = m.capR;
      lathe(P, [{ y: -R * 0.95, rx: 0, rz: 0 }, { y: -R * 0.45, rx: R * 0.86, rz: R * 0.8 }, { y: 0, rx: R, rz: R * 0.92 }, { y: R * 0.45, rx: R * 0.86, rz: R * 0.8 }, { y: R * 0.95, rx: 0, rz: 0 }], 6, paintDark);
      shoulder.add(meshOf(P, mats.dark, 'shoulderCap'));
    }
    const swing = new THREE.Group(); swing.name = side < 0 ? 'swingL' : 'swingR'; shoulder.add(swing);
    shoulder.rotation.z = side * (m.abduct + pose.abd * DEG);
    shoulder.rotation.y = -side * pose.yaw * DEG;
    swing.rotation.x = -pose.fwd[idx] * DEG;
    {
      const P = new Poly(), r0 = m.upperR, r1 = m.upperR * 0.8, L = m.upperLen;
      lathe(P, [{ y: -L - 0.002, rx: 0, rz: 0 }, { y: -L, rx: r1, rz: r1 }, { y: -L * 0.58, rx: r0 * m.bicep, rz: r0 * m.bicep * 0.95 }, { y: -L * 0.2, rx: r0, rz: r0 }, { y: 0.01, rx: r0 * 0.9, rz: r0 * 0.9 }], Math.max(4, L.armSeg - 2), paintBody);
      swing.add(meshOf(P, mats.body, 'upperArm'));
    }
    const elbow = new THREE.Group(); elbow.position.y = -m.upperLen; swing.add(elbow);
    elbow.rotation.x = -pose.elbow * DEG;
    {
      const P = new Poly(), R = m.upperR * 0.98;
      lathe(P, [{ y: -R, rx: 0, rz: 0 }, { y: -R * 0.4, rx: R, rz: R }, { y: R * 0.4, rx: R, rz: R }, { y: R, rx: 0, rz: 0 }], Math.max(4, L.armSeg - 2), paintDark, { twist: false, phase: 0.5 });
      if (L.armDetail) elbow.add(meshOf(P, mats.dark, 'elbow'));
    }
    {
      const P = new Poly(), r0 = m.foreR * 1.08, r1 = m.foreR * 0.72, L = m.foreLen;
      lathe(P, [{ y: -L - 0.002, rx: 0, rz: 0 }, { y: -L, rx: r1, rz: r1 }, { y: -L * 0.55, rx: r0 * 0.95, rz: r0 * 0.95 }, { y: -0.01, rx: r0, rz: r0 }], Math.max(4, L.armSeg - 2), paintBody);
      elbow.add(meshOf(P, mats.body, 'forearm'));
    }
    /* hand: a simplified faceted wedge, flat sides facing front/back */
    {
      const P = new Poly(), Lh = m.handLen, w = m.handW, dd = m.handD, y0 = -m.foreLen;
      lathe(P, [{ y: y0 - Lh, rx: 0, rz: 0 }, { y: y0 - Lh * 0.62, rx: w, rz: dd }, { y: y0 - Lh * 0.25, rx: w * 0.92, rz: dd * 0.95 }, { y: y0 + 0.015, rx: 0, rz: 0 }], 4, paintDark, { twist: false, phase: 0.5 });
      if (L.armDetail >= 1) elbow.add(meshOf(P, mats.dark, 'hand'));
    }
    arms.push({ shoulder, swing, elbow, baseFwd: pose.fwd[idx] * DEG, baseElbow: pose.elbow * DEG, side });
  }

  /* --- merge: one mesh per material inside each node update() animates ------ */
  const sways = spec.pose === 'spar' || spec.pose === 'guard';
  torso.userData.animated = sways;                                   /* spar / guard sway the torso */
  for (const a of arms) { a.swing.userData.animated = spec.pose === 'walk' || !!pose.drivable; a.elbow.userData.animated = !!pose.drivable; }
  mergeStatic(group, body);

  /* --- bookkeeping ------------------------------------------------------------ */
  let triangles = 0;
  group.traverse(o => { if (o.isMesh) triangles += o.geometry.getAttribute('position').count / 3; });

  const phase = rng() * TAU, bobF = 0.55 + rng() * 0.25, leanF = 0.17 + rng() * 0.08, leanP = rng() * TAU;
  const baseLean = torso.rotation.x;
  const _v = new THREE.Vector3();
  /* a driven pose (practice preview) overrides the idle arm motion while set */
  const drive = { active: false, fwd: [0, 0], elbow: [0, 0], lean: 0, yaw: 0, side: 0 };
  group.userData = {
    spec, triangles, lod: spec.lod, height: m.height, hover, colour: spec.colour, id: spec.id || null,
    parts: { body, torso, head: headPivot, arms },
    update(t /*, dt */) {
      body.position.y = hover + Math.sin(t * bobF * TAU + phase) * 0.03;
      body.rotation.z = Math.sin(t * leanF * TAU + leanP) * 0.022;
      body.rotation.x = Math.sin(t * leanF * 0.7 * TAU + leanP * 1.3) * 0.014;
      if (drive.active) {
        for (let i = 0; i < 2; i++) { arms[i].swing.rotation.x = -(arms[i].baseFwd + drive.fwd[i]); arms[i].elbow.rotation.x = -(arms[i].baseElbow + drive.elbow[i]); }
        torso.rotation.x = baseLean + drive.lean; torso.rotation.y = drive.yaw; body.position.x = drive.side;
        return;
      }
      if (spec.pose === 'walk') {
        const sw = Math.sin(t * 2.6 + phase) * 0.42;
        arms[0].swing.rotation.x = -(arms[0].baseFwd + sw * 0.6) - 0.1;
        arms[1].swing.rotation.x = -(arms[1].baseFwd - sw * 0.6) - 0.1;
        body.position.y += Math.abs(Math.sin(t * 2.6 + phase)) * 0.012;
      } else if (sways) {
        const b = Math.sin(t * 3.1 + phase);
        torso.rotation.x = baseLean + b * 0.02;
        torso.rotation.y = b * 0.05;
      }
    },
    setEnergy(e) { spec.energy = clamp01(e); mats.setEnergy(spec.energy); },
    face(target) {
      const g = body.parent || group;
      g.getWorldPosition(_v);
      g.rotation.y = Math.atan2(target.x - _v.x, target.z - _v.z);
    },
    /* practice-preview drive: radians added to the pose's arm swing / elbow, torso lean / yaw, a sideways body shift; null releases */
    setDrive(d) {
      if (!d) { drive.active = false; for (const a of arms) { a.swing.rotation.x = -a.baseFwd; a.elbow.rotation.x = -a.baseElbow; } torso.rotation.x = baseLean; torso.rotation.y = 0; body.position.x = 0; return; }
      drive.active = true;
      drive.fwd = [d.fwdL || 0, d.fwdR || 0]; drive.elbow = [d.elbowL || 0, d.elbowR || 0]; drive.lean = d.lean || 0; drive.yaw = d.yaw || 0; drive.side = d.side || 0;
    }
  };
  return group;
}

/* Recolour ONE resident in place: the group keeps its identity, position,
   rotation, id and parent; its crystal is rebuilt from the same seed with the
   new player colour (facet colours are painted per vertex, so a material swap
   alone could not do it). Shared materials of other colours are never touched,
   so no other resident can change. Returns the same group. */
export function recolour(group, colour) {
  if (!group || !group.userData || !group.userData.spec) return group;
  if (!PALETTES[colour]) return group;
  const spec = Object.assign({}, group.userData.spec, { colour });
  const fresh = createResident(spec);
  const energy = group.userData.spec.energy;
  for (const child of group.children.slice()) { group.remove(child); child.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); }
  for (const child of fresh.children.slice()) group.add(child);
  group.userData = fresh.userData;
  group.userData.id = spec.id || group.userData.id;
  group.name = 'resident:' + colour;
  if (typeof energy === 'number') group.userData.setEnergy(energy);
  return group;
}

/* Swap ONE resident to a different detail tier in place. Same contract as recolour(): the group keeps
   its identity, position, rotation, id, note, role and parent, and is rebuilt from the same seed at the
   new tier, so its look, idle motion and energy all survive. The SPECIES never changes with the tier —
   only how many triangles express it. Returns the same group. */
export function setLOD(group, tier) {
  if (!group || !group.userData || !group.userData.spec) return group;
  if (LOD_TIERS.indexOf(tier) < 0 || group.userData.lod === tier) return group;
  const spec = Object.assign({}, group.userData.spec, { lod: tier });
  const fresh = createResident(spec);
  const energy = group.userData.spec.energy;
  const keep = { id: group.userData.id, note: group.userData.note, role: group.userData.role };
  for (const child of group.children.slice()) { group.remove(child); child.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); }
  for (const child of fresh.children.slice()) group.add(child);
  group.userData = fresh.userData;
  Object.assign(group.userData, keep);
  if (typeof energy === 'number') group.userData.setEnergy(energy);
  return group;
}

/* The distant-crowd IMPOSTOR: the species silhouette and nothing else — one continuous teardrop, a
   shoulder bar, a flattened square-diamond head — in ONE draw call of ≤ 60 triangles, painted in the
   resident's own colour. Same group contract as a resident (update / setEnergy / face / setDrive), so a
   caller can hold impostors and full residents in one list. */
const IMPOSTOR_CACHE = { geo: null };
function impostorGeometry() {
  if (IMPOSTOR_CACHE.geo) return IMPOSTOR_CACHE.geo;
  const pos = [];
  const ring = (y, r) => { const a = []; for (let i = 0; i < 5; i++) { const t = i / 5 * TAU; a.push([Math.cos(t) * r, y, Math.sin(t) * r * 0.8]); } return a; };
  const rings = [ring(0.0, 0.001), ring(0.30, 0.16), ring(0.62, 0.21), ring(0.92, 0.19), ring(1.12, 0.20), ring(1.30, 0.001)];
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    for (let j = 0; j < 5; j++) { const k = (j + 1) % 5; pos.push(...A[j], ...A[k], ...B[j], ...A[k], ...B[k], ...B[j]); }
  }
  const hy = 1.52, hw = 0.17, hh = 0.19, hd = 0.06;
  const P = [[0, hy + hh, 0], [hw, hy, 0], [0, hy - hh, 0], [-hw, hy, 0], [0, hy, hd], [0, hy, -hd]];
  [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [1, 0, 5], [2, 1, 5], [3, 2, 5], [0, 3, 5]].forEach(f => f.forEach(i => pos.push(...P[i])));
  const sb = [[-0.22, 1.24, -0.05], [0.22, 1.24, -0.05], [0.22, 1.34, 0.05], [-0.22, 1.34, 0.05]];
  pos.push(...sb[0], ...sb[1], ...sb[2], ...sb[0], ...sb[2], ...sb[3]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  IMPOSTOR_CACHE.geo = g;
  return g;
}
export function createImpostor(spec = {}) {
  const colour = PALETTES[spec.colour] ? spec.colour : 'blue';
  const height = spec.height > 0 ? spec.height : 1.9;
  const mats = materialsFor(colour);
  const mesh = new THREE.Mesh(impostorGeometry(), mats.body);
  const group = new THREE.Group();
  const hover = Number.isFinite(spec.hover) ? spec.hover : 0.22;
  mesh.scale.setScalar(height / 1.9); mesh.position.y = hover;
  group.add(mesh); group.name = 'impostor:' + colour;
  const _v = new THREE.Vector3();
  group.userData = {
    spec: Object.assign({}, spec, { colour, lod: 'impostor' }), lod: 'impostor', impostor: true,
    triangles: impostorGeometry().getAttribute('position').count / 3,
    height, hover, colour, id: spec.id || null,
    update(t) { mesh.position.y = hover + Math.sin(t * 0.9 + height) * 0.03; },
    setEnergy(e) { mats.setEnergy(clamp01(e)); },
    face(target) { group.getWorldPosition(_v); group.rotation.y = Math.atan2(target.x - _v.x, target.z - _v.z); },
    setDrive() {}
  };
  return group;
}

export function populate(parent, spots) {
  const out = [];
  spots.forEach((s, i) => {
    const seed = Number.isFinite(s.seed) ? s.seed : i + 1;
    const id = s.id || ('resident-' + (i + 1));
    const r = createResident({ colour: s.colour, physique: s.physique, sex: s.sex, pose: s.pose, seed, height: s.height, hover: s.hover, lod: s.lod, id });
    r.position.set(s.x || 0, 0, s.z || 0);
    r.rotation.y = Number.isFinite(s.facing) ? s.facing : (seed * 2.399) % TAU;
    r.userData.id = id; r.userData.note = s.note || null; r.userData.role = s.role || 'resident';
    parent.add(r);
    out.push(r);
  });
  return out;
}
