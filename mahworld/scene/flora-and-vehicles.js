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
   - VEHICLES: compact, load-bearing, purposeful craft derived from the
     square-diamond language: a softened (chamfered) rhombus hull with a heavy
     platinum belt, a forward cabin, one energy seam around the belt, a nose
     seam running down the prow, a tail bar and a lit underside plate. +Z is
     forward. They ride a closed sky route tangent to the path with a little
     banking.
   - Colour: stems, leaves, seams and undersides take the ENVIRONMENT energy
     colour of the viewing player's world theme ({ energy, energyLight }); the
     canonical theme is blue-white. No yellow or amber anywhere in this file.
   - Time of day: setTime({ daylight, sunElevation }) subdues every emissive
     element to ~25% by full day and restores it at night.
   - Performance: every geometry is shared; stems, halos, leaves and cores of a
     planter are four InstancedMeshes; a tree merges its trunk + branches, its
     whole canopy and its heartwood into one geometry each (3 draw calls; 325 /
     437 / 541 triangles for small / medium / large) and trees of the same size
     + seed share those geometries through a ref-counted cache, so the plaza's
     24 trees cost 24 x 3 draw calls and about 11k triangles however many
     distinct designs stand in it; materials are cached per theme. Eight
     planters plus five vehicles stay well under 6,000 triangles.
     The canopy budget was 400 in the first build and the crowns came out as
     parasols: a dozen big plates on a nearly-vertical shell normal, seen
     edge-on from eye level. Mass needs COUNT, so the plate count roughly
     doubled and each plate shrank. 541 triangles against a ~150k scene is the
     right side of that trade for the only vegetation the camera gets near.
   - THE THEME IS ENERGY ONLY. Stems, leaves, cores, seams, undersides and the
     heartwood take the world energy colour. Bark, canopy, planter rim, planter
     body and planter void are NATURE AND STRUCTURE: fixed values that no
     Theme may repaint. setTheme() touches the emissive set and nothing else.

   Materials are SHARED per theme, so setTime() on any planter or vehicle (or
   on a route) retunes every object of that theme — call it once per frame per
   theme, not once per object. */

import * as THREE from '../vendor/three/three.module.min.js';

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
const TREE_CROWN_CORES = 3;           /* how many crown plates carry a lit core */
const GOLDEN = 2.399963229728653;     /* golden angle — an even shell from a deterministic sequence */

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
const _u = new THREE.Vector3(), _w = new THREE.Vector3(), _dir = new THREE.Vector3();
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
    /* platinum belt */
    platinum: new THREE.MeshStandardMaterial({ color: 0xaab2bb, emissive: energy, emissiveIntensity: NIGHT.platinum, roughness: 0.32, metalness: 0.5, flatShading: true }),
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
  /* nature and structure keep ONE name: they belong to no theme */
  for (const k of ['planterRim', 'planterVoid', 'bark', 'canopy']) m[k].name = 'mahplaza-' + k;
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
/* tapered prism through a chain of { p, r } nodes — trunk, branch, heartwood seam */
function appendTube(out, nodes, sides, roll) {
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
}
function finishSink(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  if (out.col) g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
  g.computeBoundingSphere();
  return g;
}

/* Rings-and-caps hull builder for the vehicles. outline: [[x, z], ...] in
   unit length; rings: [{ y, s, dz }] bottom → top; matFor(part, band, seg)
   → material index. Flat-shaded, winding forced outward from `centre`. */
