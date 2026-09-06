/* MAHWORLD :: TERRAIN — the natural world the city stands in (v6)

   MAHWORLD was a city with no world around it. Every ground surface was a flat
   plane, the horizon was a continuous wall of architecture, and the mountains
   sky.js appears to build have in fact NEVER rendered: `sky.js` gates them
   behind `if (ctx.cityPresent) { }` — an empty body whose comment promises to
   "keep one far ridge as a horizon backstop" and keeps none. This module builds
   the ecosystem instead of reviving that dead code.

   THE PRINCIPLE (brief §01): MAHWORLD is a civilization inside a LARGER WORLD.
   Architecture is part of an ecosystem, not the whole of it. A viewer must be
   able to see where the plaza ends, where the city continues, where the
   mountains begin, and where open land and water are.

   WHAT THIS BUILDS

   1. MOUNTAIN RANGES (§10, §11, §43) — three ranges at 700 / 1050 / 1500 m,
      rising to 780 m so they stand ABOVE the megatall crown line rather than
      behind it. Faceted rock in the world's own diamond language, but still
      reading as terrain: no neon edge, no glowing crystal spikes. They are
      concentrated in the three valleys city.js now leaves open, so towers frame
      them exactly as the brief asks — building, open valley, distant range,
      luminous sky.

      They carry their OWN aerial perspective baked into vertex colours rather
      than relying on the scene fog, because at the scene's night fog far plane
      (880 m) anything beyond about 860 m is erased entirely. Painting the
      recession by hand is also simply more controllable: the base of a range
      sits deeper and bluer, its ridges lift toward moonlit silver, and each
      range as a whole sits lighter than the one in front of it.

   2. NATURAL GROUND (§26, §41) — a land ring carrying the world from the city's
      edge out to the mountains, in stone rather than metal, so the transition
      reads plaza -> promenade -> land -> terrain rather than chrome to nothing.

   3. GREEN CORRIDORS (§26, §41) — planted belts in the valleys, between the
      city and the land: the world is not purely synthetic.

   4. THE BASIN (§12, §13) — one still body of water in the right valley,
      reading as deep dark blue that reflects the sky, the moon and the FOBEAM
      field rather than glowing on its own. It is placed where nothing else
      stands, and the regions around it stay clear so a larger water system can
      grow there later without moving anything.

   CONTRACT — the same optional-module contract as every other v4/v5 module:
   `buildTerrain(ctx)` returns { group, setTime, setTheme, update, setQuality,
   dispose, stats }. Deterministic and seeded; nothing allocates per frame;
   everything merges to a handful of draw calls. */

import * as THREE from '../vendor/three/three.module.min.js';

/* The three valleys city.js leaves open, in its polar convention (bearing degrees). Mountains and
   planting concentrate here, because these are the only bearings a viewer can see through. */
const VALLEYS = [
  { from: 52, to: 72, name: 'right' },
  { from: 108, to: 124, name: 'centre' },
  { from: 128, to: 142, name: 'left' }
];

/* Three ranges, near to far. Each is a ring arc of faceted peaks.
     r      distance from the marker
     h      peak height range — the tallest megatall crown sits at ~466 m and subtends 35 deg from
            665 m, so a range must be tall enough for its own distance to beat that or it reads as a
            low band behind the city rather than as the horizon
     base   the deep colour at the foot of the range
     ridge  the moonlit colour along its tops                                                        */
const RANGES = [
  { id: 'near', r: 700, count: 26, hMin: 240, hMax: 430, wMin: 90, wMax: 190, base: 0x161f33, ridge: 0x4a5f88, seed: 91 },
  { id: 'mid', r: 1050, count: 22, hMin: 380, hMax: 620, wMin: 150, wMax: 300, base: 0x1d2740, ridge: 0x5d739c, seed: 137 },
  { id: 'far', r: 1500, count: 18, hMin: 520, hMax: 780, wMin: 240, wMax: 430, base: 0x27324e, ridge: 0x6d82aa, seed: 211 }
];

