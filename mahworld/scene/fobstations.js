/* MAHWORLD :: FOB STATIONS — the FOBLOCK family, placed in the world
   ============================================================================================

   foblock.js is the GENOME: it hands out parts and builds nothing. This module is the first
   consumer, and it exists so the genome stops being dead code. It places the scale ladder §4
   defines — STANDARD stations a MAHBEING walks up to, an ARCHITECTURAL module, one rare MEGA
   landmark — plus the MUSIC SQUARE-DIAMONDS §4 calls "physical sound-linked infrastructure".

   ---- WHY THE MEDALLION CARRIES fobMark() AND NOT A NEW DIAMOND ------------------------------
   The reference object's face is a circular engraved recess holding the FOB SYSTEMS mark. §0 and
   §10 both say the canonical branding ALREADY IN SOURCE is what a MAH-marked surface wears, and
   materials.js already owns fobMark() — the real MAHFITT mark rebuilt from measured proportions.
   So the recess is the genome's, and what sits in it is the canonical asset rather than a
   lookalike. Approximating a mark that exists in source is the one thing §10 rules out.

   ---- PLACEMENT IS TESTED, NOT ASSERTED ------------------------------------------------------
   Every candidate is checked against ctx.colliders — the boxes ground.js and plaza-dressing.js
   already push for their benches, planters, bollards and stairs — and any station whose footprint
   overlaps one is SKIPPED and counted. This module runs last in the assembly precisely so that
   list is complete. A station that silently intersects a bench is the kind of defect that only
   shows up in a render three rounds later, and the test costs nothing.

   The two large pieces stand in the REAR hemisphere (+z), which the 180-degree spin proof showed
   was empty ground before the v10 pass gave it mountains. That is deliberate on two counts: §8
   says do not fill all empty space with towers, and a rare landmark is worth more where the eye
   currently finds nothing than crowded into a skyline that already reads.

   ---- LAWS ------------------------------------------------------------------------------------
   LAW 1: the genome hands back a `cap` bucket containing every up/down-facing triangle, split by
   measured normal. Those wear platinumMidLit (metalness 0.40). The `shell` bucket is the vertical
   and near-vertical surface and is the only thing here allowed a mirror grade.

   LAW 2: every MAHGIC band placed here is ANSWERED on the deck through ctx.lightPool(), which
   ground.js exposes for exactly this — the module that owns an emitter answers it on the surface
   that shows it. No emitter is added without its pool.

   Cost: parts are merged BY ROLE across all four plaza stations, so four stations cost the same
   draw calls as one. The two large pieces keep their own meshes because merging a 58 m landmark
   at 338 m into the same buffer as a 2.2 m station on the deck would hand the frustum culler one
   bounding box the size of the district.

   No addons; three r185 core only; procedural; deterministic (no Math.random, no Date.now). */

import * as THREE from '../vendor/three/three.module.min.js';
import { foblockParts, musicDiamondParts, countTriangles } from './foblock.js';
import { fobMark } from './materials.js';

const DECK_Y = 0.17;          /* ground.js FLOOR_TOP — anything on the plaza stands here */
const HERO_R = 28, FIELD_R = 43;

/* Bearing convention shared with sky-layout.js: dir(b) = (sin b, 0, -cos b). */
const at = (deg, r) => { const b = deg * Math.PI / 180; return [Math.sin(b) * r, -Math.cos(b) * r]; };

/* THE PLAZA STATIONS. Four, on the diagonals — the three facility approaches run out along -z
   (MAH MATCH), -x (MAH GYM) and +x (MAH MARKET), so the diagonals are the bearings that do not
   stand in anybody's way. r = 33 puts them between the hero field (28) and the satin field edge
   (43): off the polished centre, inside the aprons. */
const STATIONS = [
  { deg: 40, r: 33 }, { deg: 140, r: 33 }, { deg: 220, r: 33 }, { deg: 320, r: 33 }
];

/* FACING THE CENTRE, derived rather than tabulated — the first cut of this file tabulated it as
   deg + 180 and that is simply wrong. A station sits at p = (sin d, -cos d); the direction back to
   the plaza centre is -p = (-sin d, +cos d); a Y-rotation ry points local +Z at (sin ry, cos ry).
   Matching those gives sin ry = -sin d and cos ry = +cos d, so ry = -d. deg + 180 would have
   given (-sin d, -cos d), which is neither toward the centre nor away from it — it is a mirror,
   and all four medallions would have faced off across the deck at a diagonal. */
const faceCentre = deg => -deg * Math.PI / 180;

/* THE MUSIC SQUARE-DIAMONDS. Three, further out and higher, so they read against the sky rather
   than against the deck. Mounted on slender masts: §4 calls them infrastructure, and
   infrastructure stands on something. */
