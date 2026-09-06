/* MAHPLAZA :: SKY, TIME OF DAY, DISTANCE
   The sky is a function of the world clock: a gradient dome, a blue-white
   sun, the moon, stars, fog and the light rig all interpolate between three
   authored keys — NIGHT, DUSK (MAHWORLD's own violet twilight, not an Earth
   orange sunset) and DAY (a cool steel-blue day that reveals construction).
   Beyond the plaza: quiet rounded towers, a ring structure, dark mountains,
   and the FOB sky infrastructure — FOBEAMS (directed, coherent energy paths)
   and FOBLOWS (soft, broad atmospheric flows). They frame the world; they do
   not cover it. Everything here follows the viewer's world Theme for energy
   and never turns yellow.

   v11, VISUAL LAW §06 — THE SILHOUETTE IS ROUND, THE SURFACE IS CRYSTALLINE.
   terrain.js was corrected off ConeGeometry peaks in its v8 pass and sky.js was
   never included in it, so the world carried two mountain languages depending on
   which module drew the peak. The ridges here are ROUNDED MASSIFS now (see
   `skyMassif`), the far drums wear a chamfered crown instead of a 90° arris (see
   `chamferedDrum`), and both, plus the ring and the quiet capsule towers, merge
   into single meshes — the outline changed, the faceting did not, and the pass
   costs fewer draw calls than it replaced. What was left alone and why is noted
   at each form: the dome, the discs, the sprites, the ribbons and the tube beams
   have no sharp silhouette to correct. */
import * as THREE from '../vendor/three/three.module.min.js';
import { canvasTexture } from './materials.js';

const KEYS = {
  /* LUMINOUS NIGHT (brief §01, §10, §11): the night stays deep in absolute value but is filled with
     controlled light — a moon that is a real key, sky and city bounce that keep dark planes readable,
     and a horizon that glows with the district behind it. Never daylight; never a black field. */
  night: { top: 0x081226, mid: 0x102446, horizon: 0x1d3d6e, fog: 0x152c52, hemiSky: 0x74a0dc, hemiGround: 0x1e2a3f, hemiI: 1.5, sun: 0xbcd6ff, sunI: 1.35, fillI: 0.66, exposure: 1.06, stars: 1.0, haze: 0.62, infra: 1.0, sunDisc: 0, clouds: 0.18, bands: 0.5 },
  dusk:  { top: 0x1a1a48, mid: 0x3d3688, horizon: 0x7466b4, fog: 0x3c3672, hemiSky: 0x8a8ed4, hemiGround: 0x1c1f38, hemiI: 1.15, sun: 0xd8dbff, sunI: 1.3, fillI: 0.42, exposure: 1.02, stars: 0.35, haze: 0.55, infra: 0.8, sunDisc: 0.7, clouds: 0.3, bands: 0.5 },
  /* day: the sun is the KEY (light has a direction; shadows read), sky fill stays secondary */
  day:   { top: 0x5f87bd, mid: 0x8fb0d8, horizon: 0xc4d5ea, fog: 0xb3c6df, hemiSky: 0xcfdff3, hemiGround: 0x2a3340, hemiI: 0.55, sun: 0xf3f7ff, sunI: 3.3, fillI: 0.12, exposure: 0.98, stars: 0.0, haze: 0.22, infra: 0.3, sunDisc: 1, clouds: 0.42, bands: 0.34 }
};
const c1 = new THREE.Color(), c2 = new THREE.Color();
function lerpHex(a, b, t) { c1.setHex(a); c2.setHex(b); return c1.lerp(c2, t).getHex(); }
function mixKeys(A, B, t) {
  const o = {};
  for (const k in A) o[k] = typeof A[k] === 'number' && A[k] > 1 && Number.isInteger(A[k]) ? lerpHex(A[k], B[k], t) : A[k] + (B[k] - A[k]) * t;
  return o;
}
/* sun elevation e (−1..1) → blended sky key */
export function skyColors(state) {
  const e = state.sunElevation;
  /* a long violet twilight: night below −0.55, full dusk at −0.12, day from +0.32 */
  if (e <= -0.55) return Object.assign({}, KEYS.night);
  if (e >= 0.32) return Object.assign({}, KEYS.day);
  if (e < -0.12) return mixKeys(KEYS.night, KEYS.dusk, smooth((e + 0.55) / 0.43));
  return mixKeys(KEYS.dusk, KEYS.day, smooth((e + 0.12) / 0.44));
}
function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

/* sun / moon direction: sunrise from +x, noon high toward the camera side (+z), sunset at −x */
export function sunDirection(worldHour, out) {
  const h = ((worldHour % 24) + 24) % 24;
  const day = h >= 6 && h <= 18;
  const f = day ? (h - 6) / 12 : ((h > 18 ? h - 18 : h + 6) / 12);
  /* noon ≈ 45° high and shifted toward +x: the key light comes from the front-right, so facades are modelled
     and shadows fall across the plaza to the left instead of straight behind the buildings (brief §21, §40) */
  const az = f * Math.PI - 0.62, el = Math.sin(f * Math.PI) * 0.78;
  out.set(Math.cos(az) * Math.cos(el), Math.sin(el), 0.6 * Math.sin(az) * Math.cos(el) + 0.3).normalize();
  return { day, dir: out };
}
/* the moon keeps to the back of the sky over the district, where a phone frame can hold it */
export function moonDirection(worldHour, out) {
  const h = ((worldHour % 24) + 24) % 24;
  const f = h > 18 ? (h - 18) / 12 : h < 6 ? (h + 6) / 12 : 0.5;
  out.set(0.5 - f * 0.9, 0.3 + 0.16 * Math.sin(f * Math.PI), -0.78).normalize();
  return out;
}