const LAND_INNER = 600, LAND_OUTER = 1750;

/* the still basin: a wide, quiet body of water sitting in the right valley, framed by the towers at
   44 deg and 75 deg. Nothing in city.js, ground.js or buildings.js occupies this region. */
const BASIN = { bearing: 62, r: 330, rx: 210, rz: 130, y: -1.4 };

const D2R = Math.PI / 180;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function polar(aDeg, r) { const t = aDeg * D2R; return [r * Math.cos(t), -r * Math.sin(t)]; }
const lerp = (a, b, t) => a + (b - a) * t;

/* concatenate geometries into one static BufferGeometry keeping position / normal / color */
function mergeGeos(list) {
  let n = 0;
  const parts = list.map(g => { const o = g.index ? g.toNonIndexed() : g; if (!o.attributes.normal) o.computeVertexNormals(); if (o !== g) g.dispose(); n += o.attributes.position.count; return o; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) {
    const c = p.attributes.position.count;
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    if (p.attributes.color) col.set(p.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3);
    o += c; p.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/* Paint a peak's vertices: deep and blue at the foot, lifting toward moonlit silver along the ridge,
   and brighter on the faces the moon actually reaches. This is the aerial perspective AND the key
   light, both baked, because the scene's fog would otherwise erase everything past 860 m. */
function paintPeak(geo, baseCol, ridgeCol, h, moon, lift) {
  const pos = geo.attributes.position, n = pos.count;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  const col = new Float32Array(n * 3), c = new THREE.Color(), a = new THREE.Color(baseCol), b = new THREE.Color(ridgeCol);
  for (let i = 0; i < n; i++) {
    const up = Math.min(1, Math.max(0, pos.getY(i) / h));
    /* how much of the moon this face sees; the moon is low and to one side, so this separates the
       lit flank of a range from its shadowed flank and gives the whole horizon a light direction */
    const facing = Math.max(0, nor.getX(i) * moon.x + nor.getY(i) * moon.y + nor.getZ(i) * moon.z);
    c.copy(a).lerp(b, Math.pow(up, 0.72) * (0.42 + 0.58 * facing) * lift);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export function buildTerrain(ctx) {
  const M = ctx.M || {};
  const theme = ctx.theme || M.theme || { energy: 0x7fc6ff, energyLight: 0xdff1ff };
  const group = new THREE.Group(); group.name = 'terrain';
  const owned = { geometries: [], materials: [] };
  const own = g => { owned.geometries.push(g); return g; };
  const stats = { peaks: 0, ranges: RANGES.length, groves: 0, trees: 0, drawCalls: 0, triangles: 0, valleys: VALLEYS.map(v => v.name) };

  /* the moon's direction, matching sky.js's own formula closely enough to agree about which flank of
     a mountain is lit. Kept local on purpose: terrain must not depend on the sky module. */
  const moon = new THREE.Vector3(0.5 - 0.5 * 0.9, 0.3 + 0.16, -0.78).normalize();

  /* ---------------------------------------------------------------- 1. mountain ranges */
  const rockMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  rockMat.name = 'terrain-rock';
  owned.materials.push(rockMat);
  const rangeGroups = [];
  RANGES.forEach((R, ri) => {
    const rand = rng(R.seed);
    const peaks = [];
    for (let i = 0; i < R.count; i++) {
      /* Spread across the full front hemisphere, then PULL toward the open valleys: a peak the city
         hides is a peak that costs triangles for nothing, and the valleys are where the brief's
         "building, open valley, mountain, sky" composition actually happens. */
      let a = -30 + (i / (R.count - 1)) * 240 + (rand() - 0.5) * 7;
      const V = VALLEYS[i % VALLEYS.length];
      if (i % 2 === 0) a = lerp(a, V.from + rand() * (V.to - V.from), 0.62);
      const rr = R.r * (0.9 + rand() * 0.24);
      const [x, z] = polar(a, rr);
      const h = lerp(R.hMin, R.hMax, rand() * rand() + rand() * 0.3);
      const w = lerp(R.wMin, R.wMax, rand());
      /* 5–7 sided faceted cones: the world's diamond language applied to rock, but still rock —
         no neon edge, no glowing crystal spike (§43) */
      const sides = 5 + Math.floor(rand() * 3);
      const geo = new THREE.ConeGeometry(w, h, sides, 1).toNonIndexed();
      geo.computeVertexNormals();
      /* squash and tilt each peak so a range is not a row of identical cones */
      geo.scale(1, 1, 0.72 + rand() * 0.5);
      geo.rotateY(rand() * Math.PI * 2);
      geo.rotateZ((rand() - 0.5) * 0.09);
      /* ranges further away sit LIGHTER overall: the recession, painted rather than fogged */
      paintPeak(geo, R.base, R.ridge, h, moon, 0.7 + ri * 0.22);
      geo.translate(x, h / 2 - 26, z);
      peaks.push(geo);
      stats.peaks++;
    }
    const mesh = new THREE.Mesh(own(mergeGeos(peaks)), rockMat);
    mesh.name = 'terrain-range-' + R.id;
    mesh.frustumCulled = false;
    mesh.renderOrder = -8 + ri;          /* drawn behind the city, back to front */
    group.add(mesh);
    rangeGroups.push(mesh);
  });

  /* ---------------------------------------------------------------- 2. the natural land ring */
  /* Stone, not metal: this is where the built world stops. It is painted with a radial gradient so it
     sits darkest where it meets the city and lifts toward the mountains, which reads as distance. */
  const landMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  landMat.name = 'terrain-land'; owned.materials.push(landMat);
  {
    const seg = 96, rings = 5;
    const land = new THREE.RingGeometry(LAND_INNER, LAND_OUTER, seg, rings).toNonIndexed();
    const pos = land.attributes.position, n = pos.count;
    const col = new Float32Array(n * 3), c = new THREE.Color(), near = new THREE.Color(0x131b2b), far = new THREE.Color(0x222c44);
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      c.copy(near).lerp(far, Math.min(1, (r - LAND_INNER) / (LAND_OUTER - LAND_INNER)));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    land.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(own(land), landMat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = -0.12; mesh.name = 'terrain-land';
    mesh.frustumCulled = false; mesh.renderOrder = -9;
    group.add(mesh);
  }

  /* ---------------------------------------------------------------- 3. green corridors */
  /* Planted belts in the valleys, between the city's edge and the land. Kept as ONE merged mesh of
     simple faceted canopies: at 300–600 m a tree is a silhouette and a value, and spending triangles
     on anything more would be spending them where they cannot be seen (§27). */
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x24503f, roughness: 0.86, metalness: 0.0, flatShading: true, envMapIntensity: 0.7 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1b2330, roughness: 0.9, metalness: 0.05 });
  foliageMat.name = 'terrain-foliage'; trunkMat.name = 'terrain-trunk';
  owned.materials.push(foliageMat, trunkMat);
  {
    const canopy = [], trunks = [];
    const rand = rng(4242);
    VALLEYS.forEach((V, vi) => {
      const groves = 5;
      for (let gi = 0; gi < groves; gi++) {
        const a = V.from + (gi / (groves - 1)) * (V.to - V.from) + (rand() - 0.5) * 3;
        const rr = 250 + rand() * 260;
        const [gx, gz] = polar(a, rr);
        const n = 7 + Math.floor(rand() * 7);
        for (let i = 0; i < n; i++) {
          const tx = gx + (rand() - 0.5) * 90, tz = gz + (rand() - 0.5) * 90;
          const th = 9 + rand() * 13, tw = 4.5 + rand() * 5;
          const c = new THREE.ConeGeometry(tw, th, 6, 1).toNonIndexed();
          c.rotateY(rand() * 3);
          c.translate(tx, th * 0.62, tz);
          canopy.push(c);
          const t = new THREE.CylinderGeometry(0.5, 0.8, th * 0.5, 5).toNonIndexed();
          t.translate(tx, th * 0.25, tz);
          trunks.push(t);
          stats.trees++;
        }
        stats.groves++;
      }
    });
    if (canopy.length) { const m = new THREE.Mesh(own(mergeGeos(canopy)), foliageMat); m.name = 'terrain-groves'; m.frustumCulled = false; group.add(m); }
    if (trunks.length) { const m = new THREE.Mesh(own(mergeGeos(trunks)), trunkMat); m.name = 'terrain-trunks'; m.frustumCulled = false; group.add(m); }
  }

  /* ---------------------------------------------------------------- 4. the basin */
  /* Deep dark blue that REFLECTS — the sky, the moon, the FOBEAM field, the city's own glow — rather
     than glowing on its own (§13). Its high metalness and very low roughness make the environment map
     do the work, which is exactly what still water does. */
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0a1526, roughness: 0.04, metalness: 0.92, envMapIntensity: 1.9
  });
  waterMat.name = 'terrain-basin'; owned.materials.push(waterMat);
  const shoreMat = new THREE.MeshStandardMaterial({ color: 0x2a3547, roughness: 0.72, metalness: 0.2 });
  let basin = null;
  {
    const [bx, bz] = polar(BASIN.bearing, BASIN.r);
    const g = new THREE.CircleGeometry(1, 72);
    const mesh = new THREE.Mesh(own(g), waterMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(BASIN.rx, BASIN.rz, 1);
    mesh.position.set(bx, BASIN.y, bz);
    mesh.name = 'terrain-basin'; mesh.renderOrder = -7;
    group.add(mesh); basin = mesh;
    /* a low stone lip so the water sits IN the land rather than on top of it */
    const lip = new THREE.RingGeometry(1, 1.05, 72).toNonIndexed();
    const lipMesh = new THREE.Mesh(own(lip), shoreMat);
    lipMesh.rotation.x = -Math.PI / 2;
    lipMesh.scale.set(BASIN.rx, BASIN.rz, 1);
    lipMesh.position.set(bx, BASIN.y + 0.5, bz);
    lipMesh.name = 'terrain-basin-lip';
    group.add(lipMesh);
    owned.materials.push(shoreMat);
  }

  if (ctx.scene && !group.parent) ctx.scene.add(group);

  /* ---------------------------------------------------------------- contract surface */
  let daylight = 0;
  const rockBase = rangeGroups.map(() => 1);
  function setTime(state) {
    daylight = state && typeof state.daylight === 'number' ? state.daylight : daylight;
    /* the ranges lift with the daylight the way real distant terrain does — the vertex colours carry
       the night reading, and this scales the whole family toward a brighter day value */
    const k = 1 + 1.35 * daylight;
    rockMat.color.setScalar(k);
    landMat.color.setScalar(0.9 + 1.1 * daylight);
    foliageMat.color.setHex(0x24503f).multiplyScalar(0.75 + 0.85 * daylight);
    waterMat.color.setHex(0x0a1526).multiplyScalar(1 + 1.1 * daylight);
    return state;
  }
  function setTheme(t) { return t; }          /* terrain is NATURAL: the world Theme never repaints it */
  function update() {}                         /* still water, still rock: nothing animates */
  function setQuality(q) {
    /* the far range is the first thing to go on a low tier: it is the largest triangle count and the
       least readable at small sizes */
    const far = rangeGroups[rangeGroups.length - 1];
    if (far) far.visible = !q || q.farLayers !== false;
    return true;
  }
  function dispose() {
    if (group.parent) group.parent.remove(group);
    owned.geometries.forEach(g => g.dispose());
    owned.materials.forEach(m => m.dispose());
  }

  group.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count; stats.triangles += Math.round(n / 3); stats.drawCalls++; } });
  setTime(ctx.clock && ctx.clock.state ? ctx.clock.state() : { daylight: 0 });

  return { group, setTime, setTheme, update, setQuality, dispose, stats, basin };
}
