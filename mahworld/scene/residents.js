/* MAHWORLD :: RESIDENTS — the crystalline people of MAHPLAZA.

   Species law (art direction, hard requirements):
   - Head: a beveled, flattened square-diamond slab — never a sphere.  Dark
     front/back panels and one small bright diamond plate suggest a face.
   - Everything is low-poly and flat shaded; every mesh carries per-facet
     vertex colour so ONE shared material per colour still reads as a cut
     crystal: dark structural planes, coloured mid facets, pale platinum catches.
   - Humanoid upper body (shoulder caps, chest block, waist, two arms with a
     faceted hand wedge).  NO legs, feet or knees: below the waist there is ONE
     continuous faceted teardrop that tapers to a single terminal point which
     hangs `hover` metres above the ground.  The whole body floats.
   - `physique` 0..1 blends untrained → hero; `sex` 'm' | 'f' picks the base.
   - One coherent colour per resident, chosen by its player; no yellow anywhere.

   Group origin = the ground point under the terminal tip (y = 0 is the ground);
   local +Z is the resident's front.  Materials are cached per colour and shared
   by every resident of that colour, so `setEnergy` (night glow) acts on the
   colour family: call it on every resident with the world's night value each
   frame — it is a no-op when the value is unchanged. */

import * as THREE from '../vendor/three/three.module.min.js';

export const COLOURS = ['blue', 'purple', 'violet', 'green', 'emerald', 'teal', 'red', 'crimson', 'platinum'];

const PALETTES = Object.freeze({
  blue:     { base: 0x2f6fe6, dark: 0x0a1732, light: 0xd2e4ff },
  purple:   { base: 0x9b3fd6, dark: 0x220b3a, light: 0xeed8ff },
  violet:   { base: 0x6e5cf0, dark: 0x160f3a, light: 0xdcd6ff },
  green:    { base: 0x3fc26a, dark: 0x0a2617, light: 0xd8ffe4 },
  emerald:  { base: 0x14a070, dark: 0x06261e, light: 0xccfff0 },
  teal:     { base: 0x2bb5b8, dark: 0x08262a, light: 0xd4fbff },
  red:      { base: 0xe0453f, dark: 0x36090d, light: 0xffdcd8 },
  crimson:  { base: 0xb3173c, dark: 0x2c0510, light: 0xffd2dc },
  platinum: { base: 0xc6d2e0, dark: 0x27303d, light: 0xf4f8fc }
});

export function residentPalette(name) {
  const p = PALETTES[name] || PALETTES.blue;
  return { base: p.base, dark: p.dark, light: p.light };
}

/* ------------------------------------------------------------------ utils */
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
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
   mid facets and a few platinum catches while staying ONE colour. */
