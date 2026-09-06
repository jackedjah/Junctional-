/* MAHWORLD :: TERRAIN — the natural world the city stands in (v8)

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
      behind it. ROUNDED MASSIFS in v8 (see `massif` below), where v6 and v7
      built literal cones: broad aprons, full shoulders, a soft summit, and
      spurs and gullies running down the flanks. Still rock, still reading as
      terrain: no neon edge, no glowing crystal spikes. They are
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
     h      peak height range
     w      peak base RADIUS — this is what decides whether a range reads as mountains or as shards
     base   the deep colour at the foot of the range
     ridge  the moonlit colour along its tops                                                        */
/* The values are set AGAINST THE NIGHT SKY, not in isolation: the horizon key is 0x1d3d6e, so the near
   range has to sit clearly BELOW that to read as a silhouette, and the far range clearly ABOVE it to
   read as haze. A range painted near the sky's own value is invisible however large it is — which is
   exactly what the first build of this module proved.

   PROPORTION, corrected in v7. The first build reasoned that a range must out-top the tallest megatall
   (~466 m, subtending 35 deg from 665 m) "or it reads as a low band behind the city". Once the cloud
   deck that had been hiding all of this was lifted, that reasoning proved backwards: the near range
   subtended 38.7 deg — past the top of a 46 deg frame — so the mountains did not sit behind the city,
   they loomed over it, and the megatalls read as small things at their feet. Brief §11 asks the
   TOWERS to frame the MOUNTAINS. So each range now tops out just under the tallest tower: 28 / 25.5 /
   23.7 deg, near to far. The peaks are also far broader relative to their height (base diameter now
   about 1.6x the height, against 0.75x before): a cone that is much taller than it is wide is a shard,
   and thirty shards in a row are a sawtooth, not a horizon.

   FORM, corrected in v8 on direction ("make it more round looking not so pointy"). Everything above is
   about PROPORTION and it was right; the form underneath it was still a cone, so widening the cones
   only produced wider cones. r / h / w and the painted aerial-perspective values are therefore
   untouched here — only the surface between them changed. `rings` and `slices` are the massif's
   tessellation, spent where a range is actually read: the near range is the one a viewer stands in
   front of, the far range is a value on the horizon. */
const RANGES = [
  { id: 'near', r: 700, count: 20, hMin: 210, hMax: 370, wMin: 180, wMax: 330, base: 0x0d1526, ridge: 0x3a4d76, seed: 91, rings: 7, slices: 18 },
  { id: 'mid', r: 1050, count: 18, hMin: 300, hMax: 500, wMin: 260, wMax: 460, base: 0x172440, ridge: 0x51648f, seed: 137, rings: 6, slices: 16 },
  { id: 'far', r: 1500, count: 15, hMin: 400, hMax: 660, wMin: 380, wMax: 650, base: 0x2b3f66, ridge: 0x7a8fb8, seed: 211, rings: 5, slices: 14 }
];

const LAND_INNER = 600, LAND_OUTER = 1750;

/* the still basin: a wide, quiet body of water sitting in the right valley, framed by the towers at
   44 deg and 75 deg. Nothing in city.js, ground.js or buildings.js occupies this region. */
const BASIN = { bearing: 62, r: 330, rx: 210, rz: 130, y: -1.4 };

const D2R = Math.PI / 180, TAU = Math.PI * 2;
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