const MUSIC = [
  { deg: 75, r: 39.5, h: 6.2, size: 2.1 },
  { deg: 185, r: 40.5, h: 5.4, size: 1.8 },
  { deg: 295, r: 39.0, h: 6.8, size: 2.3 }
];

/* THE TWO LARGE PIECES, both in the rear hemisphere. */
const HUB = { x: -58, z: 96, tier: 'architectural', rot: -0.42 };
const MEGA = { x: -215, z: 262, tier: 'mega', rot: 0.30 };

/* ---------------------------------------------------------------- merge (no addons) */

/* Concatenate position+normal into one non-indexed buffer. three's BufferGeometryUtils is an
   ADDON and does not exist in this project, so every module here hand-rolls this; the only
   wrinkle is that TorusGeometry arrives INDEXED and has to be expanded first. */
function mergeGeos(list) {
  const flat = [];
  for (const g0 of list) {
    const g = g0.getIndex() ? g0.toNonIndexed() : g0;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    flat.push(g);
  }
  let n = 0;
  for (const g of flat) n += g.getAttribute('position').count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of flat) {
    const p = g.getAttribute('position'), q = g.getAttribute('normal');
    pos.set(p.array.subarray(0, p.count * 3), o * 3);
    nor.set(q.array.subarray(0, q.count * 3), o * 3);
    o += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

const place = (g, x, y, z, ry) => {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0)),
    new THREE.Vector3(1, 1, 1));
  return g.clone().applyMatrix4(m);
};

/* ---------------------------------------------------------------- build */