function painter(rng, cols, tier) {
  const { base, dark, light } = cols;
  return function (ny) {
    const r = rng();
    if (tier === 'dark') {
      if (r < 0.11) _c.copy(dark).lerp(base, 0.55);
      else if (r < 0.19) _c.copy(dark).lerp(light, 0.32);
      else _c.copy(dark).multiplyScalar(0.75 + 0.5 * rng());
    } else {
      if (r < 0.14) _c.copy(base).lerp(dark, 0.62 + 0.2 * rng());
      else if (r < 0.26) _c.copy(base).lerp(light, 0.45 + 0.35 * rng());
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
   3 draws for a still resident, 5 for spar, 7 for walk. */
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
    hipY: 0.78, waistY: 1.08, chestBotY: 1.22, chestY: 1.40, shoulderY: 1.54, neckTop: 1.60,
    upperLen: 0.36, foreLen: 0.31,
    abduct: L(7, 10) * DEG
  };
  if (seated) { m.hipRx *= 1.18; m.hipRz *= 1.12; m.taperQ *= 0.85; }
  const dropScale = seated ? 0.62 : 1, shift = m.hipY * (dropScale - 1);
  m.hipY *= dropScale;
  for (const k of ['waistY', 'chestBotY', 'chestY', 'shoulderY', 'neckTop']) m[k] += shift;
  m.headC = 2.0 + shift - m.headH;
  for (const k in m) if (k !== 'taperQ' && k !== 'bicep' && k !== 'abduct') m[k] *= s;
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

  const rng = mulberry(Math.floor(spec.seed * 7919) + 17);
  const mats = materialsFor(spec.colour);
  const m = measures(spec, rng);
  const pose = POSES[spec.pose];
  const SEG = 10, s = m.scale;
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
  {
    const g = plateGeom(0.045 * s, 0.06 * s, paintLight);
    g.translate(0, T(m.chestY) - 0.02 * s, m.chestRz + m.bustZ + 0.012 * s);
    const pl = new THREE.Mesh(g, mats.light); pl.name = 'emblem'; torso.add(pl);
  }
  /* --- neck ----------------------------------------------------------------- */
  {
    const P = new Poly();
    lathe(P, [{ y: T(m.shoulderY) - 0.02 * s, rx: m.neckR, rz: m.neckR }, { y: T(m.neckTop), rx: m.neckR * 0.92, rz: m.neckR * 0.92 }, { y: T(m.neckTop) + 0.003, rx: 0, rz: 0 }], 6, paintDark, { twist: false, phase: 0.5 });
    torso.add(meshOf(P, mats.dark, 'neck'));
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
    /* one small bright plate on the face */
    const plG = plateGeom(w * 0.16, h * 0.16, paintLight);
    plG.translate(0, hc - h * 0.12, d / 2 + 0.006 * s);
    const plM = new THREE.Mesh(plG, mats.light); plM.name = 'facePlate'; headPivot.add(plM);
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
      lathe(P, [{ y: -L - 0.002, rx: 0, rz: 0 }, { y: -L, rx: r1, rz: r1 }, { y: -L * 0.58, rx: r0 * m.bicep, rz: r0 * m.bicep * 0.95 }, { y: -L * 0.2, rx: r0, rz: r0 }, { y: 0.01, rx: r0 * 0.9, rz: r0 * 0.9 }], 6, paintBody);
      swing.add(meshOf(P, mats.body, 'upperArm'));
    }
    const elbow = new THREE.Group(); elbow.position.y = -m.upperLen; swing.add(elbow);
    elbow.rotation.x = -pose.elbow * DEG;
    {
      const P = new Poly(), R = m.upperR * 0.98;
      lathe(P, [{ y: -R, rx: 0, rz: 0 }, { y: -R * 0.4, rx: R, rz: R }, { y: R * 0.4, rx: R, rz: R }, { y: R, rx: 0, rz: 0 }], 6, paintDark, { twist: false, phase: 0.5 });
      elbow.add(meshOf(P, mats.dark, 'elbow'));
    }
    {
      const P = new Poly(), r0 = m.foreR * 1.08, r1 = m.foreR * 0.72, L = m.foreLen;
      lathe(P, [{ y: -L - 0.002, rx: 0, rz: 0 }, { y: -L, rx: r1, rz: r1 }, { y: -L * 0.55, rx: r0 * 0.95, rz: r0 * 0.95 }, { y: -0.01, rx: r0, rz: r0 }], 6, paintBody);
      elbow.add(meshOf(P, mats.body, 'forearm'));
    }
    /* hand: a simplified faceted wedge, flat sides facing front/back */
    {
      const P = new Poly(), Lh = m.handLen, w = m.handW, dd = m.handD, y0 = -m.foreLen;
      lathe(P, [{ y: y0 - Lh, rx: 0, rz: 0 }, { y: y0 - Lh * 0.62, rx: w, rz: dd }, { y: y0 - Lh * 0.25, rx: w * 0.92, rz: dd * 0.95 }, { y: y0 + 0.015, rx: 0, rz: 0 }], 4, paintDark, { twist: false, phase: 0.5 });
      elbow.add(meshOf(P, mats.dark, 'hand'));
    }
    arms.push({ shoulder, swing, elbow, baseFwd: pose.fwd[idx] * DEG, side });
  }

  /* --- merge: one mesh per material inside each node update() animates ------ */
  torso.userData.animated = spec.pose === 'spar';           /* spar sways the torso */
  for (const a of arms) a.swing.userData.animated = spec.pose === 'walk';   /* walk swings the arms */
  mergeStatic(group, body);

  /* --- bookkeeping ------------------------------------------------------------ */
  let triangles = 0;
  group.traverse(o => { if (o.isMesh) triangles += o.geometry.getAttribute('position').count / 3; });

  const phase = rng() * TAU, bobF = 0.55 + rng() * 0.25, leanF = 0.17 + rng() * 0.08, leanP = rng() * TAU;
  const baseLean = torso.rotation.x;
  const _v = new THREE.Vector3();
  group.userData = {
    spec, triangles, height: m.height, hover,
    update(t /*, dt */) {
      body.position.y = hover + Math.sin(t * bobF * TAU + phase) * 0.03;
      body.rotation.z = Math.sin(t * leanF * TAU + leanP) * 0.022;
      body.rotation.x = Math.sin(t * leanF * 0.7 * TAU + leanP * 1.3) * 0.014;
      if (spec.pose === 'walk') {
        const sw = Math.sin(t * 2.6 + phase) * 0.42;
        arms[0].swing.rotation.x = -(arms[0].baseFwd + sw * 0.6) - 0.1;
        arms[1].swing.rotation.x = -(arms[1].baseFwd - sw * 0.6) - 0.1;
        body.position.y += Math.abs(Math.sin(t * 2.6 + phase)) * 0.012;
      } else if (spec.pose === 'spar') {
        const b = Math.sin(t * 3.1 + phase);
        torso.rotation.x = baseLean + b * 0.02;
        torso.rotation.y = b * 0.05;
      }
    },
    setEnergy(e) { spec.energy = clamp01(e); mats.setEnergy(spec.energy); },
    face(target) {
      group.getWorldPosition(_v);
      group.rotation.y = Math.atan2(target.x - _v.x, target.z - _v.z);
    }
  };
  return group;
}

export function populate(parent, spots) {
  const out = [];
  spots.forEach((s, i) => {
    const seed = Number.isFinite(s.seed) ? s.seed : i + 1;
    const r = createResident({ colour: s.colour, physique: s.physique, sex: s.sex, pose: s.pose, seed, height: s.height, hover: s.hover });
    r.position.set(s.x || 0, 0, s.z || 0);
    r.rotation.y = Number.isFinite(s.facing) ? s.facing : (seed * 2.399) % TAU;
    parent.add(r);
    out.push(r);
  });
  return out;
}