/* ---- a rounded massif ---------------------------------------------------------------------------
   v8, on direction: "make it more round looking not so pointy". Every peak here was a ConeGeometry —
   a literal cone, the pointiest form there is, and at 5–7 sides it also gave all three ranges the same
   triangular repeat, so the horizon read as a sawtooth. At 700–1500 m a mountain is almost pure
   SILHOUETTE, so the silhouette is the whole of the design.

   THE PROFILE, as normalised radius r against normalised height u (0 at the foot, 1 at the summit):

       r(u) = (1 − apron) · (1 − u^a)^b   +   apron · e^(−u/k)

   The first term is the mass, and `b` near ½ is the number that matters: it makes r fall as √(1−u)
   near the top, so the silhouette's tangent turns HORIZONTAL at the summit. That one exponent is the
   whole difference between a dome and a spike — a cone's tangent is the same all the way to its point.
   `a` above 1 holds the flanks out instead of letting them cave in, which is what keeps a rounded
   mountain MASSIVE rather than bulbous. The second term is the apron of scree a range spreads into: it
   decays inside the first tenth of the height and is what gives the broad, planted foot.

   Rings are spaced by sin(i/n · π/2), which puts them where the curve actually turns — the crown — so
   seven rings buy a smooth shoulder rather than a smooth waist.

   Two angular harmonics then run spurs and gullies down the flanks and fade out toward the crest, so a
   massif reads as ROCK and not as a balloon while its summit stays soft. The apex is offset and the
   footprint is elliptical, so no two peaks in a range repeat.

   Returns the geometry AND a per-vertex gully term: this range is unlit MeshBasicMaterial, so any
   occlusion has to be painted or it does not exist at all. */