/* ---- A ROUNDED MASSIF, sky.js's own -------------------------------------------------------------
   VISUAL LAW §06: THE SILHOUETTE IS ROUND. THE SURFACE IS CRYSTALLINE. An object's OUTLINE against
   the sky must read as a full, rounded mass; its SURFACE stays cut and planar.

   These peaks were `ConeGeometry(w, h, 5 + rnd() * 3, 1)` — a five-to-seven-sided CONE, the pointiest
   primitive there is, and twenty of them along the back of the horizon gave it a sawtooth. terrain.js
   was corrected off exactly that form in its v8 pass ("make it more round looking not so pointy");
   sky.js was never included in that pass, so the world carried TWO mountain languages depending on
   which module drew the peak. This is sky.js's own local equivalent — local on purpose, because the
   two modules deliberately do not import each other and terrain.js's version is tuned for 700–1500 m,
   painted vertex colours and an UNLIT material, while these ridges stand at 430–560 m on a LIT,
   FLAT-SHADED material and take their recession from the scene fog instead.

   THE PROFILE, as normalised radius r against normalised height u (0 at the foot, 1 at the summit):

       r(u) = (1 − apron) · (1 − s·u^a)^b   +   apron · e^(−u/k)

   `b` near ½ is the number that does the work: it makes r fall as √(1−u) near the crown, so the
   silhouette's TANGENT TURNS HORIZONTAL at the summit. A cone's tangent is the same angle all the way
   to its point — that one exponent is the whole difference between a massif and a spike. `a` above 1
   holds the flanks out instead of letting them cave in, which keeps the mass MASSIVE rather than
   bulbous, and the second term is the apron of scree that gives the broad, planted foot.

   `s` is this file's own term and it is the BLUNT TIP. s = 1 − tip^(1/b) makes r(1) = tip exactly, so
   the form does not taper to a point at all: it tapers to a small FLAT SUMMIT FACET, four to twenty
   metres across by peak. A needle aliases into a hairline and catches no light; a blunt crown catches it.
   The cap is a real polygon fanned from a centre vertex, so blunting the tip ADDS facets rather than
   removing them, and `tx`/`tz` tilt that crown plane (weighted u³, so the flank below is untouched and
   there is no kink) — otherwise twenty peaks would all wear the same level table.

   Rings are spaced by sin(i/(n−1) · π/2), which spends them where the curve actually turns — the
   crown — so five rings buy a smooth shoulder rather than a smooth waist. Two angular harmonics then
   run spurs and gullies down the flanks and fade out toward the crest (`fall`), so the mass reads as
   ROCK and not as a balloon; the footprint is elliptical and the summit off-centre, so no two peaks in
   a ridge present the same face.

   NOTE what did NOT change: r, h, w and the ridge radii are exactly the values the old cones used.
   terrain.js's v8 made the same choice for the same reason — proportion was already right, the form
   underneath it was the defect. The material keeps flatShading, so the SURFACE stays faceted. */
