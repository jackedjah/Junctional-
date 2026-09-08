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
import { applyCelestialPath } from './materials.js';

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

/* v10 §42: 1750 was far enough while every mountain stood in the front hemisphere and hid the ring's
   own edge. The rear ranges stand at 1650–2120, so the land has to outrun them, and its outermost
   value has to arrive at the horizon sky (0x1d3d6e) or the edge itself draws a line across the rear
   of the world — which is exactly what the 180° proof showed. */
/* R2 — MAH TREELINE. Read with section 3 of buildTerrain; every number here is a relation to the
   near range or to the built world, never a free radius.
     inset       how far short of the mountains' inner edge the outermost rank stands
     depth       how far the belt runs back toward the city from that rank
     rMin/rMax   the clamp: rMin keeps it outside the city (the old groves ran to 250 and never
                 touched anything, so 300 is a margin on a measured fact), rMax keeps a bearing with
                 no massif in front of it from planting trees out on the open land ring
     gapDeg      half-width of the opening kept at each mountain pass, so the ways out stay open
     clusters    walked by the golden angle around the full compass
     base/crest  crystalline tissue at the foot, moonlit platinum along the crowns — no hue (L50) */
const BELT = Object.freeze({
  inset: 46, depth: 165, rMin: 300, rMax: 605, gapDeg: 9, waterMargin: 30,
  clusters: 84, perCluster: [8, 16], spreadDeg: 5.4,
  hMin: 15, hMax: 30, crownRatio: [0.27, 0.37],
  base: 0x3a4761, crest: 0xd6dfec
});
const FOOT_BOUND = 1.16;      /* massif() ridge modulation A1+A2 tops out at 0.16 of w — see nearFeet */
/* §06: the canopy diamond is WIDER THAN TALL. 0.74, not 0.60 — at 0.60 the crown was a pancake and
   three overlapping pancakes are still a parasol; 0.74 keeps the figure wider than tall while giving
   the mass enough height to break its own silhouette. */
const CROWN_SQUAT = 0.74;

const LAND_INNER = 600, LAND_OUTER = 2600;
const LAND_HORIZON = 0x1c3355;   /* the last ring, sitting just under the horizon key so it dissolves */

/* the still basin: a wide, quiet body of water sitting in the right valley, framed by the towers at
   44 deg and 75 deg. Nothing in city.js, ground.js or buildings.js occupies this region. */
/* EXPORTED for R5. MAH HAVEN stands on this water, and a second copy of these five numbers in
   another file is the shape of every L42 defect this project has produced. One basin, one truth. */
export const BASIN = { bearing: 62, r: 330, rx: 210, rz: 130, y: -1.4 };
/* its centre in WORLD xz, through this file's own polar helper, so a caller cannot re-derive it
   with a different sign convention — which is exactly how a lake once landed 28 degrees off */
export function basinCentre() { return polar(BASIN.bearing, BASIN.r); }

/* R2 §5 / §6 — THE CITY PASSES. The BASIN above reserved a bearing for water; it did not reserve the
   ROOM a city on that water needs. Measured on the built scene: the near range's peaks reach inward
   to about r 535, so the only clear annulus was 330 (the district's edge) to 535, and a lake city
   sized to be a destination rather than a pond does not fit in 205 m of it. The first placement
   attempt put its camera inside a mountain flank, which is how this was found.

   So the range OPENS at each entry in PASSES. Every peak of every range whose ARC overlaps a pass is
   pushed out of it to the nearer shoulder, which turns a reserved bearing into a reserved VOLUME: a
   genuine mountain pass with a city standing in it and the range behind still closing the horizon.
   A peak is tested against EVERY pass in turn, so two corridors cannot fight over the same massif —
   the second test simply moves whatever the first left in its way.
   That is §13 — water occupies terrain — and it is also the composition §8 asks for, because the
   city then has a ridge line to be read against instead of empty sky.

   Each width is measured, not chosen. Lake City's water is 274 m at its widest, subtending about 22
   degrees at r 700, opened to 36 to leave a shoulder either side. Rainforest City's canopy reaches
   about 300 m, so its pass is 38. */
