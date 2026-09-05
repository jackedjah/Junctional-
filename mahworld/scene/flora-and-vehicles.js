/* MAHWORLD :: MAHPLAZA FLORA AND VEHICLES — diamond vegetation planters and
   square-diamond sky craft, one ES module, no dependencies beyond three.

   Art law (brief "MAHPLAZA landscape / portrait concept"):
   - DIAMOND VEGETATION: a graphite planter (chamfered box or faceted low
     cylinder) → a few thin luminous stems that rise like controlled blue-white
     lasers with a slight outward lean → each stem ends in a SQUARE-DIAMOND
     crystalline leaf (a flattened octahedron with a bright inner core). Some
     stems fork once. Sparse and calm: 3–9 leaves per planter, never a bouquet.
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
     planter are four InstancedMeshes; materials are cached per theme. Eight
     planters plus five vehicles stay well under 6,000 triangles.

   Materials are SHARED per theme, so setTime() on any planter or vehicle (or
   on a route) retunes every object of that theme — call it once per frame per
   theme, not once per object. */

import * as THREE from '../vendor/three/three.module.min.js';

export const CANONICAL_THEME = Object.freeze({ energy: 0x7fc6ff, energyLight: 0xdff1ff, name: 'canonical' });

export const PLANTER_SIZES = Object.freeze({
  /* r: half-width (box) or radius (round) of the base; h: base height;
     stem: min/max stem height (m); leaf: min/max leaf height (m);
     stems: min/max primary stems; leaves: hard cap on leaves per planter */
  small:  { r: 0.34, h: 0.42, stem: [1.2, 1.7], leaf: [0.22, 0.32], stems: [3, 4], leaves: 5 },
  medium: { r: 0.48, h: 0.54, stem: [1.5, 2.4], leaf: [0.28, 0.40], stems: [3, 5], leaves: 7 },
  large:  { r: 0.64, h: 0.68, stem: [2.0, 3.2], leaf: [0.34, 0.45], stems: [4, 6], leaves: 9 }
});

/* Night-time emissive levels; day multiplies them by DAY_FACTOR. */
const NIGHT = Object.freeze({ stem: 1.9, halo: 0.34, leaf: 0.9, seam: 2.2, underside: 1.7, glass: 0.22, shell: 0.06, platinum: 0.04 });
const DAY_FACTOR = 0.25;

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _s = new THREE.Vector3();

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
   { stem, leaf, seam, underside, shell, planter, halo, platinum, glass, theme, setTime, time } */
export function themeMaterials(theme) {
  const t = resolveTheme(theme);
  const key = t.energy.toString(16) + ':' + t.energyLight.toString(16);
  const hit = THEME_CACHE.get(key);
  if (hit) return hit;
  const energy = new THREE.Color(t.energy), light = new THREE.Color(t.energyLight);
  const m = {
    theme: t, key,
    /* graphite planter body */
    planter: new THREE.MeshStandardMaterial({ color: 0x1b1e25, roughness: 0.62, metalness: 0.28, flatShading: true }),
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
      m.time = { daylight, sunElevation, factor: f };
      return m.time;
    }
  };
  for (const k of ['planter', 'stem', 'halo', 'leaf', 'seam', 'underside', 'shell', 'platinum', 'glass']) m[k].name = 'mahplaza-' + k + '-' + t.name;
  THEME_CACHE.set(key, m);
  return m;
}

/* ------------------------------------------------------ shared geometry */
const GEO = {};

function stemGeometry() {   /* unit height, base at origin, slight taper */
  if (!GEO.stem) { const g = new THREE.CylinderGeometry(0.62, 1, 1, 5, 1, true); g.translate(0, 0.5, 0); GEO.stem = g; }
  return GEO.stem;
}
function leafGeometry() {   /* square-diamond: flattened octahedron, unit height, bottom vertex at origin, plate in local XY */
  if (!GEO.leaf) { const g = new THREE.OctahedronGeometry(1, 0); g.scale(0.42, 0.5, 0.13); g.translate(0, 0.5, 0); GEO.leaf = g; }
  return GEO.leaf;
}
function discGeometry() {   /* unit disc facing +Y */
  if (!GEO.disc) { const g = new THREE.CircleGeometry(1, 10); g.rotateX(-Math.PI / 2); GEO.disc = g; }
  return GEO.disc;
}
function planterBaseGeometry(size, shape) {
  const key = 'base:' + size + ':' + shape;
  if (GEO[key]) return GEO[key];
  const S = PLANTER_SIZES[size] || PLANTER_SIZES.medium;
  const box = shape === 'box';
  const r = box ? S.r * Math.SQRT2 : S.r;      /* lathe radius reaches the corner of a box */
  const h = S.h, c = (box ? Math.SQRT2 : 1) * 0.09 * h, lip = 0.07, ri = r * 0.8;
  const profile = [
    new THREE.Vector2(r - c, 0), new THREE.Vector2(r, c), new THREE.Vector2(r, h - c), new THREE.Vector2(r - c, h),
    new THREE.Vector2(ri, h), new THREE.Vector2(ri, h - lip), new THREE.Vector2(0, h - lip)
  ];
  const g = new THREE.LatheGeometry(profile, box ? 4 : 10, box ? Math.PI / 4 : 0);
  g.computeVertexNormals();
  GEO[key] = g;
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
   → Group with origin at ground centre; userData { setTime(state), triangles, leaves, size, shape } */
export function createPlanter(opts) {
  const o = opts || {};
  const size = PLANTER_SIZES[o.size] ? o.size : 'medium';
  const shape = o.shape === 'box' ? 'box' : 'round';
  const S = PLANTER_SIZES[size];
  const mats = themeMaterials(o.theme);
  const R = rng(o.seed == null ? size + ':' + shape : o.seed);
  const group = new THREE.Group();
  group.name = 'planter-' + size + '-' + shape;

  const base = new THREE.Mesh(planterBaseGeometry(size, shape), mats.planter);
  base.name = 'base'; base.castShadow = true; base.receiveShadow = true;
  group.add(base);
  let tris = triangles(base.geometry);

  const lip = 0.07, floorY = S.h - lip;
  const ri = (shape === 'box' ? S.r * Math.SQRT2 : S.r) * 0.8;
  const disc = new THREE.Mesh(discGeometry(), mats.halo);
  disc.name = 'root-glow'; disc.position.y = floorY + 0.004; disc.scale.setScalar(ri * 0.9);
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
    setTime(state) { return mats.setTime(state); }
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
    triangles: tris
  };
}