const TAU = Math.PI * 2;
function skyMassif(w, h, rings, slices, rnd) {
  const a = 1.35 + rnd() * 0.55, b = 0.50 + rnd() * 0.13;
  const tip = 0.035 + rnd() * 0.040;                                /* summit facet, as a share of the base radius */
  const s = 1 - Math.pow(tip, 1 / b);                               /* ...chosen so r(1) === tip exactly, for any b */
  const apron = 0.13 + rnd() * 0.10, kApron = 0.09 + rnd() * 0.09;
  const k1 = 3 + Math.floor(rnd() * 3), k2 = 6 + Math.floor(rnd() * 4);
  const p1 = rnd() * TAU, p2 = rnd() * TAU, p3 = rnd() * TAU;
  const A1 = 0.085 + rnd() * 0.075, A2 = 0.035 + rnd() * 0.045, A3 = 0.05 + rnd() * 0.05;
  const sz = 0.72 + rnd() * 0.48;                                   /* elliptical footprint, baked so the normals stay true */
  const lx = (rnd() - 0.5) * 0.24, lz = (rnd() - 0.5) * 0.24;       /* summit off-centre: one steep face, one long back */
  const tx = (rnd() - 0.5) * 0.40, tz = (rnd() - 0.5) * 0.40;       /* the crown's own tilt, up to about 16° */
  const nRing = rings * slices, cBase = nRing, cCap = nRing + 1;
  const pos = new Float32Array((nRing + 2) * 3), idx = [];
  for (let i = 0; i < rings; i++) {
    const u = Math.pow(Math.sin((i / (rings - 1)) * Math.PI * 0.5), 1.15);
    const rad = (1 - apron) * Math.pow(1 - s * Math.pow(u, a), b) + apron * Math.exp(-u / kApron);
    const fall = Math.pow(1 - u, 0.55), crown = u * u * u;
    for (let j = 0; j < slices; j++) {
      const phi = (j / slices) * TAU;
      const spur = A1 * Math.sin(k1 * phi + p1) + A2 * Math.sin(k2 * phi + p2);
      const r = w * rad * (1 + spur * fall);
      const px = r * Math.sin(phi) + lx * w * u * u, pz = r * Math.cos(phi) * sz + lz * w * u * u;
      const v = (i * slices + j) * 3;
      /* the crest line wanders with height as well as around the peak, but the term dies at both ends,
         which is what keeps the summit facet a single clean plane */
      pos[v] = px;
      pos[v + 1] = h * u * (1 + A3 * Math.sin(k2 * phi + p3) * u * (1 - u) * 2.2) + (tx * px + tz * pz) * crown;
      pos[v + 2] = pz;
    }
  }
  const capX = lx * w, capZ = lz * w;
  pos[cCap * 3] = capX; pos[cCap * 3 + 1] = h + tx * capX + tz * capZ; pos[cCap * 3 + 2] = capZ;
  for (let i = 0; i < rings - 1; i++) {
    const lo = i * slices, hi = lo + slices;
    for (let j = 0; j < slices; j++) { const jn = (j + 1) % slices; idx.push(lo + j, lo + jn, hi + jn, lo + j, hi + jn, hi + j); }
  }
  const top = (rings - 1) * slices;
  /* the summit CAP (a facet, fanned) and the base fan — the foot is buried but the mirror pass looks
     at this world from under the floor plane, so the underside stays closed */
  for (let j = 0; j < slices; j++) { const jn = (j + 1) % slices; idx.push(cCap, top + j, top + jn); idx.push(cBase, jn, j); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

/* A LATHE WITH HARD PROFILE BREAKS. Each band gets its own pair of rings and its own analytic normal,
   so shading is smooth AROUND the drum and CUT across every break. That is the whole point of a
   chamfer: it replaces one sharp arris with a small third FACE, and averaging the normals across the
   break would melt that third face back into a soft fillet — the bubbly failure §06 forbids exactly as
   firmly as the sharp one. `profile` runs foot to crown as [radius, y] pairs. */
function revolve(profile, seg) {
  const bands = profile.length - 1, rows = bands * 2 + 2, vc = rows * seg + 2;
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), idx = [];
  const put = (row, j, r, y, nr, ny) => {
    const v = (row * seg + j) * 3, t = (j / seg) * TAU, si = Math.sin(t), co = Math.cos(t);
    pos[v] = r * si; pos[v + 1] = y; pos[v + 2] = r * co;
    nor[v] = nr * si; nor[v + 1] = ny; nor[v + 2] = nr * co;
  };
  for (let bi = 0; bi < bands; bi++) {
    const p0 = profile[bi], p1 = profile[bi + 1];
    const dr = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dr, dy) || 1, nr = dy / L, ny = -dr / L;
    for (let j = 0; j < seg; j++) { put(bi * 2, j, p0[0], p0[1], nr, ny); put(bi * 2 + 1, j, p1[0], p1[1], nr, ny); }
    const lo = bi * 2 * seg, hi = lo + seg;
    for (let j = 0; j < seg; j++) { const jn = (j + 1) % seg; idx.push(lo + j, lo + jn, hi + jn, lo + j, hi + jn, hi + j); }
  }
  const rb = bands * 2, rt = rb + 1, cb = rows * seg, ct = cb + 1;
  for (let j = 0; j < seg; j++) { put(rb, j, profile[0][0], profile[0][1], 0, -1); put(rt, j, profile[bands][0], profile[bands][1], 0, 1); }
  pos[cb * 3 + 1] = profile[0][1]; nor[cb * 3 + 1] = -1;
  pos[ct * 3 + 1] = profile[bands][1]; nor[ct * 3 + 1] = 1;
  for (let j = 0; j < seg; j++) { const jn = (j + 1) % seg; idx.push(cb, rb * seg + jn, rb * seg + j); idx.push(ct, rt * seg + j, rt * seg + jn); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

/* A DRUM WHOSE CROWN IS CHAMFERED, not squared off. The old form was CylinderGeometry: a straight wall
   meeting a flat lid at a 90° arris, which is the sharpest thing a distant structure can show against a
   luminous sky. The rim now turns through TWO big designed facets — the outline runs 85°, 67.5°, 22.5°,
   0° from wall to lid — onto a top plate that is still 84% of the drum's width. The silhouette turns
   horizontal at the top for the same reason the massif's does, while the drum still reads as a drum and
   not as a dome, and the count of faces went UP, not down. */
function chamferedDrum(rBase, rTop, h, seg, c) {
  const rWall = rTop + (rBase - rTop) * (c / h);                    /* where the straight wall stops */
  return revolve([[rBase, 0], [rWall, h - c], [rWall - 0.2929 * c, h - 0.2929 * c], [rWall - c, h]], seg);
}

/* Concatenate geometries into ONE static BufferGeometry (position + normal). There is no
   BufferGeometryUtils in this project — every merge in these files is hand-rolled like this one.
   Existing normals are kept, so a merged capsule or torus shades exactly as it did before; only parts
   that arrive without normals get flat face normals computed for them. */
function mergeGeos(list) {
  let n = 0;
  const parts = list.map(src => {
    const o = src.index ? src.toNonIndexed() : src;
    if (!o.attributes.normal) o.computeVertexNormals();
    if (o !== src) src.dispose();
    n += o.attributes.position.count; return o;
  });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) {
    const c = p.attributes.position.count;
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    o += c; p.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return geo;
}

export function buildSky(ctx) {
  const { M, scene, theme } = ctx;
  const g = new THREE.Group(); g.name = 'sky';

  /* ---- L43 — THE CELESTIAL SPHERE FOLLOWS THE VIEWER ------------------------------------------
     The dome is a 900 m sphere and it was parented at the world origin, which was fine while every
     camera stood on a 90 m plaza. It is not fine now. terrain.js's far range stands at r 1500, roam
     flies to y 700 and out to r 1000, and the far-zoom composition wants a camera at 1180 m — all of
     them OUTSIDE the sphere. From any of those the world renders as a snow globe: a visible glass
     bubble with the mountains beyond it lit against pure black, and a hard horizontal edge where the
     dome stops. That is the R2 far-zoom lock failing in the most literal way available.
     Growing the radius only moves the wall. The correct answer is that a celestial sphere has no
     position — it is a direction. Everything infinitely far away (dome, stars, galaxy band, sun,
     moon and their halos) goes in this group, and the group is re-centred on the camera every frame,
     so the viewer can never reach the edge because the edge travels with them. The parallax stays
     right for free: an object at infinity should not shift when you move, and now it does not.
     Everything TERRESTRIAL — clouds, haze, the horizon bands, the sky ridges, the far skyline, the
     beams and flows — stays parented to the world, because those things do have positions. */
  const sphere = new THREE.Group(); sphere.name = 'sky-celestial'; g.add(sphere);

  /* dome with a vertex gradient we repaint on time changes. §06 does not apply to it: a back-side
     sphere has no silhouette of its own, and its 40 by 20 tessellation only samples the gradient. */
  const domeGeo = new THREE.SphereGeometry(900, 40, 20);
  const colours = new Float32Array(domeGeo.attributes.position.count * 3);
  domeGeo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10; sphere.add(dome);
  function paintDome(k) {
    /* three stops: horizon → mid (low sky, where the atmosphere is thickest) → zenith */
    const pos = domeGeo.attributes.position; const top = new THREE.Color(k.top), mid = new THREE.Color(k.mid), hor = new THREE.Color(k.horizon), below = hor.clone().multiplyScalar(0.55), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const ny = pos.getY(i) / 900; if (ny >= 0.18) tmp.copy(mid).lerp(top, smooth((ny - 0.18) / 0.5)); else if (ny >= 0) tmp.copy(hor).lerp(mid, smooth(ny / 0.18)); else tmp.copy(hor).lerp(below, smooth(-ny / 0.2)); colours[i * 3] = tmp.r; colours[i * 3 + 1] = tmp.g; colours[i * 3 + 2] = tmp.b; }
    domeGeo.attributes.color.needsUpdate = true;
  }

  /* sun and moon discs + halos */
  const glowTex = radialTexture();
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(22, 48), new THREE.MeshBasicMaterial({ color: 0xf6f9ff, fog: false, transparent: true }));
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xdde9ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sunHalo.scale.set(200, 200, 1);
  /* THE MOON is a principal of the composition, not a marker: a large disc (radius 58 at 800 →
     ~8.3° across, 2.4× the old 24) carrying real surface information — soft maria, a brightened
     limb — and a wide, low outer halo that never closes into a glare disc. Silver-white to pale
     blue-white; the brightest thing in the sky and never, ever warm. */
  const moon = new THREE.Mesh(new THREE.CircleGeometry(58, 64), new THREE.MeshBasicMaterial({ map: moonTexture(), fog: false, transparent: true }));
  const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonHaloTexture(), color: 0x9fc0ff, transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); moonHalo.scale.set(430, 430, 1);
  sphere.add(sunDisc, sunHalo, moon, moonHalo);

  /* ---- THE GALAXY BAND (this world's Milky Way) -------------------------------
     ONE additive, fog-free, vertex-coloured ribbon laid on a great circle of the dome: it rises
     out of one horizon, arcs high across the back of the sky and sets in the other. Brightest
     along its spine, feathered to exactly nothing at both edges, with five denser knots and two
     dust lanes so it carries structure instead of being a smooth smear. Blue-white to
     violet-white only — deep space seen THROUGH atmosphere — and held dim enough that it never
     competes with the moon or the FOBEAM field. It sits behind the whole world (renderOrder −9,
     just in front of the dome) and fades with the same `stars` key as the star field. */
  /* GAL_GAIN is the whole band's ceiling: through ACES at the night exposure its brightest knot
     lands near 0.64 in the blue channel against a 0.13 night sky and a 0.90 moon — present, never
     competing. Raising it above ~0.20 starts to fight the moon and the FOBEAM field. */
  const GAL_R = 866, GAL_U = 132, GAL_V = 16, GAL_GAIN = 0.17;
  const galPole = new THREE.Vector3(0.223, 0.55, 0.805).normalize();          /* pole of the band's plane */
  const galA = new THREE.Vector3().crossVectors(galPole, new THREE.Vector3(0, 1, 0)).normalize();   /* horizon crossing */
  const galB = new THREE.Vector3().crossVectors(galPole, galA).normalize(); if (galB.y < 0) galB.negate();   /* top of the arc */
  const galWidth = u => 0.20 + 0.17 * Math.sin(Math.max(0, Math.min(Math.PI, u)));   /* half-width in radians: widest at the bulge */
  const GAL_KNOTS = [[0.17, -0.10, 0.42, 0.075, 0.44], [0.34, 0.13, 0.30, 0.058, 0.34], [0.51, -0.05, 0.62, 0.105, 0.52], [0.69, 0.11, 0.34, 0.062, 0.36], [0.85, -0.13, 0.26, 0.055, 0.30]];
  function galValue(u, v, y) {
    const t = Math.max(0, Math.min(1, u / Math.PI));
    let b = Math.exp(-3.5 * v * v) * (0.74 + 0.26 * Math.sin(t * 9.1 + 0.7) * Math.sin(t * 3.3 + 2.1));   /* spine + lengthwise variation */
    for (let i = 0; i < GAL_KNOTS.length; i++) { const K = GAL_KNOTS[i], dt = (t - K[0]) / K[3], dv = (v - K[1]) / K[4]; b += K[2] * Math.exp(-(dt * dt + dv * dv)); }
    b *= 1 - 0.46 * Math.exp(-Math.pow((v - 0.15) / 0.10, 2)) - 0.24 * Math.exp(-Math.pow((v + 0.34) / 0.09, 2));   /* dust lanes */
    b *= Math.pow(Math.max(0, 1 - v * v), 0.9);                       /* feathered to nothing at both edges */
    b *= Math.pow(Math.sin(t * Math.PI), 0.30) * smooth((y - 0.015) / 0.20);   /* and into both horizons */
    return Math.max(0, b);
  }
  const galPos = new Float32Array((GAL_U + 1) * (GAL_V + 1) * 3), galCol = new Float32Array((GAL_U + 1) * (GAL_V + 1) * 3), galIdx = [];
  const galCore = new THREE.Color(0xa8c8ff), galEdge = new THREE.Color(0x8f8ce4), gcol = new THREE.Color(), gdir = new THREE.Vector3();
  for (let i = 0; i <= GAL_U; i++) {
    const u = (i / GAL_U) * Math.PI, w = galWidth(u), cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= GAL_V; j++) {
      const v = (j / GAL_V) * 2 - 1, a = w * v, n = (i * (GAL_V + 1) + j) * 3;
      gdir.set(galA.x * cu + galB.x * su, galA.y * cu + galB.y * su, galA.z * cu + galB.z * su).multiplyScalar(Math.cos(a)).addScaledVector(galPole, Math.sin(a)).normalize();
      galPos[n] = gdir.x * GAL_R; galPos[n + 1] = gdir.y * GAL_R; galPos[n + 2] = gdir.z * GAL_R;
      gcol.copy(galEdge).lerp(galCore, Math.min(1, 0.12 + Math.exp(-2.2 * v * v))).multiplyScalar(galValue(u, v, gdir.y) * GAL_GAIN);
      galCol[n] = gcol.r; galCol[n + 1] = gcol.g; galCol[n + 2] = gcol.b;
      if (i < GAL_U && j < GAL_V) { const k = i * (GAL_V + 1) + j; galIdx.push(k, k + 1, k + GAL_V + 1, k + 1, k + GAL_V + 2, k + GAL_V + 1); }
    }
  }
  const galaxyGeo = new THREE.BufferGeometry();
  galaxyGeo.setAttribute('position', new THREE.BufferAttribute(galPos, 3));
  galaxyGeo.setAttribute('color', new THREE.BufferAttribute(galCol, 3));
  galaxyGeo.setIndex(galIdx);
  const galaxy = new THREE.Mesh(galaxyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  galaxy.renderOrder = -9; sphere.add(galaxy);

  /* stars — still ONE Points object: a sparse general field PLUS a much denser population
     clustered along the band's spine, with per-vertex brightness and a blue-white → violet-white
     tint so the clusters read. Seeded, so the sky is the same sky every session. */
  const starGeo = new THREE.BufferGeometry(); const sp = [], sc = [];
  let ss = 20857; const srnd = () => { ss = (ss * 16807) % 2147483647; return (ss - 1) / 2147483646; };
  const starTint = new THREE.Color(), starWhite = new THREE.Color(0xd8e6ff), starViolet = new THREE.Color(0xbcb8f0), sdir = new THREE.Vector3();
  function pushStar(x, y, z, bright, violet) { sp.push(x, y, z); starTint.copy(starWhite).lerp(starViolet, violet).multiplyScalar(bright); sc.push(starTint.r, starTint.g, starTint.b); }
  for (let i = 0; i < 620; i++) { const a = srnd() * Math.PI * 2, e = srnd() * 0.95 + 0.05, r = 850; pushStar(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r, 0.34 + Math.pow(srnd(), 2.2) * 0.62, srnd() * 0.3); }
  for (let i = 0; i < 520; i++) {
    const u = 0.04 + srnd() * (Math.PI - 0.08), cu = Math.cos(u), su = Math.sin(u);
    const v = Math.max(-1.25, Math.min(1.25, (srnd() + srnd() + srnd() - 1.5) * 0.84)), a = galWidth(u) * v;
    sdir.set(galA.x * cu + galB.x * su, galA.y * cu + galB.y * su, galA.z * cu + galB.z * su).multiplyScalar(Math.cos(a)).addScaledVector(galPole, Math.sin(a)).normalize();
    if (sdir.y < 0.05) continue;                                   /* the band's stars stop at the horizon with the band */
    pushStar(sdir.x * 848, sdir.y * 848, sdir.z * 848, 0.3 + Math.pow(srnd(), 1.8) * 0.85, 0.15 + srnd() * 0.5);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ vertexColors: true, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
  sphere.add(stars);

  /* clouds: a few broad soft masses, MAHWORLD's own quiet sky, keyed by time */
  const clouds = new THREE.Group();
  const cloudMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xdde8f8, transparent: true, opacity: 0.3, depthWrite: false, fog: false });
  [[-320, 150, -520, 420, 130], [120, 190, -560, 520, 150], [420, 120, -430, 380, 110], [-80, 230, -640, 600, 120], [-520, 110, -380, 300, 90]].forEach(([x, y, z, w, h]) => { const s = new THREE.Sprite(cloudMat.clone()); s.position.set(x, y, z); s.scale.set(w, h, 1); clouds.add(s); });
  g.add(clouds);
  /* horizon haze: luminous urban depth behind everything */
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(1400, 220), new THREE.MeshBasicMaterial({ map: glowTex, color: theme.energyDeep, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  haze.position.set(0, 30, -520); g.add(haze);
  /* atmospheric depth bands (v4): three translucent air layers between the city's depth layers —
     what separates midground from background from the distant giants (brief §26) */
  const bandTex = gradientTexture();
  const bands = [[900, 110, 34, -262], [1400, 170, 52, -470], [2000, 260, 80, -690]].map(([w, h, y, z]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: bandTex, color: 0x10264c, transparent: true, opacity: 0.4, depthWrite: false, fog: false })); m.position.set(0, y, z); m.renderOrder = -5; g.add(m); return m; });
  /* a second, lower cloud deck that drifts: long soft masses under the high sprites (brief §25) */
  const deck = new THREE.Group();
  [[-420, 118, -430, 620, 70], [60, 132, -520, 760, 84], [520, 108, -400, 560, 64], [-120, 96, -330, 480, 54]].forEach(([x, y, z, w, h]) => { const s = new THREE.Sprite(cloudMat.clone()); s.position.set(x, y, z); s.scale.set(w, h, 1); s.userData.x0 = x; deck.add(s); });
  g.add(deck);

  /* mountains: two dark ridges, fog-affected so they recede. ROUNDED MASSIFS (see `skyMassif` above),
     never cones — and merged into ONE mesh, because twenty separate peaks were twenty draw calls for a
     silhouette the eye reads as a single ridge line. flatShading stays: round outline, cut surface. */
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x0c1322, roughness: 0.95, metalness: 0.0, flatShading: true });
  const ridgeGeos = [];
  const ridge = (radius, count, hMin, hMax, seed, rings, slices) => {
    let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < count; i++) {
      const a = Math.PI * 0.62 + (i / (count - 1)) * Math.PI * 0.76 + (rnd() - 0.5) * 0.06;   /* the back half of the horizon */
      const x = Math.cos(a) * radius, z = -Math.abs(Math.sin(a) * radius) - 120;
      const h = hMin + rnd() * (hMax - hMin), w = 70 + rnd() * 90;
      const geo = skyMassif(w, h, rings, slices, rnd);
      geo.rotateY(rnd() * Math.PI);
      geo.translate(x, -4, z);                                  /* the massif is built foot-at-zero; the old cone was centred */
      ridgeGeos.push(geo);
    }
  };
  /* when the city module supplies its own distant silhouettes, the old ridges only muddy the skyline —
     keep one far ridge as a horizon backstop and drop the near one.
     The far ridge is taller and reads first, so it carries the extra ring and slice. */
  if (ctx.cityPresent) { /* the city module owns the far silhouette; the ridges only muddied it */ }
  else { ridge(560, 11, 120, 240, 5, 6, 13); ridge(430, 9, 70, 150, 17, 5, 11); }
  if (ridgeGeos.length) { const rm = new THREE.Mesh(mergeGeos(ridgeGeos), mountainMat); rm.name = 'sky-ridges'; g.add(rm); }

  /* restrained skyline: rounded towers, a few cylinders, one ring — quiet, softened, receding.
     v4: when city.js is present it owns the district; only the ring and the two far cylinders stay */
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x131c2c, roughness: 0.6, metalness: 0.35 });
  const stripMat = new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.35, fog: true });
  let s = 3; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  /* every one of these shares towerMat (and every strip shares stripMat), so they are collected and
     merged: one draw call for the whole quiet skyline instead of one per element */
  const towerGeos = [], stripGeos = [];
  for (let i = 0; i < (ctx.cityPresent ? 0 : 16); i++) {
    const a = Math.PI * 0.55 + (i / 15) * Math.PI * 0.9, r = 165 + rnd() * 70;
    const x = Math.cos(a) * r, z = -Math.abs(Math.sin(a) * r) - 40;
    if (Math.abs(x) < 26) continue;
    const radius = 5 + rnd() * 5, h = 24 + rnd() * 46;
    /* the capsule stays: its silhouette is already a full round mass and its caps are only three
       segments deep, so the shell is faceted rather than a smooth ball. Nothing here to blunt. */
    const t = new THREE.CapsuleGeometry(radius, h, 3, 14); t.translate(x, h / 2, z); towerGeos.push(t);
    if (i % 3 !== 1) { const st = new THREE.CylinderGeometry(radius + 0.05, radius + 0.05, 0.45, 20, 1, true); st.translate(x, h * (0.45 + rnd() * 0.3), z); stripGeos.push(st); }
  }
  const ringGeo = new THREE.TorusGeometry(28, 1.4, 8, 48);
  /* the ring is already law 6 in miniature — a perfectly round silhouette carried on an eight-sided
     faceted tube — so only its placement is baked in here, through the same Euler order it used */
  { const o = new THREE.Object3D(); o.position.set(-135, 44, -200); o.rotation.x = Math.PI / 2.4; o.rotation.z = 0.3; o.updateMatrix(); ringGeo.applyMatrix4(o.matrix); }
  towerGeos.push(ringGeo);
  [[-205, 12, -60], [205, 16, -80]].forEach(([x, h, z]) => { const d = chamferedDrum(17, 16, h, 24, h * 0.16); d.translate(x, 0, z); towerGeos.push(d); });
  const skyline = new THREE.Mesh(mergeGeos(towerGeos), towerMat); skyline.name = 'sky-skyline'; g.add(skyline);
  if (stripGeos.length) { const sm = new THREE.Mesh(mergeGeos(stripGeos), stripMat); sm.name = 'sky-skyline-strips'; g.add(sm); }

  /* FOBEAMS — directed coherent energy pathways from slim masts, long graceful arcs */
  const beamMat = new THREE.MeshBasicMaterial({ color: theme.energyLight, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const beamGlowMat = new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x8e9bb0, roughness: 0.3, metalness: 0.9 });
  const beams = [];
  function fobeam(pts, mastAt) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.26, 6, false), beamMat);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 2.2, 6, false), beamGlowMat);
    g.add(core, glow); beams.push({ core, glow });
    /* the mast is left alone by the §06 pass on purpose: it is slim by design and it already ends in a
       flat 0.35 m disc rather than a point, so there is no taper to blunt. That disc is 0.385 m2 of
       up-facing horizontal on a 0.9-metalness grade — a pre-existing law-1 exposure, not one this pass
       created. Tilting it enough to catch the horizon would mean putting a spike back on the mast, and
       a low-metalness partner for 0.385 m2 would cost a whole draw call. */
    if (mastAt) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 40, 8), mastMat); mast.position.set(mastAt[0], 20, mastAt[1]); g.add(mast); }
  }
  /* the pathways rise from masts at the district's edges and arc BEHIND the destinations, framing them */
  fobeam([[-90, 40, 30], [-96, 96, -90], [-70, 134, -220], [-10, 128, -340], [80, 84, -460]], [-90, 30]);
  fobeam([[96, 40, 10], [104, 100, -140], [70, 128, -300], [-20, 96, -460]], [96, 10]);

  /* FOBLOWS — soft broad atmospheric flows: flat translucent ribbons along curves */
  const flowMat = new THREE.MeshBasicMaterial({ color: theme.energy, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const flows = [];
  function foblow(pts, width) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const N = 90, verts = new Float32Array((N + 1) * 2 * 3), idx = [];
    const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
    for (let i = 0; i <= N; i++) { const t = i / N, p = curve.getPointAt(t), tan = curve.getTangentAt(t); side.crossVectors(tan, up).normalize(); const w = width * (0.4 + 0.6 * Math.sin(Math.PI * t)); const a = p.clone().addScaledVector(side, w / 2), b = p.clone().addScaledVector(side, -w / 2); verts.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(verts, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, flowMat.clone()); g.add(m); flows.push(m);
  }
  foblow([[-260, 60, -60], [-120, 95, -160], [20, 120, -240], [160, 100, -300], [300, 60, -340]], 26);
  foblow([[-200, 110, -260], [-60, 140, -300], [90, 150, -320], [260, 120, -360]], 34);
  foblow([[220, 40, 20], [140, 90, -120], [40, 130, -260], [-80, 140, -380]], 18);

  scene.add(g);

  /* ---- time application ---------------------------------------------- */
  const sunDir = new THREE.Vector3();
  const state = { k: null };
  function setTime(clockState, lights) {
    const k = skyColors(clockState); state.k = k;
    paintDome(k);
    scene.fog.color.setHex(k.fog);
    const sun = sunDirection(clockState.worldHour, sunDir);
    /* the disc positions: sun by day, moon opposite; both always placed, faded by the key */
    sunDisc.position.copy(sunDir).multiplyScalar(800); sunDisc.lookAt(0, 0, 0); sunDisc.material.opacity = k.sunDisc * (sun.day ? 1 : 0);
    sunHalo.position.copy(sunDir).multiplyScalar(790); sunHalo.material.opacity = 0.4 * k.sunDisc * (sun.day ? 1 : 0);
    const moonDir = moonDirection(clockState.worldHour, new THREE.Vector3());
    moon.position.copy(moonDir).multiplyScalar(800); moon.lookAt(0, 0, 0); moon.material.opacity = 0.06 + 0.94 * Math.pow(1 - clockState.daylight, 1.5);
    moonHalo.position.copy(moonDir).multiplyScalar(790); moonHalo.material.opacity = 0.36 * (1 - clockState.daylight);
    stars.material.opacity = 0.85 * k.stars;
    /* the galaxy band is night sky like the stars: it washes out on the same key as daylight rises */
    galaxy.material.opacity = 0.92 * k.stars;
    haze.material.opacity = k.haze;
    clouds.children.forEach((c, i) => { c.material.opacity = k.clouds * (0.7 + (i % 3) * 0.15); c.material.color.setHex(clockState.daylight > 0.5 ? 0xe4edf9 : 0x8fb0e6); });
    deck.children.forEach((c, i) => { c.material.opacity = k.clouds * (0.55 + (i % 2) * 0.2); c.material.color.setHex(clockState.daylight > 0.5 ? 0xd6e2f2 : 0x7f9fd6); });
    /* the depth bands are AIR, not cloud: they only wash the layers behind them, so they stay very faint
       and take the horizon's own colour (otherwise they read as grey streaks across the sky) */
    bands.forEach((b, i) => { b.material.color.setHex(k.horizon).lerp(c2.setHex(k.fog), 0.3 + i * 0.22); b.material.opacity = k.bands * (0.16 + i * 0.05); });
    beams.forEach(b => { b.core.material.opacity = 0.8 * k.infra; b.glow.material.opacity = 0.09 * k.infra; });
    flows.forEach(f => { f.material.opacity = 0.13 * k.infra; });
    stripMat.opacity = 0.3 * (1 - clockState.daylight * 0.7);
    if (lights) {
      lights.hemi.color.setHex(k.hemiSky); lights.hemi.groundColor.setHex(k.hemiGround); lights.hemi.intensity = k.hemiI;
      lights.dir.color.setHex(k.sun); lights.dir.intensity = k.sunI;
      const lightDir = sun.day ? sunDir : moonDir;
      lights.dir.position.copy(lightDir).multiplyScalar(300);
      /* the city behind the viewer bounces cool light onto the facades: what keeps graphite readable at night */
      if (lights.fill) { lights.fill.intensity = k.fillI; lights.fill.color.setHex(clockState.daylight > 0.5 ? 0xdfe9ff : 0x9dbdf0); }
    }
    return k;
  }
  function update(t) {
    flows.forEach((f, i) => { const k = state.k ? state.k.infra : 1; f.material.opacity = (0.13 + Math.sin(t * 0.00025 + i * 2.1) * 0.03) * k; });
    deck.children.forEach((c, i) => { c.position.x = c.userData.x0 + Math.sin(t * 0.00002 + i) * 40; });   /* an imperceptibly slow drift */
  }
  /* live world-Theme change: only the ENERGY of the sky infrastructure follows (haze, tower strips, beams, flows) */
  function setTheme(t) {
    haze.material.color.setHex(t.energyDeep); stripMat.color.setHex(t.energy);
    beamMat.color.setHex(t.energyLight); beamGlowMat.color.setHex(t.energy);
    flows.forEach(f => f.material.color.setHex(t.energy));
    return t;
  }

  /* `clouds` / `deck` are the soft sprite clouds and `beams` / `flows` the plain arcs: the assembly hides
     each set when the dedicated v4 module (clouds.js / fobeam.js) is present and takes over that role */
  /* L43: the assembly calls this every frame with its live camera. The celestial group is re-centred
     on the eye, so the dome, the stars, the band, the sun and the moon are directions rather than
     places and no camera can ever reach the edge of the sky. */
  function follow(camera) { if (camera) sphere.position.copy(camera.position); }

  return { group: g, setTime, setTheme, update, follow, beams, flows, clouds, deck, bands, galaxy, stars, additive: [sunHalo, moonHalo, haze, galaxy].concat(beams.map(b => b.glow), flows) };
}

function gradientTexture() {
  /* vertical alpha ramp: dense at the bottom, clear at the top */
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d');
  const r = g.createLinearGradient(0, 0, 0, 128);
  r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.45, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0.9)');
  g.fillStyle = r; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(210,230,255,0.5)'); r.addColorStop(0.7, 'rgba(120,170,255,0.1)'); r.addColorStop(1, 'rgba(60,110,200,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* THE MOON's surface, painted procedurally: a silver-white body lit from the upper right, a few
   broad soft MARIA (offset from centre so they never read as a face), a scatter of small bright
   crater catches, a gentle terminator shading and a brightened LIMB so the disc turns instead of
   sitting flat. Cool throughout — silver-white to pale blue-white — and feathered at the very rim
   so the edge stays clean at 8° across. */
const MOON_MARIA = [[-0.30, 0.16, 0.40, 0.30], [0.26, -0.14, 0.27, 0.24], [0.08, 0.44, 0.22, 0.22], [-0.48, -0.30, 0.19, 0.18], [0.42, 0.32, 0.25, 0.20], [-0.10, -0.42, 0.16, 0.15]];
const MOON_CRATERS = [[0.34, -0.44, 0.055], [-0.52, 0.30, 0.045], [0.12, 0.14, 0.036], [-0.20, -0.18, 0.030], [0.56, 0.06, 0.040], [-0.34, 0.56, 0.032]];
function moonTexture() {
  return canvasTexture(640, 640, (g, W) => {
    const cx = W / 2, cy = W / 2, R = W / 2 - 3;
    g.clearRect(0, 0, W, W);
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    const base = g.createRadialGradient(cx + R * 0.26, cy - R * 0.30, R * 0.05, cx, cy, R);
    base.addColorStop(0, '#f4f7ff'); base.addColorStop(0.42, '#dde6f7'); base.addColorStop(0.78, '#b6c4dd'); base.addColorStop(1, '#96a8c6');
    g.fillStyle = base; g.fillRect(0, 0, W, W);
    MOON_MARIA.forEach(([mx, my, mr, a]) => {
      const x = cx + mx * R, y = cy + my * R, r = mr * R;
      const m = g.createRadialGradient(x, y, r * 0.18, x, y, r);
      m.addColorStop(0, 'rgba(94,114,148,' + a + ')'); m.addColorStop(0.6, 'rgba(102,122,156,' + (a * 0.5).toFixed(3) + ')'); m.addColorStop(1, 'rgba(108,128,162,0)');
      g.fillStyle = m; g.fillRect(0, 0, W, W);
    });
    MOON_CRATERS.forEach(([mx, my, mr]) => {
      const x = cx + mx * R, y = cy + my * R, r = mr * R;
      const m = g.createRadialGradient(x, y, 0, x, y, r);
      m.addColorStop(0, 'rgba(238,244,255,0.34)'); m.addColorStop(0.55, 'rgba(220,232,252,0.12)'); m.addColorStop(1, 'rgba(200,218,248,0)');
      g.fillStyle = m; g.fillRect(0, 0, W, W);
    });
    const shade = g.createRadialGradient(cx + R * 0.34, cy - R * 0.36, R * 0.28, cx, cy, R * 1.04);
    shade.addColorStop(0, 'rgba(10,18,36,0)'); shade.addColorStop(0.62, 'rgba(10,18,36,0.13)'); shade.addColorStop(1, 'rgba(10,18,36,0.40)');
    g.fillStyle = shade; g.fillRect(0, 0, W, W);
    const limb = g.createRadialGradient(cx, cy, R * 0.74, cx, cy, R);
    limb.addColorStop(0, 'rgba(226,236,255,0)'); limb.addColorStop(0.68, 'rgba(228,238,255,0.17)'); limb.addColorStop(0.94, 'rgba(240,246,255,0.40)'); limb.addColorStop(1, 'rgba(240,246,255,0.16)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = limb; g.fillRect(0, 0, W, W);
    g.globalCompositeOperation = 'source-over'; g.restore();
    const fade = g.createRadialGradient(cx, cy, R * 0.965, cx, cy, R + 2);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 0, W, W); g.globalCompositeOperation = 'source-over';
  });
}
/* the moon's outer halo: a wide, low, long-tailed falloff — atmosphere around the disc, never a
   second bright disc on top of it (the core stays under a third of the sprite's own alpha) */
function moonHaloTexture() {
  return canvasTexture(256, 256, (g, W) => {
    const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    r.addColorStop(0, 'rgba(214,230,255,0.30)'); r.addColorStop(0.2, 'rgba(200,220,255,0.24)'); r.addColorStop(0.34, 'rgba(176,204,255,0.13)');
    r.addColorStop(0.52, 'rgba(146,182,248,0.052)'); r.addColorStop(0.76, 'rgba(112,152,230,0.014)'); r.addColorStop(1, 'rgba(84,124,200,0)');
    g.clearRect(0, 0, W, W); g.fillStyle = r; g.fillRect(0, 0, W, W);
  });
}