const PASSES = [
  { id: 'lake', from: 44, to: 80 },        /* R2 §5 — LAKE CITY, bearing 62 */
  { id: 'rainforest', from: 108, to: 146 } /* R2 §6 — RAINFOREST CITY, bearing 127 */
];
/* PUSH BY THE EDGE, NOT BY THE CENTRE. The first cut of this moved a peak's BEARING out of the pass
   and rendered no differently, because a massif is 180-650 m WIDE: one pushed to 45.5 deg at r 700
   still spans to 59 deg, and the pass was half full of the mountain that had just been moved out of
   it. A peak occupies an ARC, so the arc is what has to clear. halfDeg is the massif's own half
   width converted to degrees at its own radius, so a wide peak is pushed further than a narrow one
   and the pass ends up genuinely empty rather than nominally empty. */
const clearPass = (a, w, rr) => {
  for (const P of PASSES) { a = clearOne(a, w, rr, P); }
  return a;
};
const clearOne = (a, w, rr, PASS) => {
  /* FOOT is why this is not simply w/2. massif() does not build a cylinder of width w: it flares an
     APRON and throws SPURS down its flanks, and the whole thing is then yawed by a random angle, so
     its real footprint is materially wider than its nominal width. Measured on the built scene after
     the first arc-based cut: 3.0-3.3 % of every range's vertices were still inside the wedge, the
     near range reaching r 381 with 189 m of peak in it — enough to stand between the plaza and the
     lake. 1.55 is that overshoot turned into a number, and the 5 degree pad covers the yaw. */
  const FOOT = 1.55, PAD = 5;
  const halfDeg = (w * 0.5 * FOOT) / Math.max(1, rr) * (180 / Math.PI);
  const m = ((a % 360) + 360) % 360;
  if (m + halfDeg <= PASS.from || m - halfDeg >= PASS.to) return a;      /* already clear */
  return (m < (PASS.from + PASS.to) / 2)
    ? PASS.from - halfDeg - PAD
    : PASS.to + halfDeg + PAD;
};

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
  /* R2 — WHERE THE MOUNTAINS BEGIN, recorded as they are placed rather than guessed afterwards.
     The treeline in section 3 stands "in the outskirts right before the mountains" (direction), and
     the only honest reading of "right before" is a measured one: the near range's own massif discs.
     A second hand-typed radius table would be the L42 defect again, so the belt reads THIS. */
  const nearFeet = [];
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
      const h = lerp(R.hMin, R.hMax, rand() * rand() + rand() * 0.3);
      const w = lerp(R.wMin, R.wMax, rand());
      /* R2 §5: keep the Lake City pass genuinely open. The width and radius have to be drawn first
         because clearPass pushes by the massif's ARC, not by its centre — see PASSES. */
      a = clearPass(a, w, rr);
      const [x, z] = polar(a, rr);
      /* the massif's footprint is elliptical (massif()'s own `sz` is 0.72-1.20) and then yawed by a
         random angle, so its orientation is not knowable here. FOOT_BOUND is the circumscribing disc:
         `w` plus the ridge modulation's outward bulge (A1+A2 tops out at 0.16 of w). Bounding it from
         OUTSIDE is the safe direction — a belt kept slightly too far from the range is a composition
         note; one pushed into the rock is trees growing out of a mountainside. */
      if (R.id === 'near') nearFeet.push({ x, z, r: w * FOOT_BOUND });
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
    /* ---- v10 §42 THE REAR HEMISPHERE ------------------------------------------------------------
       Every peak above is placed at `4 + (i / (count-1)) * 172` — bearings 4°–176°. All fifty-three of
       them, in all three ranges. Behind the plaza there was nothing: the 180° spin proof showed the
       land ring running out to its own hard edge and then sky, with no relief anywhere in half the
       compass. The named views never looked there, which is precisely the failure §01 names — a map
       that works from one angle.

       The rear is NOT a mirror of the front, because §14 asks each sector to be its own room and §30
       asks for non-urban regions as well as urban ones. The front is the city's amphitheatre: near,
       tall, and framed by the three valleys. The rear is OPEN COUNTRY — pushed further out, roughly
       half the height, and broader for that height, so it reads as land rolling away rather than as a
       second wall of mountains closing the world in. It is what the civilisation sits INSIDE.

       Cost is one merge, not one draw call: these join the same `peaks` array and land in the same
       merged mesh as the front range they belong to. */
    const RE = { r: R.r * 1.22, count: Math.max(6, Math.round(R.count * 0.45)),
      hMin: R.hMin * 0.46, hMax: R.hMax * 0.54, wMin: R.wMin * 1.15, wMax: R.wMax * 1.30 };
    for (let i = 0; i < RE.count; i++) {
      const a = 184 + (i / (RE.count - 1)) * 172 + (rand() - 0.5) * 11;
      const rr = RE.r * (0.9 + rand() * 0.26);
      const [x, z] = polar(a, rr);
      const h = lerp(RE.hMin, RE.hMax, rand() * rand() + rand() * 0.3);
      const w = lerp(RE.wMin, RE.wMax, rand());
      const M2 = massif(w, h, Math.max(4, R.rings - 1), Math.max(12, R.slices - 2), rand);
      if (R.id === 'near') nearFeet.push({ x, z, r: w * FOOT_BOUND });
      const geo = M2.geo;
      geo.rotateY(rand() * Math.PI * 2);
      geo.rotateZ((rand() - 0.5) * 0.09);
      /* one step LIGHTER than the front range at the same index: the rear stands further away, and
         aerial perspective is the only thing telling the eye so — there is no city out there to
         give it scale. */
      paintPeak(geo, R.base, R.ridge, h, moon, 0.86 + ri * 0.22, M2.ao);
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
  /* R170 D6 — THE PATH REACHES THE HORIZON, and this is the surface that proves it can.
     This ring is a MeshBasicMaterial: it is unlit by design, it has no normals worth the name and it
     would never take a specular highlight from a light in the scene. The celestial path does not
     care — it is analytic, it derives everything from the world position and one direction vector,
     and <opaque_fragment> is present in a basic material exactly as it is in a standard one. So the
     moon runs all the way from under itself at 2600 m, across the land, over city.js's field and
     onto the plaza deck as ONE unbroken column, which is the only way "the entire ground" can share
     one sky rather than three surfaces each doing their own thing.
     The widest azimuth and the loosest elevation of any surface here: at this radius the path is
     nearly edge-on, and a tight lobe would vanish into a single row of pixels. Dim, because the far
     land is background and the detail bible is explicit that background stays quiet. */
  applyCelestialPath(landMat, { az: 22, el: 8.5, gain: 0.62 });
  {
    const seg = 96, rings = 7;
    const land = new THREE.RingGeometry(LAND_INNER, LAND_OUTER, seg, rings).toNonIndexed();
    const pos = land.attributes.position, n = pos.count;
    /* THREE stops, not two. Two stops ran dark ground straight into the sky and left a hard rim; the
       third takes the last third of the ring up to the horizon key so the ground ARRIVES at the sky
       instead of stopping against it. The knee sits at 0.62 because that is where the rear ranges
       stand — the lift has to happen behind them, not in front. */
    /* R170 D5 — THE NEAR STOP IS THE CITY'S FLOOR, NOT A STONE COLOUR OF ITS OWN.
       "Extend that to the entire map until the border is hit." This ring starts at 600 m and
       city.js's ground ring ends at 620, so those twenty metres are where the built floor hands over
       to the land — and they were handing over from a blue-grey disc to a different blue-grey. Now
       that the city ring is black platinum, this one starts from the same near-black and the join
       has nothing to show. The MID stop comes down with it so the black field carries most of the
       way out instead of lifting almost immediately.
       THE THIRD STOP AND THE KNEE ARE UNTOUCHED, deliberately. They are the fix for a real defect
       recorded above — two stops ran dark ground straight into the sky and left a hard rim — and the
       knee sits at 0.62 because that is where the rear ranges stand, so the lift has to happen
       behind them. Extending the black floor is not a licence to take the horizon with it. */
    const col = new Float32Array(n * 3), c = new THREE.Color();
    const near = new THREE.Color(0x0b1018), mid = new THREE.Color(0x18213a), far = new THREE.Color(LAND_HORIZON);
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      const t = Math.min(1, (r - LAND_INNER) / (LAND_OUTER - LAND_INNER));
      if (t <= 0.62) c.copy(near).lerp(mid, t / 0.62);
      else c.copy(mid).lerp(far, (t - 0.62) / 0.38);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    land.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(own(land), landMat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = -0.12; mesh.name = 'terrain-land';
    mesh.frustumCulled = false; mesh.renderOrder = -9;
    group.add(mesh);
  }

  /* ---------------------------------------------------- 3. MAH TREELINE — the outskirts belt
     DIRECTION, R2: "There should be no trees in that area. Really, the tree should be in the
     outskirts right before the mountains." Two separate defects sat behind that one sentence.

     THE FIRST WAS PLACEMENT AT THE CENTRE. ground.js carried twenty-four PLANTER_SPOTS, every one of
     them inside 42 m of the world origin, eighteen of them full trees. Standing in the plaza they
     filled the middle third of every frame with pale parasols in front of the monument, the
     directory and the three destinations — which is exactly the "I cannot even focus on what
     anything is" the direction names. That table is now empty (see ground.js) and the planting
     lives out here.

     THE SECOND WAS PLACEMENT BY NUMBER. This section used to plant five groves per valley at
     `250 + rand() * 260`, so where the treeline stood had nothing to do with where the mountains
     stand: at some bearings it finished 400 m short of the range, at others it ran into the rock.
     A belt described as "right before the mountains" cannot be authored as a radius — it is a
     RELATION, and the only thing that knows it is nearFeet, the near range's own massif discs
     recorded above as they were placed.

     So the belt is solved per bearing. footAt(a) casts the ray from the world origin along `a` and
     returns the distance at which it first ENTERS a near massif — the mountains' true inner edge on
     that line. The treeline's outer rank stands BELT.inset short of it and the belt runs BELT.depth
     inward from there, clamped into [BELT.rMin, BELT.rMax] so a bearing with no massif in front of
     it (the passes, the open rear) still gets a treeline rather than an empty horizon or a forest
     growing out of the plaza.

     WHY THE BELT IS UNBROKEN AND THE OLD GROVES WERE NOT. Five scattered clumps in three valleys are
     read as five objects; a continuous band is read as a HORIZON, and a horizon is what separates
     the dark city ground from the dark mountains behind it. That separation is the whole job. It is
     also what earns the removal at the centre: the eye gets its nature back at the edge of the
     world, where it frames the city instead of standing in front of it.

     WHAT A TREE IS HERE. §06's square diamond, WIDER THAN TALL, is the canopy: an octahedron scaled
     to (w, w * CROWN_SQUAT, w), which is eight faces, a round-enough silhouette at 300-600 m and the
     brand shape at any distance you can resolve it. The trunk is a four-sided prism yawed 45 deg, so
     its plan section is the same diamond. No hue: L50 killed the one green in this world and it does
     not come back — these carry the crystalline genome's dark tissue, lifting to moonlit platinum
     along the crowns, painted per-vertex exactly as paintPeak paints the rock behind them. */
  /* METALNESS 0.18, NOT 0.30, and envMapIntensity up. LAW 1 cuts both ways: the more metal a grade
     is, the more of its value has to come from scene.environment and the less from the lights. At
     0.30 with envMapIntensity 1.15 the first cut of this belt rendered as a row of BLACK TENTS at
     470 m — the painted crest never arrived because there was too little diffuse to carry it and too
     little environment to replace it. A treeline is foliage, not chrome. */
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.52, metalness: 0.18, flatShading: true, envMapIntensity: 1.7 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a3446, roughness: 0.85, metalness: 0.08 });
  foliageMat.name = 'terrain-foliage'; trunkMat.name = 'terrain-trunk';
  owned.materials.push(foliageMat, trunkMat);
  {
    /* ray from the origin along bearing `a` against the recorded massif discs: the entry distance is
       where the mountains begin on that line. A miss contributes nothing, and a disc BEHIND the
       origin on that bearing (b <= 0) is not in front of anyone looking that way. */
    const footAt = (aDeg) => {
      const t = aDeg * D2R, dx = Math.cos(t), dz = -Math.sin(t);
      let best = Infinity;
      for (let i = 0; i < nearFeet.length; i++) {
        const f = nearFeet[i];
        const b = f.x * dx + f.z * dz;
        if (b <= 0) continue;
        const d2 = f.x * f.x + f.z * f.z - b * b, rr2 = f.r * f.r;
        if (d2 >= rr2) continue;
        const t0 = b - Math.sqrt(rr2 - d2);
        if (t0 > 0 && t0 < best) best = t0;
      }
      return best;
    };
    /* the belt's outer rank on a bearing, and the inner limit that keeps it out of the built world */
    const beltOuter = (aDeg) => {
      const f = footAt(aDeg);
      const r = (f === Infinity ? BELT.rMax : f - BELT.inset);
      return Math.max(BELT.rMin + BELT.depth * 0.5, Math.min(BELT.rMax, r));
    };
    /* the two mountain passes are the world's ways OUT — the routes to LAKE CITY and RAINFOREST CITY
       that terrain.js already opens in the rock. A belt drawn straight across them would close by
       planting what the range was cleared to leave open, so each pass keeps a gap of its own. */
    const inGap = (aDeg) => {
      for (const P of PASSES) {
        const c = (P.from + P.to) * 0.5;
        let d = Math.abs(((aDeg - c) % 360 + 540) % 360 - 180);
        if (d < BELT.gapDeg) return true;
      }
      return false;
    };
    /* BASIN is water. terrain.js owns it eight lines above; a tree standing in the lake is the same
       class of defect as a tree standing in a mountain, and it is knowable here for free. */
    const [BX, BZ] = polar(BASIN.bearing, BASIN.r);
    const inBasin = (x, z) => {
      const u = (x - BX) / (BASIN.rx + BELT.waterMargin), v = (z - BZ) / (BASIN.rz + BELT.waterMargin);
      return u * u + v * v < 1;
    };

    const canopy = [], trunks = [], rand = rng(4242);
    const cBase = new THREE.Color(BELT.base), cCrest = new THREE.Color(BELT.crest), _c = new THREE.Color();
    /* paint one crown: dark at its underside, platinum along the top, and brighter on the flank the
       moon reaches — the same three terms paintPeak uses on the rock, so belt and range agree about
       where the light is coming from. */
    const paintCrown = (geo, h, cy, lift) => {
      const pos = geo.attributes.position, n = pos.count;
      geo.computeVertexNormals();
      const nor = geo.attributes.normal;
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const up = Math.min(1, Math.max(0, (pos.getY(i) - (cy - h * 0.5)) / h));
        const mo = Math.max(0, nor.getX(i) * moon.x + nor.getY(i) * moon.y + nor.getZ(i) * moon.z);
        _c.copy(cBase).lerp(cCrest, Math.pow(up, 0.85) * lift);
        _c.multiplyScalar(0.80 + 0.42 * mo);
        col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    };

    for (let ci = 0; ci < BELT.clusters; ci++) {
      /* clusters walk the compass by the golden angle rather than by an even step: an even step at a
         belt this long lays the clumps out on a visible lattice, and the eye finds a lattice faster
         than it finds a tree. */
      const a = (ci * 137.50776405 + 11) % 360;
      if (inGap(a)) continue;
      const rOut = beltOuter(a);
      const n = BELT.perCluster[0] + Math.floor(rand() * (BELT.perCluster[1] - BELT.perCluster[0] + 1));
      let planted = 0;
      for (let i = 0; i < n; i++) {
        /* spread within the cluster in POLAR terms, so a clump follows the belt's curve instead of
           sitting as a square patch across it */
        const da = (rand() - 0.5) * BELT.spreadDeg;
        const dr = rand() * rand();                    /* biased outward: the belt thickens at the rock */
        /* SAMPLE INSIDE THE BELT, DO NOT SAMPLE AND REJECT. The first cut drew rr from
           [rOut − depth, rOut] and dropped anything under rMin, which on a bearing whose rOut sat at
           the clamp threw away half of every cluster — the belt came out at 204 trees where the
           table asks for roughly four times that, and the loss was invisible because a thinner
           treeline still looks like a treeline. The inner edge is a clamp on the RANGE, not a filter
           on the draw. */
        const rIn = Math.max(BELT.rMin, rOut - BELT.depth);
        const rr = rIn + (rOut - rIn) * dr;
        const [tx, tz] = polar(a + da, rr);
        if (inBasin(tx, tz)) continue;
        /* trees grow with the belt's depth: tallest at the mountain foot, smaller as it thins toward
           the city, which is what makes the band read as a receding edge rather than a wall */
        const grow = 0.62 + 0.38 * dr;
        const th = lerp(BELT.hMin, BELT.hMax, rand() * 0.55 + 0.45 * grow);
        const tw = th * (BELT.crownRatio[0] + rand() * (BELT.crownRatio[1] - BELT.crownRatio[0]));
        const cy = th - tw * CROWN_SQUAT;              /* the crown's centre — its top reaches `th` */

        /* THREE MASSES, ALWAYS, AND THE FIRST CUT'S ONE WAS THE WHOLE PROBLEM. A single squat
           diamond on a bare stick is a PARASOL, and that is exactly what the first belt rendered:
           a field of black tents at the treeline. A crown reads as a crown when overlapping masses
           break its silhouette, so every tree gets a leader and two subordinates — the subordinates
           smaller, seated lower, thrown off-axis by the golden angle so no two trees repeat the same
           arrangement, and overlapping the leader rather than hanging clear of it. Three octahedra
           is 24 triangles: at 300-600 m that is the cheapest silhouette fix available and the only
           one that changes what the shape IS rather than how bright it is. */
        const yaw0 = rand() * TAU;
        const crown = (w, y, x0, z0, lift) => {
          const c = new THREE.OctahedronGeometry(1, 0).toNonIndexed();
          c.scale(w, w * CROWN_SQUAT, w * (0.86 + rand() * 0.28));
          c.rotateY(rand() * TAU);
          c.translate(x0, y, z0);
          paintCrown(c, w * CROWN_SQUAT * 2, y, lift);
          canopy.push(c);
        };
        crown(tw, cy, tx, tz, 0.72 + 0.28 * rand());
        for (let k = 0; k < 2; k++) {
          const sw = tw * (0.56 + rand() * 0.20);
          const sy = cy - tw * CROWN_SQUAT * (0.42 + 0.34 * k);
          const oa = yaw0 + k * 2.3999632;                 /* the golden angle: two masses, never opposed */
          const off = tw * (0.40 + 0.22 * rand());
          crown(sw, sy, tx + Math.cos(oa) * off, tz + Math.sin(oa) * off, 0.44 + 0.22 * rand());
        }

        /* the trunk: four sides, yawed 45 deg so its plan section is the square diamond, not a square */
        const trunkH = cy - tw * CROWN_SQUAT * 0.55;
        const t = new THREE.CylinderGeometry(th * 0.034, th * 0.062, trunkH, 4).toNonIndexed();
        t.rotateY(Math.PI / 4);
        t.translate(tx, trunkH * 0.5, tz);
        trunks.push(t);
        planted++;
        stats.trees++;
      }
      if (planted) stats.groves++;
    }
    if (canopy.length) { const m = new THREE.Mesh(own(mergeGeos(canopy)), foliageMat); m.name = 'terrain-treeline'; m.frustumCulled = false; group.add(m); }
    if (trunks.length) { const m = new THREE.Mesh(own(mergeGeos(trunks)), trunkMat); m.name = 'terrain-trunks'; m.frustumCulled = false; group.add(m); }
    stats.treelineR = [BELT.rMin, BELT.rMax];
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
    foliageMat.color.setHex(0x223046).multiplyScalar(0.75 + 0.85 * daylight);   /* L50: no green */
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