export function buildFobstations(ctx) {
  const { M, scene, reflect } = ctx;
  const group = new THREE.Group(); group.name = 'fobstations';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { stations: 0, music: 0, large: 0, skipped: [], draws: 0, triangles: 0, pools: 0 };

  /* collider boxes, computed once. ctx.colliders holds invisible Meshes. */
  const boxes = (ctx.colliders || []).map(c => { c.updateMatrixWorld(true); return new THREE.Box3().setFromObject(c); });
  const clear = (x, z, r, y = DECK_Y, h = 3) => {
    const b = new THREE.Box3(new THREE.Vector3(x - r, y - 0.2, z - r), new THREE.Vector3(x + r, y + h, z + r));
    for (const o of boxes) if (o.intersectsBox(b)) return false;
    return true;
  };

  /* ---- material roles. LAW 1: `cap` is every up/down face and takes a LOW-metalness grade. */
  const MAT = {
    shell: M.chromeSatin || M.platinum,
    cap: M.platinumMidLit || M.platinumLit,        /* horizontal — must not be a mirror grade */
    dark: M.graphiteDark || M.graphite,
    rim: M.trim || M.chromeMirror || M.platinum,
    ring: M.chromeMirror || M.chromeSatin,
    diamond: M.energyLight || M.energy,
    energy: M.energySoft || M.energy
  };

  /* ---- the four plaza stations, merged by role ------------------------------------------- */
  const bucket = { shell: [], cap: [], dark: [], rim: [], ring: [], diamond: [], energy: [] };
  const plinth = [];
  const ph = 0.34;                                   /* plinth height */

  /* THE FOOTPRINT IS MEASURED, NOT GUESSED. The first cut of this file tested a magic 2.6 m
     radius and rejected all four stations; a sweep then showed every one of them clear at 2.1.
     The block's real horizontal half-extent is 1.86 m (the rings, not the body, set it), so 2.6
     was testing for ELBOW ROOM while calling itself an intersection test — and on a plaza where
     furniture legitimately stands close together those are very different questions. The radius
     now comes from the geometry itself plus a small margin, so it stays true if the genome's
     proportions are ever retuned. */
  const proto = foblockParts({ tier: 'standard', diamond: false, energy: true });
  const pbox = new THREE.Box3();
  for (const k of Object.keys(proto)) for (const g of proto[k]) { g.computeBoundingBox(); pbox.union(g.boundingBox); }
  const footprint = Math.max(
    Math.abs(pbox.min.x), Math.abs(pbox.max.x), Math.abs(pbox.min.z), Math.abs(pbox.max.z)) + 0.18;
  stats.footprint = +footprint.toFixed(3);

  for (const s of STATIONS) {
    const [x, z] = at(s.deg, s.r);
    if (!clear(x, z, footprint)) { stats.skipped.push('station@' + s.deg); continue; }
    const ry = faceCentre(s.deg);
    /* THE BLOCK ITSELF. `proto` is built once outside the loop and place() clones per station, so
       four stations share one genome evaluation. (This line was briefly lost in an edit and the
       render caught it immediately: four plinths stood on the deck with nothing on them, while
       stats still reported "stations: 4" because the counter below had run. A count is not a
       geometry — only the render knows.) */
    for (const k of Object.keys(bucket)) for (const g of proto[k]) bucket[k].push(place(g, x, DECK_Y + ph, z, ry));
    /* plinth: a shallow rounded pad. platinumMidLit — it is a horizontal top (LAW 1). */
    const pg = new THREE.CylinderGeometry(1.72, 1.86, ph, 16, 1);
    plinth.push(place(pg, x, DECK_Y + ph / 2, z, ry));
    /* THE CANONICAL MARK in the medallion recess (see the header note). */
    const mk = fobMark(0.62, 0.03);
    const d = 2.2 * 0.86;
    bucket.diamond.push(place(mk, x + Math.sin(ry) * (d * 0.5 * 0.96), DECK_Y + ph + 2.2 * 1.02 * 0.5, z + Math.cos(ry) * (d * 0.5 * 0.96), ry));
    /* LAW 2: the waist band is answered on the deck it stands on. */
    if (ctx.lightPool) { ctx.lightPool({ x, z, rx: 7.4, rz: 7.4, k: 0.42 }); stats.pools++; }
    stats.stations++;
  }
  for (const k of Object.keys(bucket)) {
    if (!bucket[k].length) continue;
    const mesh = new THREE.Mesh(own(mergeGeos(bucket[k])), MAT[k]);
    mesh.name = 'fobstation-' + k;
    if (k !== 'energy') { mesh.castShadow = true; mesh.receiveShadow = true; }
    group.add(mesh);
    if (reflect && k !== 'cap') { try { reflect(mesh); } catch (e) {} }
  }
  if (plinth.length) {
    const mesh = new THREE.Mesh(own(mergeGeos(plinth)), MAT.cap);
    mesh.name = 'fobstation-plinths'; mesh.receiveShadow = true; group.add(mesh);
  }

  /* ---- the music square-diamonds ---------------------------------------------------------- */
  const mastG = [], frameG = [], coreG = [], mdDark = [];
  const cores = [];
  for (const m of MUSIC) {
    const [x, z] = at(m.deg, m.r);
    if (!clear(x, z, 1.2, DECK_Y, m.h + 2)) { stats.skipped.push('music@' + m.deg); continue; }
    const ry = faceCentre(m.deg);
    const mast = new THREE.CylinderGeometry(0.085, 0.16, m.h, 10, 1);
    mastG.push(place(mast, x, DECK_Y + m.h / 2, z, 0));
    const p = musicDiamondParts({ size: m.size, energy: true });
    for (const g of p.shell) frameG.push(place(g, x, DECK_Y + m.h + m.size * 0.55, z, ry));
    for (const g of p.dark) mdDark.push(place(g, x, DECK_Y + m.h + m.size * 0.55, z, ry));
    for (const g of p.energy) {
      const gg = place(g, x, DECK_Y + m.h + m.size * 0.55, z, ry);
      coreG.push(gg);
      cores.push({ x, z, y: DECK_Y + m.h + m.size * 0.55 });
    }
    /* LAW 2 again: a sound-linked core throws light, so the deck under it carries a pool. */
    if (ctx.lightPool) { ctx.lightPool({ x, z, rx: 6.0, rz: 6.0, k: 0.30 }); stats.pools++; }
    stats.music++;
  }
  if (mastG.length) { const o = new THREE.Mesh(own(mergeGeos(mastG)), MAT.shell); o.name = 'fobmusic-masts'; o.castShadow = true; group.add(o); }
  if (frameG.length) { const o = new THREE.Mesh(own(mergeGeos(frameG)), MAT.rim); o.name = 'fobmusic-frames'; o.castShadow = true; group.add(o); if (reflect) { try { reflect(o); } catch (e) {} } }
  if (mdDark.length) { const o = new THREE.Mesh(own(mergeGeos(mdDark)), M.crystalGlass || MAT.dark); o.name = 'fobmusic-crystal'; group.add(o); }
  let coreMesh = null;
  if (coreG.length) { coreMesh = new THREE.Mesh(own(mergeGeos(coreG)), MAT.diamond); coreMesh.name = 'fobmusic-cores'; group.add(coreMesh); if (reflect) { try { reflect(coreMesh); } catch (e) {} } }

  /* ---- the two large pieces, each its own mesh set (culling) ------------------------------- */
  /* AERIAL PERSPECTIVE, because this world has already shipped its inverse twice. A polished
     metal at 338 m lit only by scene.environment comes back BRIGHTER than the mountains behind
     it, and the first render of these two pieces did exactly that: the MEGA out-valued a range
     at 900 m. v10 fixed the same defect on the city's megatalls by making distance buy VALUE
     rather than darkness, and the same law applies here. envMapIntensity falls and the base
     colour climbs toward the horizon key with range, so the far piece sits BACK.

     Materials are cloned per piece rather than shared, because the two stand 226 m apart and one
     grade cannot be right at both distances. They are registered as owned so dispose() frees them. */
  const RECEDE = [
    { d: 0, env: 1.00, tint: null },
    { d: 260, env: 0.62, tint: 0x64789c },
    { d: 420, env: 0.44, tint: 0x7f92b4 }
  ];
  const recedeFor = dist => {
    let a = RECEDE[0];
    for (const r of RECEDE) if (dist >= r.d) a = r;
    return a;
  };
  const gradeCache = new Map();
  const gradeFor = (base, dist, key) => {
    const r = recedeFor(dist);
    if (!r.tint) return base;
    const ck = key + '@' + r.d;
    if (gradeCache.has(ck)) return gradeCache.get(ck);
    const m2 = base.clone();
    m2.envMapIntensity = (base.envMapIntensity !== undefined ? base.envMapIntensity : 1) * r.env;
    if (m2.color) m2.color.lerp(new THREE.Color(r.tint), 0.55);
    m2.name = (base.name || key) + '-far' + r.d;
    owned.materials.push(m2);
    gradeCache.set(ck, m2);
    return m2;
  };

  for (const spec of [HUB, MEGA]) {
    const parts = foblockParts({ tier: spec.tier, diamond: true, energy: false });
    const dist = Math.hypot(spec.x, spec.z);
    let any = false;
    for (const k of Object.keys(parts)) {
      if (!parts[k].length) continue;
      const geos = parts[k].map(g => place(g, spec.x, 0, spec.z, spec.rot));
      const mesh = new THREE.Mesh(own(mergeGeos(geos)), gradeFor(MAT[k], dist, k));
      mesh.name = 'foblock-' + spec.tier + '-' + k;
      if (k !== 'energy') { mesh.castShadow = true; mesh.receiveShadow = true; }
      group.add(mesh); any = true;
    }
    /* GROUND CONTACT. Without it both pieces read as hovering — the ground out here is dark, the
       block is bright, and nothing ties them together. A wide shallow apron in the dark grade
       gives the base an edge to sit on and a shadow to cast onto, which is what "standing" is
       made of at this distance. It is a flat horizontal top, so it takes a LOW-metalness grade
       (LAW 1) exactly as the plinths on the deck do. */
    const w = spec.tier === 'mega' ? 58 : 12;
    const apron = new THREE.CylinderGeometry(w * 0.86, w * 0.94, w * 0.055, 20, 1);
    const am = new THREE.Mesh(own(place(apron, spec.x, w * 0.0275, spec.z, spec.rot)),
      gradeFor(MAT.cap, dist, 'apron'));
    am.name = 'foblock-' + spec.tier + '-apron'; am.receiveShadow = true;
    group.add(am);
    if (any) stats.large++;
  }

  /* ---- measure, honestly ------------------------------------------------------------------ */
  group.traverse(o => {
    if (!o.isMesh) return;
    stats.draws++;
    const g = o.geometry, idx = g.getIndex();
    stats.triangles += idx ? idx.count / 3 : g.getAttribute('position').count / 3;
  });

  scene.add(group);

  /* ---- the contract ----------------------------------------------------------------------- */
  const t0 = { v: 0 };
  return {
    group, stats,
    setTime(clockState) {
      /* the cores follow the clock the way every other emissive in this world does: brighter at
         night, stepped back under daylight. Nothing here changes a hue. */
      const night = 1 - (clockState && typeof clockState.daylight === 'number' ? clockState.daylight : 0);
      if (coreMesh && coreMesh.material && coreMesh.material.emissiveIntensity !== undefined) {
        coreMesh.material.emissiveIntensity = 0.6 + 1.4 * night;
      }
    },
    setTheme() { /* the shared materials carry the Theme; nothing local to repaint */ },
    update(t) {
      /* §4: "restrained pulse". One sine, no allocation, and it never reaches zero — a music
         diamond that blinks reads as a warning light, not as infrastructure. */
      if (!coreMesh) return;
      t0.v = 0.82 + 0.18 * Math.sin(t * 1.15);
      coreMesh.scale.setScalar(t0.v);
    },
    setQuality(q) {
      const low = q && (q.name === 'low' || q === 'low');
      group.traverse(o => { if (o.isMesh && /rings|fobmusic-crystal/.test(o.name)) o.visible = !low; });
    },
    dispose() {
      owned.geometries.forEach(g => g.dispose());
      owned.materials.forEach(m => m.dispose());
      if (group.parent) group.parent.remove(group);
    }
  };
}

export default { buildFobstations };