function massif(w, h, rings, slices, rand) {
  const a = 1.35 + rand() * 0.55, b = 0.50 + rand() * 0.13;
  const apron = 0.13 + rand() * 0.10, kApron = 0.09 + rand() * 0.09;
  const k1 = 3 + Math.floor(rand() * 3), k2 = 6 + Math.floor(rand() * 4);
  const p1 = rand() * TAU, p2 = rand() * TAU, p3 = rand() * TAU;
  const A1 = 0.085 + rand() * 0.075, A2 = 0.035 + rand() * 0.045, A3 = 0.05 + rand() * 0.05;
  const sz = 0.72 + rand() * 0.48;                                  /* elliptical footprint: the old post-hoc geo.scale, baked in so the normals stay true */
  const lx = (rand() - 0.5) * 0.26, lz = (rand() - 0.5) * 0.26;     /* summit off-centre: one steep face, one long back */
  const apex = rings * slices, vc = apex + 1;
  const pos = new Float32Array(vc * 3), ao = new Float32Array(vc);
  const idx = new Uint16Array(slices * (2 * rings - 1) * 3);
  let t = 0;
  for (let i = 0; i < rings; i++) {
    const u = Math.pow(Math.sin((i / rings) * Math.PI * 0.5), 1.15);
    const rad = (1 - apron) * Math.pow(1 - Math.pow(u, a), b) + apron * Math.exp(-u / kApron);
    const fall = Math.pow(1 - u, 0.55);
    for (let j = 0; j < slices; j++) {
      const phi = (j / slices) * TAU;
      const s1 = Math.sin(k1 * phi + p1), s2 = Math.sin(k2 * phi + p2), ridge = A1 * s1 + A2 * s2;
      const r = w * rad * (1 + ridge * fall);
      const v = i * slices + j;
      /* the crest line wanders with height as well as around the peak, so the shoulder is never a
         perfect ring — but the term dies at both ends, which keeps the single apex clean */
      pos[v * 3] = r * Math.sin(phi) + lx * w * u * u;
      pos[v * 3 + 1] = h * (u * (1 + A3 * Math.sin(k2 * phi + p3) * u * (1 - u) * 2.2) - 0.5);
      pos[v * 3 + 2] = r * Math.cos(phi) * sz + lz * w * u * u;
      ao[v] = Math.max(0, -ridge) / (A1 + A2) * fall;               /* 0 on a spur crest, 1 in the floor of a gully */
    }
  }
  /* the summit is ONE vertex the last ring fans into, so the crown carries no degenerate quad and
     computeVertexNormals can average it into a genuinely rounded cap */
  pos[apex * 3] = lx * w; pos[apex * 3 + 1] = h * 0.5; pos[apex * 3 + 2] = lz * w;
  for (let i = 0; i < rings - 1; i++) {
    const lo = i * slices, hi = lo + slices;
    for (let j = 0; j < slices; j++) {
      const jn = (j + 1) % slices;
      idx[t++] = lo + j; idx[t++] = lo + jn; idx[t++] = hi + jn;
      idx[t++] = lo + j; idx[t++] = hi + jn; idx[t++] = hi + j;
    }
  }
  const top = (rings - 1) * slices;
  for (let j = 0; j < slices; j++) { idx[t++] = top + j; idx[t++] = top + ((j + 1) % slices); idx[t++] = apex; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  /* SMOOTH normals, on purpose. The massif's whole job is to read as a curved mass at 700–1500 m, and
     the shading gradient across a dome is what says "round" before the silhouette does. The rock
     character comes from the spurs, not from faceting the shading. */
  geo.computeVertexNormals();
  return { geo, ao };
}

/* Paint a peak's vertices: deep and blue at the foot, lifting toward moonlit silver along the ridge,
   and brighter on the faces the moon actually reaches. This is the aerial perspective AND the key
   light, both baked, because the scene's fog would otherwise erase everything past 860 m.
   NOTE the geometry arrives centred on y (base at −h/2, summit at +h/2), exactly as ConeGeometry did,
   so `up` spans 0…0.5 here as it always has and the measured range values are unchanged. */
function paintPeak(geo, baseCol, ridgeCol, h, moon, lift, ao) {
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
    /* a gully sees a slice of sky; the spurs either side of it see the whole hemisphere. That
       difference is the only ambient term an unlit material has, and without it a rounded massif is
       shaded one way by the moon and reads as a smooth balloon. It only ever DARKENS. */
    if (ao) c.multiplyScalar(1 - 0.17 * ao[i]);
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
      let a = 4 + (i / (R.count - 1)) * 172 + (rand() - 0.5) * 7;      /* the front hemisphere the city occupies */
      const V = VALLEYS[i % VALLEYS.length];
      if (i % 2 === 0) a = lerp(a, V.from + rand() * (V.to - V.from), 0.72);
      const rr = R.r * (0.9 + rand() * 0.24);
      const [x, z] = polar(a, rr);
      const h = lerp(R.hMin, R.hMax, rand() * rand() + rand() * 0.3);
      const w = lerp(R.wMin, R.wMax, rand());
      /* a ROUNDED MASSIF, not a cone: broad apron, full shoulders, a summit whose tangent is
         horizontal, spurs and gullies down the flanks. Still rock — no neon edge, no glowing crystal
         spike (§43) — and at exactly the height and base radius the range was measured at. */
      const M2 = massif(w, h, R.rings, R.slices, rand);
      const geo = M2.geo;
      /* yaw and a small lean so no two massifs present the same face; the squash that used to happen
         here is baked into the footprint now, so these stay rigid and the normals survive them */
      geo.rotateY(rand() * Math.PI * 2);
      geo.rotateZ((rand() - 0.5) * 0.09);
      /* ranges further away sit LIGHTER overall: the recession, painted rather than fogged */
      paintPeak(geo, R.base, R.ridge, h, moon, 0.7 + ri * 0.22, M2.ao);
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
     on anything more would be spending them where they cannot be seen (§27).
     v8: the canopies were 6-sided cones, i.e. a hundred and fifty small spikes standing in the three
     valleys the composition is built around. They are twenty-face solids now — a ROUND silhouette
     carrying a FACETED surface, which is the same distinction the massifs and the clouds are drawn
     to, for eight extra triangles each. */
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
          const c = new THREE.IcosahedronGeometry(1, 0);
          c.scale(tw, th * 0.46, tw * (0.82 + rand() * 0.30));
          c.rotateY(rand() * 3);
          c.translate(tx, th * 0.66, tz);              /* the crown still meets the trunk top at 0.5h */
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