function ringVerts(outline, ring) { return outline.map(([x, z]) => new THREE.Vector3(x * ring.s * (ring.sx || 1), ring.y, z * ring.s + (ring.dz || 0))); }
function hullGeometry(outline, rings, matFor, opts) {
  const o = opts || {};
  const R = rings.map(r => ringVerts(outline, r));
  const centre = o.centre || new THREE.Vector3(0, (rings[0].y + rings[rings.length - 1].y) / 2, 0);
  const buckets = new Map();
  const push = (mi, a, b, c) => {
    _v.subVectors(b, a); _v2.subVectors(c, a); _v3.crossVectors(_v, _v2);
    _v.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(centre);
    if (_v3.dot(_v) < 0) { const t = b; b = c; c = t; }
    let arr = buckets.get(mi); if (!arr) { arr = []; buckets.set(mi, arr); }
    arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const fan = (ring, mi) => {
    const cen = ring.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1 / ring.length);
    for (let i = 0; i < ring.length; i++) push(mi, cen, ring[i], ring[(i + 1) % ring.length]);
  };
  const n = outline.length;
  for (let b = 0; b < R.length - 1; b++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, mi = matFor('band', b, i);
    push(mi, R[b][i], R[b][j], R[b + 1][j]);
    push(mi, R[b][i], R[b + 1][j], R[b + 1][i]);
  }
  if (o.capBottom !== false) fan(R[0], matFor('bottom', -1, -1));
  if (o.capTop !== false && R.length > 1) fan(R[R.length - 1], matFor('top', -1, -1));
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const total = keys.reduce((s, k) => s + buckets.get(k).length, 0);
  const pos = new Float32Array(total);
  const g = new THREE.BufferGeometry();
  let off = 0;
  for (const k of keys) { const arr = buckets.get(k); pos.set(arr, off); g.addGroup(off / 3, arr.length / 3, k); off += arr.length; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* Unit vehicle (length 1, nose at +Z 0.5, tail at −0.5). Shared by every vehicle; proportions vary by scale. */
const HULL_OUTLINE = [[0.03, 0.5], [0.29, 0.03], [0.29, -0.09], [0.10, -0.5], [-0.10, -0.5], [-0.29, -0.09], [-0.29, 0.03], [-0.03, 0.5]];
const HULL_RINGS = [
  { y: -0.155, s: 0.52, dz: -0.03 },  /* bottom plate */
  { y: -0.10, s: 0.90, dz: -0.005 },  /* lower bevel */
  { y:  0.00, s: 1.00, dz: 0 },       /* belt (widest) */
  { y:  0.065, s: 0.88, dz: 0.01 },   /* upper bevel */
  { y:  0.12, s: 0.50, dz: 0.05 }     /* top deck, shifted forward */
];
const DECK_Y = 0.12, BEVEL_Y = 0.065, BOTTOM_Y = -0.155;
const CABIN_RINGS = [
  { y: -0.05, s: 0.55, dz: -0.02 },
  { y:  0.00, s: 1.00, dz: 0 },
  { y:  0.04, s: 0.84, dz: 0.01 },
  { y:  0.065, s: 0.42, dz: 0.05 }
];
const MAT = { shell: 0, platinum: 1, glass: 2 };
function vehicleGeometry() {
  if (GEO.hull) return GEO;
  GEO.hull = hullGeometry(HULL_OUTLINE, HULL_RINGS, (part, band) => (part === 'band' && (band === 1 || band === 2)) ? MAT.platinum : MAT.shell);
  GEO.cabin = hullGeometry(HULL_OUTLINE, CABIN_RINGS, (part, band, seg) => (part === 'band' && band >= 1 && (seg === 7 || seg === 0 || seg === 6)) ? MAT.glass : MAT.shell);
  GEO.beltSeam = hullGeometry(HULL_OUTLINE, [{ y: -0.007, s: 1.012, dz: 0 }, { y: 0.007, s: 1.012, dz: 0 }], () => 0, { capBottom: false, capTop: false });
  GEO.underPlate = hullGeometry(HULL_OUTLINE, [{ y: BOTTOM_Y - 0.004, s: 0.46, dz: -0.03 }], () => 0, { capTop: false, centre: new THREE.Vector3(0, 1, 0) });
  GEO.bar = new THREE.BoxGeometry(1, 1, 1);
  return GEO;
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
  trunk.push({ p: axis(1.10), r: 0 });                           /* the leader closes the tube inside the canopy */

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
      const len = canopyR * (0.46 + 0.34 * R());
      const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      /* three nodes so a branch SWEEPS — rises off the trunk, then levels out under
         the canopy — and ends at radius 0, which closes the tube with no cap */
      branches.push([
        { p: base.clone().addScaledVector(dir, -br * 0.5), r: br * 0.62 },   /* start inside the trunk */
        { p: base.clone().addScaledVector(dir, len * 0.55).addScaledVector(UP, len * 0.12), r: br * 0.34 },
        { p: base.clone().addScaledVector(dir, len).addScaledVector(UP, len * 0.10), r: 0 }
      ]);
    }
  }

  /* canopy plates on an oblate shell, distributed crown → skirt by the golden angle */
  const centre = new THREE.Vector3(lx, cy, lz);
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
    /* smaller plates than the first build (which ran to half the canopy radius, so a crown was only
       a dozen readable leaves). Smaller AND more of them is what makes a canopy read as mass. */
    plates.push({ p, n, s: canopyR * (0.30 + 0.11 * R()) * (0.86 + 0.30 * rr), roll: (R() - 0.5) * 0.9 });
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
  appendTube(wood, D.trunk, TREE_TRUNK_SIDES, 0.3);
  for (const b of D.branches) appendTube(wood, b, TREE_BRANCH_SIDES, 0.6);
  appendTube(accent, D.seam, TREE_SEAM_SIDES, 0);

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

  const leaf = leafGeometry();
  const crown = D.plates.slice().sort((a, b) => b.p.y - a.p.y).slice(0, TREE_CROWN_CORES);
  for (const pl of D.plates) {
    /* plate frame: local +Z is the plate normal, local +Y runs outward along the shell */
    _u.set(pl.p.x - D.centre.x, 0, pl.p.z - D.centre.z);
    if (_u.lengthSq() < 1e-8) _u.set(1, 0, 0);
    _u.addScaledVector(pl.n, -_u.dot(pl.n));
    if (_u.lengthSq() < 1e-8) _u.set(-pl.n.z, 0, pl.n.x);
    _u.normalize().applyAxisAngle(pl.n, pl.roll);
    _w.crossVectors(_u, pl.n).normalize();
    _m.makeBasis(_w, _u, pl.n);
    _q.setFromRotationMatrix(_m);
    _v.copy(pl.p).addScaledVector(_u, -0.5 * pl.s);              /* the plate's middle sits on the shell */
    _m.compose(_v, _q, _s.set(pl.s * 0.92, pl.s, pl.s * 0.30));
    appendGeo(canopy, leaf, _m, null, tint);
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
function strip(a, b, w, t, material, outwardHint) {
  /* thin emissive bar from a to b, standing t/2 + a hair off the surface along outwardHint */
  const dir = _v.subVectors(b, a); const len = dir.length();
  const nrm = _v2.crossVectors(new THREE.Vector3(1, 0, 0), dir).normalize();
  if (nrm.dot(outwardHint) < 0) nrm.negate();
  const mesh = new THREE.Mesh(vehicleGeometry().bar, material);
  mesh.scale.set(w, t, len);
  mesh.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(nrm, t / 2 + 0.002);
  _m.lookAt(a, b, nrm);
  mesh.quaternion.setFromRotationMatrix(_m);
  return mesh;
}

/* createVehicle({ theme, seed, length }) → Group with origin at body centre,
   +Z forward; userData { setTime(state), triangles, length } */
export function createVehicle(opts) {
  const o = opts || {};
  const mats = themeMaterials(o.theme);
  const R = rng(o.seed == null ? 'vehicle' : o.seed);
  const G = vehicleGeometry();
  const L = Number.isFinite(o.length) ? Math.min(6, Math.max(3, o.length)) : lerp(3.4, 5.6, R());
  const wVar = lerp(0.92, 1.08, R()), hVar = lerp(0.92, 1.10, R());
  const cabinScale = lerp(0.32, 0.40, R()), cabinZ = lerp(0.04, 0.09, R());

  const group = new THREE.Group();
  group.name = 'vehicle';
  const body = new THREE.Group();
  body.name = 'body';
  body.scale.set(L * wVar, L * hVar, L);
  group.add(body);
  let tris = 0;
  const add = (mesh, name) => { mesh.name = name; body.add(mesh); tris += triangles(mesh.geometry); return mesh; };

  const hullMats = [mats.shell, mats.platinum, mats.glass];
  const hull = add(new THREE.Mesh(G.hull, hullMats), 'hull');
  hull.castShadow = true;
  const cabin = add(new THREE.Mesh(G.cabin, hullMats), 'cabin');
  cabin.scale.set(cabinScale * 0.9, 0.9, cabinScale * 1.3);   /* long, low canopy sitting forward on the deck */
  cabin.position.set(0, DECK_Y + 0.05 * 0.9 - 0.006, cabinZ);

  add(new THREE.Mesh(G.beltSeam, mats.seam), 'belt-seam');
  add(new THREE.Mesh(G.underPlate, mats.underside), 'underside');

  /* nose seam: two short bars down the prow flat, deck edge → belt */
  const deckNose = new THREE.Vector3(0, DECK_Y, 0.5 * 0.5 + 0.05);
  const bevelNose = new THREE.Vector3(0, BEVEL_Y, 0.5 * 0.88 + 0.01);
  const beltNose = new THREE.Vector3(0, 0, 0.5);
  const out = new THREE.Vector3(0, 0.4, 1);
  add(strip(deckNose, bevelNose, 0.014, 0.008, mats.seam, out), 'nose-seam-upper');
  add(strip(bevelNose, beltNose, 0.014, 0.008, mats.seam, out), 'nose-seam-lower');

  /* prow light: a small bright square-diamond at the very nose */
  const prow = add(new THREE.Mesh(leafGeometry(), mats.stem), 'prow-light');
  prow.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0, 0, 1));
  prow.position.set(0, 0, 0.478);
  prow.scale.set(0.075, 0.09, 0.14);   /* width, length (along +Z), thickness */

  /* tail bar: a wide seam across the blunt stern */
  const tail = add(new THREE.Mesh(G.bar, mats.seam), 'tail-bar');
  tail.scale.set(0.17, 0.014, 0.012);
  tail.position.set(0, 0, -0.504);

  group.userData = {
    kind: 'vehicle', length: L, theme: mats.theme.name, triangles: tris,
    setTime(state) { return mats.setTime(state); }
  };
  return group;
}

/* createVehicleRoute(points, { theme, count (3..5), speed (m/s, default 9), seeds, length, bank })
   points: closed CatmullRom loop in the sky (THREE.Vector3[] or {x,y,z}[])
   → { group, curve, vehicles, update(tSeconds), setTime(state), triangles } */
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

  return {
    group, curve, vehicles, length, speed, count,
    update,
    setTime(state) { return mats.setTime(state); },
    setTheme(theme) { return mats.setTheme(theme); },
    triangles: tris
  };
}
